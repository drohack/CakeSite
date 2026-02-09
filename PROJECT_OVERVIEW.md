# FMK Quiz - Project Overview

## Complete Project Structure

```
MarryFKill_Quiz/
│
├── 📄 Core Application Files
│   ├── app.py                      # Main Flask application with all routes
│   ├── database.py                 # SQLAlchemy models and database setup
│   └── requirements.txt            # Python dependencies
│
├── 🐳 Docker Configuration
│   ├── Dockerfile                  # Docker image definition
│   ├── docker-compose.yml          # Docker Compose configuration
│   └── .dockerignore              # Files to exclude from Docker build
│
├── 🎨 Frontend (Templates)
│   └── templates/
│       ├── base.html              # Base template with common layout
│       ├── index.html             # Home/landing page
│       ├── admin.html             # MFK Admin control panel
│       ├── poll.html              # User polling interface
│       ├── smashpass_admin.html   # Smash or Pass admin
│       ├── vote.html              # Unified voting page (MFK + S/P)
│       ├── slideshow.html         # Image slideshow
│       ├── image_manager.html     # Image upload/rename/delete
│       └── folder_manager.html    # Folder management
│
├── 💅 Styling
│   └── static/css/
│       └── style.css              # All CSS styles (responsive design)
│
├── ⚡ JavaScript
│   └── static/js/
│       ├── main.js                # Common utilities and Socket.IO setup
│       ├── admin.js               # MFK Admin panel functionality
│       ├── smashpass_admin.js     # Smash or Pass admin
│       ├── vote.js                # Unified voting interface
│       ├── slideshow.js           # Slideshow controls
│       ├── image_manager.js       # Image upload/management
│       └── folder_manager.js      # Folder management
│
├── 🖼️ Images (Folder-Based Organization)
│   └── images/
│       ├── README.txt             # Instructions for adding images
│       ├── default/               # Default folder
│       ├── characters/            # Example: Character images
│       └── party2024/             # Example: Event-specific images
│
├── 📚 Documentation
│   ├── README.md                  # Complete documentation
│   ├── QUICKSTART.md              # Quick start guide
│   └── PROJECT_OVERVIEW.md        # This file
│
├── 🔧 Setup & Testing
│   ├── setup.sh                   # Linux/Mac setup script
│   ├── setup.bat                  # Windows setup script
│   ├── run_dev.py                 # Development server launcher
│   └── test_install.py            # Installation verification script
│
└── 🗄️ Runtime (Created automatically)
    └── data/
        └── fmk_quiz.db            # SQLite database (auto-created)
```

## Technology Stack

### Backend
- **Flask 3.0.0** - Web framework
- **Flask-SocketIO 5.3.5** - WebSocket support for real-time updates
- **Flask-SQLAlchemy 3.1.1** - Database ORM
- **SQLite** - Local database (no separate container needed)
- **Gunicorn + Eventlet** - Production WSGI server

### Frontend
- **Vanilla JavaScript** - No frameworks, pure JS
- **Socket.IO Client** - Real-time communication
- **HTML5 Drag and Drop API** - Interactive UI
- **CSS Grid & Flexbox** - Responsive layout

### Additional Libraries
- **QRCode** - QR code generation
- **Pillow** - Image processing

## Key Features Implementation

### 1. Folder-Based Image Organization
- **Location**: `images/` folder with subfolders (e.g., `images/default/`, `images/party2024/`)
- **Management**: Create/delete folders via UI (`/admin/folders/manage`)
- **Upload**: Upload images to specific folders (`/admin/images/manage`)
- **Detection**: Automatic folder scanning on startup
- **Toggle**: Admin can enable/disable per image
- **Supported formats**: PNG, JPG, JPEG, GIF, WebP
- **Features**: Paste URLs to upload, rename with spaces/parentheses, database sync tool

### 2. Admin Panel (`/admin`)
**Three tabs:**
- **Manage Images**: Grid view with toggle buttons
- **Poll Control**: Create/start/manage polls, QR code generation
- **Results**: Current group and cumulative results

**Key Functions** (admin.js):
- `loadImages()` - Load and display all images
- `createPoll()` - Generate poll with randomized groups
- `startPoll()` - Activate first group
- `nextGroup()` - Move to next set of images
- `loadCurrentGroupResults()` - Real-time results for current group
- `loadCumulativeResults()` - Overall statistics

### 3. Poll Logic
**Pre-generation** (app.py:163-189):
- All groups generated when poll is created
- Images shuffled randomly
- Groups of 3 created sequentially (no overlaps)
- Stored in database

**Submissions** (app.py:298-357):
- Validates all 3 images are different
- Checks images belong to current group
- Allows updates (user can resubmit)
- Broadcasts results via WebSocket

