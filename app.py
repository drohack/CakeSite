"""
Main Flask application for the Marry, F, Kill Quiz.
"""
import os
import random
import uuid
from datetime import datetime
from flask import Flask, render_template, request, jsonify, send_from_directory, session
from flask_socketio import SocketIO, emit, join_room
import qrcode
from io import BytesIO
import base64
from database import db, init_db, Image, Poll, PollGroup, Submission, SmashPassSession, SmashPassVote
from sqlalchemy import func
import json

app = Flask(__name__)
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'dev-secret-key-change-in-production')

# Use data directory if it exists, otherwise use current directory
data_dir = os.path.join(app.root_path, 'data')
if not os.path.exists(data_dir):
    os.makedirs(data_dir)
db_path = os.path.join(data_dir, 'fmk_quiz.db')
app.config['SQLALCHEMY_DATABASE_URI'] = f'sqlite:///{db_path}'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# Initialize database
init_db(app)

# Initialize SocketIO
socketio = SocketIO(app, cors_allowed_origins="*", async_mode='eventlet')


# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

def generate_qr_code(url):
    """Generate a QR code as a base64-encoded image."""
    qr = qrcode.QRCode(version=1, box_size=10, border=1)
    qr.add_data(url)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")

    buffered = BytesIO()
    img.save(buffered, format="PNG")
    img_str = base64.b64encode(buffered.getvalue()).decode()
    return f"data:image/png;base64,{img_str}"


def get_or_create_user_id():
    """Get or create a unique user ID for this session."""
    if 'user_id' not in session:
        session['user_id'] = str(uuid.uuid4())
    return session['user_id']


def get_group_results(group_id):
    """Calculate results for a specific poll group."""
    submissions = Submission.query.filter_by(group_id=group_id).all()

    if not submissions:
        return None

    # Get the group to know which images are included
    group = PollGroup.query.get(group_id)
    if not group:
        return None

    image_ids = [group.image1_id, group.image2_id, group.image3_id]
    results = {image_id: {'marry': 0, 'f': 0, 'kill': 0} for image_id in image_ids}

    for sub in submissions:
        results[sub.marry_image_id]['marry'] += 1
        results[sub.f_image_id]['f'] += 1
        results[sub.kill_image_id]['kill'] += 1

    total_submissions = len(submissions)

    # Convert to percentage and include image info
    formatted_results = []
    for image_id in image_ids:
        image = Image.query.get(image_id)
        formatted_results.append({
            'image_id': image_id,
            'filename': image.filename,
            'marry': results[image_id]['marry'],
            'f': results[image_id]['f'],
            'kill': results[image_id]['kill'],
            'marry_pct': round(results[image_id]['marry'] / total_submissions * 100, 1) if total_submissions > 0 else 0,
            'f_pct': round(results[image_id]['f'] / total_submissions * 100, 1) if total_submissions > 0 else 0,
            'kill_pct': round(results[image_id]['kill'] / total_submissions * 100, 1) if total_submissions > 0 else 0,
        })

    return {
        'group_id': group_id,
        'total_submissions': total_submissions,
        'results': formatted_results
    }


def get_cumulative_results(poll_id):
    """Calculate cumulative results across all groups in a poll."""
    submissions = Submission.query.filter_by(poll_id=poll_id).all()

    if not submissions:
        return None

    # Get all unique images from this poll
    poll = Poll.query.get(poll_id)
    image_stats = {}

    for sub in submissions:
        # Track marry votes
        if sub.marry_image_id not in image_stats:
            image_stats[sub.marry_image_id] = {'marry': 0, 'f': 0, 'kill': 0}
        image_stats[sub.marry_image_id]['marry'] += 1

        # Track f votes
        if sub.f_image_id not in image_stats:
            image_stats[sub.f_image_id] = {'marry': 0, 'f': 0, 'kill': 0}
        image_stats[sub.f_image_id]['f'] += 1

        # Track kill votes
        if sub.kill_image_id not in image_stats:
            image_stats[sub.kill_image_id] = {'marry': 0, 'f': 0, 'kill': 0}
        image_stats[sub.kill_image_id]['kill'] += 1

    # Format results
    formatted_results = []
    for image_id, stats in image_stats.items():
        image = Image.query.get(image_id)
        total_votes = stats['marry'] + stats['f'] + stats['kill']
        formatted_results.append({
            'image_id': image_id,
            'filename': image.filename,
            'marry': stats['marry'],
            'f': stats['f'],
            'kill': stats['kill'],
            'total_votes': total_votes,
            'marry_pct': round(stats['marry'] / total_votes * 100, 1) if total_votes > 0 else 0,
            'f_pct': round(stats['f'] / total_votes * 100, 1) if total_votes > 0 else 0,
            'kill_pct': round(stats['kill'] / total_votes * 100, 1) if total_votes > 0 else 0,
        })

    # Sort by most "marry" votes
    formatted_results.sort(key=lambda x: x['marry'], reverse=True)

    return {
        'poll_id': poll_id,
        'total_submissions': len(submissions),
        'results': formatted_results
    }


