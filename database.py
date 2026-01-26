"""
Database models and initialization for the FMK Quiz application.
"""
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
from sqlalchemy import func

db = SQLAlchemy()

class Image(db.Model):
    """Stores information about available images."""
    __tablename__ = 'images'

    id = db.Column(db.Integer, primary_key=True)
    filename = db.Column(db.String(255), nullable=False, unique=True)
    is_active = db.Column(db.Boolean, default=True, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'filename': self.filename,
            'is_active': self.is_active,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }


class Poll(db.Model):
    """Represents a polling session."""
    __tablename__ = 'polls'

    id = db.Column(db.Integer, primary_key=True)
    status = db.Column(db.String(20), default='setup', nullable=False)  # setup, active, ended
    started_at = db.Column(db.DateTime)
    ended_at = db.Column(db.DateTime)
    current_group = db.Column(db.Integer, default=0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    groups = db.relationship('PollGroup', back_populates='poll', cascade='all, delete-orphan')
    submissions = db.relationship('Submission', back_populates='poll', cascade='all, delete-orphan')

    def to_dict(self):
        return {
            'id': self.id,
            'status': self.status,
            'started_at': self.started_at.isoformat() if self.started_at else None,
            'ended_at': self.ended_at.isoformat() if self.ended_at else None,
            'current_group': self.current_group,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'total_groups': len(self.groups)
        }


class PollGroup(db.Model):
    """Represents a group of 3 images shown together in a poll."""
    __tablename__ = 'poll_groups'

    id = db.Column(db.Integer, primary_key=True)
    poll_id = db.Column(db.Integer, db.ForeignKey('polls.id'), nullable=False)
    group_number = db.Column(db.Integer, nullable=False)
    image1_id = db.Column(db.Integer, db.ForeignKey('images.id'), nullable=False)
    image2_id = db.Column(db.Integer, db.ForeignKey('images.id'), nullable=False)
    image3_id = db.Column(db.Integer, db.ForeignKey('images.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    poll = db.relationship('Poll', back_populates='groups')
    image1 = db.relationship('Image', foreign_keys=[image1_id])
    image2 = db.relationship('Image', foreign_keys=[image2_id])
    image3 = db.relationship('Image', foreign_keys=[image3_id])
    submissions = db.relationship('Submission', back_populates='group', cascade='all, delete-orphan')

    def get_images(self):
        """Returns list of image dictionaries for this group."""
        return [
            self.image1.to_dict(),
            self.image2.to_dict(),
            self.image3.to_dict()
        ]

    def to_dict(self):
        return {
            'id': self.id,
            'poll_id': self.poll_id,
            'group_number': self.group_number,
            'images': self.get_images(),
            'created_at': self.created_at.isoformat() if self.created_at else None
        }


class Submission(db.Model):
    """Stores user submissions for a poll group."""
    __tablename__ = 'submissions'

    id = db.Column(db.Integer, primary_key=True)
    poll_id = db.Column(db.Integer, db.ForeignKey('polls.id'), nullable=False)
    group_id = db.Column(db.Integer, db.ForeignKey('poll_groups.id'), nullable=False)
    user_id = db.Column(db.String(100), nullable=False)  # Session-based identifier
    marry_image_id = db.Column(db.Integer, db.ForeignKey('images.id'), nullable=False)
    f_image_id = db.Column(db.Integer, db.ForeignKey('images.id'), nullable=False)
    kill_image_id = db.Column(db.Integer, db.ForeignKey('images.id'), nullable=False)
    submitted_at = db.Column(db.DateTime, default=datetime.utcnow)

    poll = db.relationship('Poll', back_populates='submissions')
    group = db.relationship('PollGroup', back_populates='submissions')
    marry_image = db.relationship('Image', foreign_keys=[marry_image_id])
    f_image = db.relationship('Image', foreign_keys=[f_image_id])
    kill_image = db.relationship('Image', foreign_keys=[kill_image_id])

    def to_dict(self):
        return {
            'id': self.id,
            'poll_id': self.poll_id,
            'group_id': self.group_id,
            'user_id': self.user_id,
            'marry_image_id': self.marry_image_id,
            'f_image_id': self.f_image_id,
            'kill_image_id': self.kill_image_id,
            'submitted_at': self.submitted_at.isoformat() if self.submitted_at else None
        }


class SmashPassSession(db.Model):
    """Represents a Smash or Pass game session."""
    __tablename__ = 'smashpass_sessions'

    id = db.Column(db.Integer, primary_key=True)
    status = db.Column(db.String(20), default='setup', nullable=False)  # setup, active, completed
    current_image_index = db.Column(db.Integer, default=0)
    image_order = db.Column(db.Text)  # JSON string of randomized image IDs
    started_at = db.Column(db.DateTime)
    ended_at = db.Column(db.DateTime)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    votes = db.relationship('SmashPassVote', back_populates='session', cascade='all, delete-orphan')

    def to_dict(self):
        import json
        return {
            'id': self.id,
            'status': self.status,
            'current_image_index': self.current_image_index,
            'image_order': json.loads(self.image_order) if self.image_order else [],
            'started_at': self.started_at.isoformat() if self.started_at else None,
            'ended_at': self.ended_at.isoformat() if self.ended_at else None,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }


class SmashPassVote(db.Model):
    """Stores individual Smash or Pass votes."""
    __tablename__ = 'smashpass_votes'

    id = db.Column(db.Integer, primary_key=True)
    session_id = db.Column(db.Integer, db.ForeignKey('smashpass_sessions.id'), nullable=False)
    image_id = db.Column(db.Integer, db.ForeignKey('images.id'), nullable=False)
    user_id = db.Column(db.String(100), nullable=False)  # Session-based identifier
    vote = db.Column(db.String(10), nullable=False)  # 'smash' or 'pass'
    submitted_at = db.Column(db.DateTime, default=datetime.utcnow)

    session = db.relationship('SmashPassSession', back_populates='votes')
    image = db.relationship('Image', foreign_keys=[image_id])

    def to_dict(self):
        return {
            'id': self.id,
            'session_id': self.session_id,
            'image_id': self.image_id,
            'user_id': self.user_id,
            'vote': self.vote,
            'submitted_at': self.submitted_at.isoformat() if self.submitted_at else None
        }


def init_db(app):
    """Initialize the database with the Flask app."""
    db.init_app(app)
    with app.app_context():
        db.create_all()
        # Scan images folder and add any new images
        import os
        images_dir = os.path.join(app.root_path, 'images')
        if os.path.exists(images_dir):
            for filename in os.listdir(images_dir):
                if filename.lower().endswith(('.png', '.jpg', '.jpeg', '.gif', '.webp')):
                    existing = Image.query.filter_by(filename=filename).first()
                    if not existing:
                        new_image = Image(filename=filename, is_active=True)
                        db.session.add(new_image)
            db.session.commit()