### 4. User Interface (`/poll`)
**Drag-and-Drop** (poll.js:60-155):
- HTML5 Drag and Drop API
- Three drop zones: Marry, F, Kill
- Visual feedback on drag/drop
- Validation (can't assign same image twice)

**Real-time Updates** (poll.js:218-245):
- Auto-refresh on poll start
- Auto-load new group
- Live results display
- WebSocket notifications

### 5. Database Schema

**6 Tables:**

1. **images**
   - id, filename, folder, is_active, created_at
   - Unique constraint: (folder, filename)

2. **folders**
   - id, name, display_name, created_at

3. **polls**
   - id, status (setup/active/ended), started_at, ended_at, current_group

4. **poll_groups**
   - id, poll_id, group_number, image1_id, image2_id, image3_id

5. **submissions**
   - id, poll_id, group_id, user_id, marry_image_id, f_image_id, kill_image_id

6. **smashpass_sessions**
   - id, status, folder, current_image_index, image_order, started_at, ended_at

7. **smashpass_votes**
   - id, session_id, image_id, user_id, vote (smash/pass), submitted_at

### 6. Real-time Communication

**WebSocket Events:**
- `poll_started` - Notify users poll began
- `group_changed` - New group available
- `poll_ended` - Poll finished
- `results_updated` - New submission received

**Implementation**:
- Server: Flask-SocketIO with Eventlet
- Client: Socket.IO JavaScript library
- All clients join 'poll' room for broadcasts

## API Endpoints Summary

### Admin Endpoints
```
# Folder Management
GET    /admin/folders                          # List all folders with image counts
POST   /admin/folders                          # Create new folder
DELETE /admin/folders/<id>                     # Delete folder (if empty)
GET    /admin/folders/manage                   # Folder management UI

# Image Management
GET    /admin/images                           # List all images
POST   /admin/images/upload                    # Upload image (requires folder)
POST   /admin/images/upload-from-url           # Upload from URL
POST   /admin/images/<id>/toggle               # Toggle image active status
POST   /admin/images/<id>/rename               # Rename image
POST   /admin/images/<id>/delete               # Delete image
GET    /admin/images/sync                      # Scan for sync issues
POST   /admin/images/sync                      # Apply sync fixes
GET    /admin/images/manage                    # Image management UI

# MFK Poll Management
GET    /admin/mfk                              # MFK Admin UI
POST   /admin/poll/create                      # Create new poll (optional folder param)
GET    /admin/poll/current                     # Get current poll info
POST   /admin/poll/<id>/start                  # Start poll
POST   /admin/poll/<id>/next-group             # Move to next group
POST   /admin/poll/<id>/end                    # End poll
GET    /admin/poll/<id>/results/current        # Current group results
GET    /admin/poll/<id>/results/cumulative     # All groups results
GET    /admin/qr                               # Generate QR code

# Smash or Pass Management
GET    /admin/smashpass                        # S/P Admin UI
POST   /smashpass/session/create               # Create session (optional folder param)
GET    /smashpass/session/current              # Get current session
POST   /smashpass/session/<id>/next            # Move to next image
POST   /smashpass/session/<id>/end             # End session
GET    /smashpass/session/<id>/results         # Get session results
```

### User Endpoints
```
GET    /                                       # Home page
GET    /poll                                   # Poll interface
GET    /poll/current                           # Get current active poll
POST   /poll/submit                            # Submit choices
GET    /poll/results/<group_id>                # Get group results
GET    /images/<filename>                      # Serve image files
```

## Data Flow

### Creating and Running a Poll

1. **Admin creates poll** → Backend shuffles images and creates groups
2. **Admin starts poll** → Sets status to 'active', current_group = 0
3. **Users load `/poll`** → Fetch current group images
4. **User drags images** → Client-side validation
5. **User submits** → POST to `/poll/submit`
6. **Backend validates** → Save to database
7. **Backend broadcasts** → Socket.IO emits 'results_updated'
8. **All clients update** → Display new results
9. **Admin clicks next** → Increment current_group
10. **Users auto-refresh** → Load new group images

### Results Calculation

**Current Group** (app.py:59-94):
- Query all submissions for group_id
- Count votes for each category per image
- Calculate percentages
- Return formatted results

**Cumulative** (app.py:97-136):
- Query all submissions for poll_id
- Aggregate votes across all groups
- Calculate total statistics per image
- Sort by marry votes (most popular first)

## Deployment Options

### 1. Docker Compose (Recommended)
```bash
docker-compose up -d
```
- Single command deployment
- Auto-restart on failure
- Easy volume management
- Health checks included

### 2. Docker Manual
```bash
docker build -t fmk-quiz .
docker run -d -p 5000:5000 \
  -v $(pwd)/images:/app/images \
  -v $(pwd)/data:/app/data \
  fmk-quiz
```

### 3. Development Mode
```bash
pip install -r requirements.txt
python run_dev.py
```
- Hot reload on code changes
- Debug mode enabled
- Better error messages

### 4. Unraid
- Build image locally or on Unraid
- Use Unraid's Docker interface
- Map ports and volumes
- Auto-start with array

## Security Considerations

### Current Implementation
- Session-based user IDs (no authentication)
- No admin authentication
- CORS enabled for all origins
- Secret key configurable via environment

### Production Recommendations
1. **Add admin authentication** (Flask-Login, Flask-HTTPAuth)
2. **Use HTTPS** (reverse proxy: nginx, Traefik)
3. **Set strong SECRET_KEY** environment variable
4. **Restrict CORS** to specific origins
5. **Add rate limiting** (Flask-Limiter)
6. **Validate file uploads** if adding upload feature

## Performance Characteristics

- **Concurrent users**: 50-100 (single worker, Eventlet)
- **Database**: SQLite (sufficient for small-medium events)
- **WebSocket scaling**: Single worker (room-based broadcasting)
- **Image loading**: Direct file serving (consider CDN for production)

For larger deployments:
- Use PostgreSQL instead of SQLite
- Add Redis for session storage
- Use multiple workers with Redis pub/sub for Socket.IO
- Implement caching for results

## Customization Guide

### Changing Colors
Edit `static/css/style.css`:
- Line 76-103: Button colors
- Line 245-250: Result bar colors
- Line 13: Background gradient

### Adding Features
Common additions:
1. **Image upload**: Add endpoint in app.py, form in admin.html
2. **User names**: Add input field, modify Submission model
3. **Leaderboard**: Query top images, create new template
4. **Export results**: Add CSV/PDF export endpoint
5. **Authentication**: Flask-Login for admin panel

### Mobile Optimization
Already mobile-first, but for improvements:
- Adjust `@media` queries in style.css (lines 500+)
- Modify touch targets (minimum 44x44px)
- Test on various screen sizes

## Troubleshooting

### Common Issues

**Problem**: No images showing
- **Solution**: Check `images/` folder, verify file extensions, restart app

**Problem**: WebSocket connection failed
- **Solution**: Check firewall, verify port 5000 open, hard refresh browser

**Problem**: Database locked
- **Solution**: SQLite doesn't handle high concurrency, consider PostgreSQL

**Problem**: QR code doesn't work
- **Solution**: Verify server IP is accessible from user's network

### Debug Mode

Enable debug logging:
```python
# In app.py
import logging
logging.basicConfig(level=logging.DEBUG)
```

### Database Reset
```bash
rm data/fmk_quiz.db
# Restart app - database will be recreated
```

## Testing Checklist

- [ ] Add at least 6 images to `images/` folder
- [ ] Run `python test_install.py` - all tests pass
- [ ] Start application (Docker or dev mode)
- [ ] Access home page (http://localhost:5000)
- [ ] Access admin panel (/admin)
- [ ] Toggle image active/inactive
- [ ] Create new poll - verify groups created
- [ ] Generate QR code
- [ ] Open poll page in separate window/device
- [ ] Start poll from admin
- [ ] Verify poll page shows images
- [ ] Drag all 3 images to categories
- [ ] Submit poll
- [ ] Verify results display
- [ ] Verify admin sees submission count
- [ ] Click "Next Group" in admin
- [ ] Verify poll page auto-updates with new images
- [ ] Submit second group
- [ ] View cumulative results
- [ ] End poll from admin
- [ ] Verify poll page shows "ended" message

## Future Enhancements

### Potential Features
1. **Multi-poll support**: Run multiple polls simultaneously
2. **Poll templates**: Save/reuse group configurations
3. **Analytics dashboard**: Charts, graphs, statistics
4. **Social sharing**: Share results on social media
5. **Image categories**: Group images by themes
6. **Timed polls**: Auto-advance after time limit
7. **Anonymous comments**: Users can add comments
8. **Export data**: CSV, JSON, PDF reports
9. **Custom categories**: Beyond Marry/F/Kill
10. **Voting history**: View past polls and results

### Scalability Improvements
- Replace SQLite with PostgreSQL
- Add Redis for caching and pub/sub
- Implement CDN for image serving
- Add load balancing for multiple instances
- Implement database connection pooling

## License & Credits

**Built with:**
- Python & Flask ecosystem
- Socket.IO for real-time features
- SQLAlchemy for database ORM
- QRCode library

**Created for:** Entertainment and educational purposes

---

For support, see README.md or QUICKSTART.md