# ============================================================================
# ROUTES - GENERAL
# ============================================================================

@app.route('/')
def index():
    """Redirect to the user poll page."""
    return render_template('index.html')


@app.route('/images/<filename>')
def serve_image(filename):
    """Serve images from the images directory."""
    return send_from_directory('images', filename)


# ============================================================================
# ROUTES - ADMIN
# ============================================================================

@app.route('/admin')
def admin():
    """Admin dashboard page."""
    return render_template('admin.html')


@app.route('/admin/images', methods=['GET'])
def get_images():
    """Get all images with their active status."""
    images = Image.query.all()
    return jsonify([img.to_dict() for img in images])


@app.route('/admin/images/<int:image_id>/toggle', methods=['POST'])
def toggle_image(image_id):
    """Toggle the active status of an image."""
    image = Image.query.get_or_404(image_id)
    image.is_active = not image.is_active
    db.session.commit()
    return jsonify(image.to_dict())


@app.route('/admin/poll/create', methods=['POST'])
def create_poll():
    """Create a new poll with pre-generated groups."""
    # Get all active images
    active_images = Image.query.filter_by(is_active=True).all()

    if len(active_images) < 3:
        return jsonify({'error': 'Need at least 3 active images to create a poll'}), 400

    # Create new poll
    poll = Poll(status='setup')
    db.session.add(poll)
    db.session.commit()

    # Shuffle images and create groups of 3
    shuffled_images = active_images.copy()
    random.shuffle(shuffled_images)

    group_number = 0
    for i in range(0, len(shuffled_images) - 2, 3):
        if i + 2 < len(shuffled_images):
            group = PollGroup(
                poll_id=poll.id,
                group_number=group_number,
                image1_id=shuffled_images[i].id,
                image2_id=shuffled_images[i + 1].id,
                image3_id=shuffled_images[i + 2].id
            )
            db.session.add(group)
            group_number += 1

    db.session.commit()

    return jsonify({
        'poll': poll.to_dict(),
        'groups_created': group_number
    })


@app.route('/admin/poll/current', methods=['GET'])
def get_current_poll():
    """Get the current active or most recent poll."""
    poll = Poll.query.filter(Poll.status.in_(['setup', 'active'])).order_by(Poll.created_at.desc()).first()

    if not poll:
        return jsonify({'error': 'No active poll'}), 404

    # Get current group if poll is active
    current_group_data = None
    if poll.status == 'active' and poll.current_group is not None:
        current_group = PollGroup.query.filter_by(
            poll_id=poll.id,
            group_number=poll.current_group
        ).first()
        if current_group:
            current_group_data = current_group.to_dict()
            # Add submission count
            submission_count = Submission.query.filter_by(group_id=current_group.id).count()
            current_group_data['submission_count'] = submission_count

    return jsonify({
        'poll': poll.to_dict(),
        'current_group': current_group_data
    })


@app.route('/admin/poll/<int:poll_id>/start', methods=['POST'])
def start_poll(poll_id):
    """Start a poll and activate the first group."""
    poll = Poll.query.get_or_404(poll_id)

    if poll.status != 'setup':
        return jsonify({'error': 'Poll already started or ended'}), 400

    poll.status = 'active'
    poll.started_at = datetime.utcnow()
    poll.current_group = 0
    db.session.commit()

    # Notify all connected clients
    socketio.emit('poll_started', {'poll_id': poll.id}, room='poll')

    return jsonify(poll.to_dict())


@app.route('/admin/poll/<int:poll_id>/next-group', methods=['POST'])
def next_group(poll_id):
    """Move to the next group in the poll."""
    poll = Poll.query.get_or_404(poll_id)

    if poll.status != 'active':
        return jsonify({'error': 'Poll is not active'}), 400

    total_groups = len(poll.groups)

    if poll.current_group + 1 >= total_groups:
        return jsonify({'error': 'No more groups available'}), 400

    poll.current_group += 1
    db.session.commit()

    # Notify all connected clients
    socketio.emit('group_changed', {'poll_id': poll.id, 'group_number': poll.current_group}, room='poll')

    return jsonify(poll.to_dict())


@app.route('/admin/poll/<int:poll_id>/end', methods=['POST'])
def end_poll(poll_id):
    """End the current poll."""
    poll = Poll.query.get_or_404(poll_id)

    if poll.status != 'active':
        return jsonify({'error': 'Poll is not active'}), 400

    poll.status = 'ended'
    poll.ended_at = datetime.utcnow()
    db.session.commit()

    # Notify all connected clients
    socketio.emit('poll_ended', {'poll_id': poll.id}, room='poll')

    return jsonify(poll.to_dict())


@app.route('/admin/poll/<int:poll_id>/results/current', methods=['GET'])
def get_current_group_results(poll_id):
    """Get results for the current group."""
    poll = Poll.query.get_or_404(poll_id)

    if poll.current_group is None:
        return jsonify({'error': 'No active group'}), 400

    current_group = PollGroup.query.filter_by(
        poll_id=poll.id,
        group_number=poll.current_group
    ).first()

    if not current_group:
        return jsonify({'error': 'Group not found'}), 404

    results = get_group_results(current_group.id)
    return jsonify(results)


@app.route('/admin/poll/<int:poll_id>/results/cumulative', methods=['GET'])
def get_poll_cumulative_results(poll_id):
    """Get cumulative results for the entire poll."""
    poll = Poll.query.get_or_404(poll_id)
    results = get_cumulative_results(poll.id)

    if not results:
        return jsonify({'error': 'No submissions yet'}), 404

    return jsonify(results)


@app.route('/admin/qr', methods=['GET'])
def generate_admin_qr():
    """Generate QR code for users to join the poll."""
    # Get the base URL from the request
    base_url = request.host_url.rstrip('/')
    poll_url = f"{base_url}/poll"

    qr_code = generate_qr_code(poll_url)
    return jsonify({'qr_code': qr_code, 'url': poll_url})


# ============================================================================
# ROUTES - USER POLL
# ============================================================================

@app.route('/poll')
def poll_page():
    """User-facing poll page."""
    user_id = get_or_create_user_id()
    return render_template('poll.html')


@app.route('/poll/current', methods=['GET'])
def get_current_poll_for_user():
    """Get the current active poll and group for users."""
    poll = Poll.query.filter_by(status='active').order_by(Poll.created_at.desc()).first()

    if not poll:
        return jsonify({'error': 'No active poll'}), 404

    # Get current group
    current_group = PollGroup.query.filter_by(
        poll_id=poll.id,
        group_number=poll.current_group
    ).first()

    if not current_group:
        return jsonify({'error': 'No active group'}), 404

    # Check if user already submitted for this group
    user_id = get_or_create_user_id()
    existing_submission = Submission.query.filter_by(
        group_id=current_group.id,
        user_id=user_id
    ).first()

    return jsonify({
        'poll_id': poll.id,
        'group': current_group.to_dict(),
        'has_submitted': existing_submission is not None
    })


@app.route('/poll/submit', methods=['POST'])
def submit_poll():
    """Submit a user's choices for the current poll group."""
    data = request.json
    user_id = get_or_create_user_id()

    # Validate required fields
    required_fields = ['poll_id', 'group_id', 'marry_image_id', 'f_image_id', 'kill_image_id']
    if not all(field in data for field in required_fields):
        return jsonify({'error': 'Missing required fields'}), 400

    # Verify poll and group exist
    poll = Poll.query.get(data['poll_id'])
    group = PollGroup.query.get(data['group_id'])

    if not poll or not group:
        return jsonify({'error': 'Invalid poll or group'}), 404

    if poll.status != 'active':
        return jsonify({'error': 'Poll is not active'}), 400

    # Verify all three image IDs are different
    image_ids = [data['marry_image_id'], data['f_image_id'], data['kill_image_id']]
    if len(set(image_ids)) != 3:
        return jsonify({'error': 'Each image must be assigned to a different category'}), 400

    # Verify all images belong to this group
    group_image_ids = [group.image1_id, group.image2_id, group.image3_id]
    if not all(img_id in group_image_ids for img_id in image_ids):
        return jsonify({'error': 'Invalid image selection'}), 400

    # Check if user already submitted for this group
    existing = Submission.query.filter_by(group_id=group.id, user_id=user_id).first()
    if existing:
        # Update existing submission
        existing.marry_image_id = data['marry_image_id']
        existing.f_image_id = data['f_image_id']
        existing.kill_image_id = data['kill_image_id']
        existing.submitted_at = datetime.utcnow()
    else:
        # Create new submission
        submission = Submission(
            poll_id=data['poll_id'],
            group_id=data['group_id'],
            user_id=user_id,
            marry_image_id=data['marry_image_id'],
            f_image_id=data['f_image_id'],
            kill_image_id=data['kill_image_id']
        )
        db.session.add(submission)

    db.session.commit()

    # Get updated results
    results = get_group_results(group.id)

    # Broadcast update to all clients in the poll room
    socketio.emit('results_updated', results, room='poll')

    return jsonify({
        'success': True,
        'results': results
    })


@app.route('/poll/results/<int:group_id>', methods=['GET'])
def get_poll_results(group_id):
    """Get results for a specific group."""
    results = get_group_results(group_id)

    if not results:
        return jsonify({'error': 'No results available'}), 404

    return jsonify(results)


# ============================================================================
# ROUTES - SLIDESHOW
# ============================================================================

@app.route('/slideshow')
def slideshow():
    """Image slideshow page."""
    return render_template('slideshow.html')


@app.route('/slideshow/images', methods=['GET'])
def get_slideshow_images():
    """Get all images for slideshow."""
    images = Image.query.all()
    return jsonify([{
        'id': img.id,
        'filename': img.filename,
        'name': os.path.splitext(img.filename)[0]  # Filename without extension
    } for img in images])


# ============================================================================
# ROUTES - SMASH OR PASS ADMIN
# ============================================================================

@app.route('/smashpass/admin')
def smashpass_admin():
    """Smash or Pass admin control page."""
    return render_template('smashpass_admin.html')


@app.route('/smashpass/session/create', methods=['POST'])
def create_smashpass_session():
    """Create a new Smash or Pass session with randomized images."""
    # Get all images
    all_images = Image.query.all()

    if len(all_images) == 0:
        return jsonify({'error': 'No images available'}), 400

    # Randomize order
    image_ids = [img.id for img in all_images]
    random.shuffle(image_ids)

    # Create session and auto-start it
    session_obj = SmashPassSession(
        status='active',
        image_order=json.dumps(image_ids),
        current_image_index=0,
        started_at=datetime.utcnow()
    )
    db.session.add(session_obj)
    db.session.commit()

    # Notify all connected clients
    socketio.emit('smashpass_started', {'session_id': session_obj.id}, room='smashpass')

    return jsonify({
        'session': session_obj.to_dict(),
        'total_images': len(image_ids)
    })


@app.route('/smashpass/session/current', methods=['GET'])
def get_current_smashpass_session():
    """Get the current active Smash or Pass session."""
    session_obj = SmashPassSession.query.filter(
        SmashPassSession.status.in_(['setup', 'active', 'completed'])
    ).order_by(SmashPassSession.created_at.desc()).first()

    if not session_obj:
        return jsonify({'error': 'No active session'}), 404

    image_order = json.loads(session_obj.image_order)
    current_image = None

    if session_obj.status == 'active' and session_obj.current_image_index < len(image_order):
        current_image_id = image_order[session_obj.current_image_index]
        current_image_obj = Image.query.get(current_image_id)

        if current_image_obj:
            # Get vote counts for current image
            smash_count = SmashPassVote.query.filter_by(
                session_id=session_obj.id,
                image_id=current_image_id,
                vote='smash'
            ).count()

            pass_count = SmashPassVote.query.filter_by(
                session_id=session_obj.id,
                image_id=current_image_id,
                vote='pass'
            ).count()

            current_image = {
                'id': current_image_obj.id,
                'filename': current_image_obj.filename,
                'name': os.path.splitext(current_image_obj.filename)[0],
                'smash_count': smash_count,
                'pass_count': pass_count,
                'total_votes': smash_count + pass_count
            }

    return jsonify({
        'session': session_obj.to_dict(),
        'current_image': current_image,
        'total_images': len(image_order),
        'images_remaining': len(image_order) - session_obj.current_image_index
    })


@app.route('/smashpass/session/<int:session_id>/start', methods=['POST'])
def start_smashpass_session(session_id):
    """Start the Smash or Pass session."""
    session_obj = SmashPassSession.query.get_or_404(session_id)

    if session_obj.status != 'setup':
        return jsonify({'error': 'Session already started or completed'}), 400

    session_obj.status = 'active'
    session_obj.started_at = datetime.utcnow()
    db.session.commit()

    # Notify all connected clients
    socketio.emit('smashpass_started', {'session_id': session_obj.id}, room='smashpass')

    return jsonify(session_obj.to_dict())


@app.route('/smashpass/session/<int:session_id>/next', methods=['POST'])
def next_smashpass_image(session_id):
    """Move to the next image in the session."""
    session_obj = SmashPassSession.query.get_or_404(session_id)

    if session_obj.status != 'active':
        return jsonify({'error': 'Session is not active'}), 400

    image_order = json.loads(session_obj.image_order)

    # Before moving to next, update image active status based on votes
    if session_obj.current_image_index < len(image_order):
        current_image_id = image_order[session_obj.current_image_index]

        # Get vote counts
        smash_count = SmashPassVote.query.filter_by(
            session_id=session_obj.id,
            image_id=current_image_id,
            vote='smash'
        ).count()

        pass_count = SmashPassVote.query.filter_by(
            session_id=session_obj.id,
            image_id=current_image_id,
            vote='pass'
        ).count()

        # Update image active status: Smash = active, Pass = inactive
        current_image = Image.query.get(current_image_id)
        if current_image:
            if smash_count > pass_count:
                current_image.is_active = True
            elif pass_count > smash_count:
                current_image.is_active = False
            # If tied, keep current status
            db.session.commit()

    # Move to next image
    if session_obj.current_image_index + 1 >= len(image_order):
        # Completed all images
        session_obj.status = 'completed'
        session_obj.ended_at = datetime.utcnow()
        db.session.commit()

        # Notify clients
        socketio.emit('smashpass_completed', {'session_id': session_obj.id}, room='smashpass')

        return jsonify({
            'session': session_obj.to_dict(),
            'completed': True
        })

    session_obj.current_image_index += 1
    db.session.commit()

    # Notify all connected clients
    socketio.emit('smashpass_next_image', {
        'session_id': session_obj.id,
        'image_index': session_obj.current_image_index
    }, room='smashpass')

    return jsonify(session_obj.to_dict())


@app.route('/smashpass/session/<int:session_id>/results', methods=['GET'])
def get_smashpass_results(session_id):
    """Get results for the entire Smash or Pass session."""
    session_obj = SmashPassSession.query.get_or_404(session_id)
    image_order = json.loads(session_obj.image_order)

    smashes = []
    passes = []

    for image_id in image_order:
        image = Image.query.get(image_id)
        if not image:
            continue

        smash_count = SmashPassVote.query.filter_by(
            session_id=session_obj.id,
            image_id=image_id,
            vote='smash'
        ).count()

        pass_count = SmashPassVote.query.filter_by(
            session_id=session_obj.id,
            image_id=image_id,
            vote='pass'
        ).count()

        image_data = {
            'id': image.id,
            'filename': image.filename,
            'name': os.path.splitext(image.filename)[0],
            'smash_count': smash_count,
            'pass_count': pass_count,
            'total_votes': smash_count + pass_count
        }

        if smash_count > pass_count:
            smashes.append(image_data)
        elif pass_count > smash_count:
            passes.append(image_data)
        # Ties excluded from both lists

    return jsonify({
        'session_id': session_obj.id,
        'smashes': smashes,
        'passes': passes
    })


# ============================================================================
# ROUTES - SMASH OR PASS USER
# ============================================================================

@app.route('/smashpass')
def smashpass_user():
    """User-facing Smash or Pass voting page."""
    user_id = get_or_create_user_id()
    return render_template('smashpass_poll.html')


@app.route('/smashpass/current', methods=['GET'])
def get_current_smashpass_for_user():
    """Get the current active Smash or Pass session and image for users."""
    session_obj = SmashPassSession.query.filter_by(status='active').order_by(
        SmashPassSession.created_at.desc()
    ).first()

    if not session_obj:
        return jsonify({'error': 'No active session'}), 404

    image_order = json.loads(session_obj.image_order)

    if session_obj.current_image_index >= len(image_order):
        return jsonify({'error': 'Session completed'}), 404

    current_image_id = image_order[session_obj.current_image_index]
    current_image = Image.query.get(current_image_id)

    if not current_image:
        return jsonify({'error': 'Image not found'}), 404

    # Check if user already voted for this image
    user_id = get_or_create_user_id()
    existing_vote = SmashPassVote.query.filter_by(
        session_id=session_obj.id,
        image_id=current_image_id,
        user_id=user_id
    ).first()

    return jsonify({
        'session_id': session_obj.id,
        'image': {
            'id': current_image.id,
            'filename': current_image.filename,
            'name': os.path.splitext(current_image.filename)[0]
        },
        'has_voted': existing_vote is not None,
        'vote': existing_vote.vote if existing_vote else None
    })


@app.route('/smashpass/vote', methods=['POST'])
def submit_smashpass_vote():
    """Submit a Smash or Pass vote."""
    data = request.json
    user_id = get_or_create_user_id()

    # Validate required fields
    if 'session_id' not in data or 'image_id' not in data or 'vote' not in data:
        return jsonify({'error': 'Missing required fields'}), 400

    if data['vote'] not in ['smash', 'pass']:
        return jsonify({'error': 'Invalid vote. Must be "smash" or "pass"'}), 400

    # Verify session exists and is active
    session_obj = SmashPassSession.query.get(data['session_id'])
    if not session_obj or session_obj.status != 'active':
        return jsonify({'error': 'Invalid or inactive session'}), 400

    # Verify image exists
    image = Image.query.get(data['image_id'])
    if not image:
        return jsonify({'error': 'Image not found'}), 404

    # Check if user already voted for this image
    existing_vote = SmashPassVote.query.filter_by(
        session_id=session_obj.id,
        image_id=data['image_id'],
        user_id=user_id
    ).first()

    if existing_vote:
        # Update existing vote
        existing_vote.vote = data['vote']
        existing_vote.submitted_at = datetime.utcnow()
    else:
        # Create new vote
        vote = SmashPassVote(
            session_id=data['session_id'],
            image_id=data['image_id'],
            user_id=user_id,
            vote=data['vote']
        )
        db.session.add(vote)

    db.session.commit()

    # Get updated counts
    smash_count = SmashPassVote.query.filter_by(
        session_id=session_obj.id,
        image_id=data['image_id'],
        vote='smash'
    ).count()

    pass_count = SmashPassVote.query.filter_by(
        session_id=session_obj.id,
        image_id=data['image_id'],
        vote='pass'
    ).count()

    # Broadcast update to all clients
    socketio.emit('smashpass_vote_update', {
        'session_id': session_obj.id,
        'image_id': data['image_id'],
        'smash_count': smash_count,
        'pass_count': pass_count
    }, room='smashpass')

    return jsonify({
        'success': True,
        'smash_count': smash_count,
        'pass_count': pass_count
    })


@app.route('/smashpass/qr', methods=['GET'])
def generate_smashpass_qr():
    """Generate QR code for users to join Smash or Pass."""
    base_url = request.host_url.rstrip('/')
    smashpass_url = f"{base_url}/smashpass"

    qr_code = generate_qr_code(smashpass_url)
    return jsonify({'qr_code': qr_code, 'url': smashpass_url})


# ============================================================================
# WEBSOCKET EVENTS
# ============================================================================

@socketio.on('connect')
def handle_connect():
    """Handle client connection."""
    join_room('poll')
    emit('connected', {'data': 'Connected to poll server'})


@socketio.on('disconnect')
def handle_disconnect():
    """Handle client disconnection."""
    pass


@socketio.on('join_poll')
def handle_join_poll(data=None):
    """Handle user joining a poll."""
    join_room('poll')
    emit('joined', {'data': 'Joined poll room'})


@socketio.on('join_smashpass')
def handle_join_smashpass(data=None):
    """Handle user joining smash or pass."""
    join_room('smashpass')
    emit('joined_smashpass', {'data': 'Joined smash or pass room'})


# ============================================================================
# MAIN
# ============================================================================

if __name__ == '__main__':
    socketio.run(app, host='0.0.0.0', port=5000, debug=True)
