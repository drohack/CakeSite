# Marry, F, Kill (FMK) Quiz Application

A full-featured interactive polling web application for playing "Marry, F, Kill" with custom images. Built with Flask, Socket.IO for real-time updates, and designed to run in Docker on Unraid.

## Features

- **Image Management**: Upload images to a folder and toggle their availability for polls
- **Admin Control Panel**: Full control over poll creation, execution, and results
- **Real-time Updates**: Live results using WebSockets
- **Mobile-First Design**: Optimized for mobile devices with drag-and-drop interface
- **QR Code Access**: Generate QR codes for users to join polls easily
- **No Login Required**: Users join via session-based identifiers
- **Persistent Storage**: SQLite database stores all data locally
- **Live Results**: See results update in real-time as users submit
- **Cumulative Results**: View overall statistics across all poll groups

## Project Structure

```
MarryFKill_Quiz/
├── app.py                 # Main Flask application
├── database.py            # Database models and initialization
├── requirements.txt       # Python dependencies
├── Dockerfile            # Docker configuration
├── .dockerignore         # Docker ignore file
├── .gitignore           # Git ignore file
├── README.md            # This file
├── images/              # Place your images here
├── static/
│   ├── css/
│   │   └── style.css    # Main stylesheet
│   └── js/
│       ├── main.js      # Common JavaScript
│       ├── admin.js     # Admin panel JavaScript
│       └── poll.js      # Poll interface JavaScript
└── templates/
    ├── base.html        # Base template
    ├── index.html       # Home page
    ├── admin.html       # Admin panel
    └── poll.html        # User poll interface
```

## Setup Instructions

### Prerequisites

- Docker installed on your system
- Images to use for polls (JPEG, PNG, GIF, or WebP)

### Installation

1. **Clone or download this repository**

2. **Add your images**
   - Place image files in the `images/` folder
   - Supported formats: `.png`, `.jpg`, `.jpeg`, `.gif`, `.webp`
   - Images are automatically detected on startup

3. **Build the Docker image**
   ```bash
   docker build -t fmk-quiz .
   ```

4. **Run the container**
   ```bash
   docker run -d \
     --name fmk-quiz \
     -p 5000:5000 \
     -v /path/to/your/images:/app/images \
     -v /path/to/your/data:/app/data \
     fmk-quiz
   ```

   Replace `/path/to/your/images` with the path to your images folder.

### Unraid Installation

1. **Open Unraid Docker tab**

2. **Add Container** with these settings:
   - **Name**: `fmk-quiz`
   - **Repository**: `fmk-quiz` (after building the image)
   - **Network Type**: `bridge`
   - **Port**: `5000` → `5000`
   - **Volume 1**: `/mnt/user/appdata/fmk-quiz/images` → `/app/images`
   - **Volume 2**: `/mnt/user/appdata/fmk-quiz/data` → `/app/data`

3. **Create the directories on Unraid**:
   ```bash
   mkdir -p /mnt/user/appdata/fmk-quiz/images
   mkdir -p /mnt/user/appdata/fmk-quiz/data
   ```

4. **Add your images** to `/mnt/user/appdata/fmk-quiz/images`

5. **Start the container**

## Usage Guide

### Accessing the Application

- **Home Page**: `http://your-server-ip:5000/`
- **Admin Panel**: `http://your-server-ip:5000/admin`
- **User Poll**: `http://your-server-ip:5000/poll`

### Admin Workflow

1. **Navigate to Admin Panel** (`/admin`)

2. **Manage Images Tab**:
   - View all images in the `images/` folder
   - Toggle images as Active/Inactive
   - Only active images will be included in polls

3. **Poll Control Tab**:
   - Click **"Generate QR Code"** to create a QR code for users
   - Click **"Create New Poll"** to generate a new poll with random groups
   - Click **"Start Poll"** to activate the first group
   - Monitor live submissions for the current group
   - Click **"Next Group"** to move to the next set of 3 images
   - Click **"End Poll"** when finished

4. **Results Tab**:
   - **Current Group**: See results for the active group
   - **Cumulative Results**: See overall results across all groups
   - Results update automatically in real-time

### User Workflow

1. **Scan QR Code** or navigate to `/poll`

2. **Wait for poll to start** (if not already active)

3. **Drag and drop** each of the 3 images into the appropriate category:
   - 💍 **Marry**: The one you'd marry
   - 🔥 **F**: The one you'd... well, you know
   - 💀 **Kill**: The one you'd eliminate

4. **Click Submit** once all three images are assigned

5. **View Results** immediately after submitting

6. **Wait for next group** - the page will automatically update when the admin moves to the next group

## How It Works

### Poll Generation

When you create a poll, the system:
1. Gets all active images
2. Shuffles them randomly
3. Creates groups of 3 images (non-overlapping)
4. Stores all groups in the database

### Submission Process

1. User assigns each image to exactly one category
2. Backend validates that all three images are different
3. Submission is saved to the database
4. Results are calculated and broadcast to all connected clients
5. User sees live results immediately

### Real-time Updates

The application uses Socket.IO for real-time communication:
- Poll start notifications
- Group changes
- Live result updates
- Submission counts

### Data Storage

All data is stored in a SQLite database (`fmk_quiz.db`):
- **Images**: Filenames and active status
- **Polls**: Poll sessions with start/end times
- **Poll Groups**: Sets of 3 images for each round
- **Submissions**: User choices for each group

## Database Schema

### Images Table
- `id`: Primary key
- `filename`: Image filename
- `is_active`: Boolean for availability
- `created_at`: Timestamp

### Polls Table
- `id`: Primary key
- `status`: setup, active, or ended
- `started_at`: Poll start time
- `ended_at`: Poll end time
- `current_group`: Active group number
- `created_at`: Timestamp

### PollGroups Table
- `id`: Primary key
- `poll_id`: Foreign key to Polls
- `group_number`: Group sequence number
- `image1_id`, `image2_id`, `image3_id`: Foreign keys to Images
- `created_at`: Timestamp

### Submissions Table
- `id`: Primary key
- `poll_id`: Foreign key to Polls
- `group_id`: Foreign key to PollGroups
- `user_id`: Session-based user identifier
- `marry_image_id`: Foreign key to Images
- `f_image_id`: Foreign key to Images
- `kill_image_id`: Foreign key to Images
- `submitted_at`: Timestamp

## API Endpoints

### Admin Endpoints

- `GET /admin/images` - Get all images
- `POST /admin/images/<id>/toggle` - Toggle image active status
- `POST /admin/poll/create` - Create new poll
- `GET /admin/poll/current` - Get current poll status
- `POST /admin/poll/<id>/start` - Start poll
- `POST /admin/poll/<id>/next-group` - Move to next group
- `POST /admin/poll/<id>/end` - End poll
- `GET /admin/poll/<id>/results/current` - Get current group results
- `GET /admin/poll/<id>/results/cumulative` - Get cumulative results
- `GET /admin/qr` - Generate QR code

### User Endpoints

- `GET /poll/current` - Get current active poll and group
- `POST /poll/submit` - Submit poll choices
- `GET /poll/results/<group_id>` - Get results for a group

### WebSocket Events

- `poll_started` - Emitted when poll starts
- `group_changed` - Emitted when moving to next group
- `poll_ended` - Emitted when poll ends
- `results_updated` - Emitted when new submissions arrive

## Customization

### Changing Port

Edit the `docker run` command or Dockerfile to use a different port:
```bash
docker run -p 8080:5000 fmk-quiz
```

### Adding More Images

Simply add image files to the `images/` folder and restart the container. New images will be automatically detected and set to active.

### Styling

Modify `static/css/style.css` to customize the appearance.

### Secret Key

For production, set a secure secret key:
```bash
docker run -e SECRET_KEY='your-secret-key-here' -p 5000:5000 fmk-quiz
```

## Troubleshooting

### No images showing up
- Check that images are in the `images/` folder
- Verify the volume mount is correct
- Restart the container

### Can't connect to poll
- Verify the server IP and port
- Check firewall settings
- Ensure the container is running: `docker ps`

### Database errors
- Delete the database file and restart: `rm fmk_quiz.db`
- Check volume permissions

### WebSocket not working
- Ensure port 5000 is accessible
- Check browser console for errors
- Try refreshing the page

## Development

To run in development mode:

```bash
# Install dependencies
pip install -r requirements.txt

# Run with Flask development server
python app.py
```

The app will be available at `http://localhost:5000` with debug mode enabled.

## Security Notes

- Change the `SECRET_KEY` in production
- Consider adding authentication for the admin panel
- Use HTTPS in production (reverse proxy recommended)
- The application is designed for trusted networks (parties, events, etc.)

## License

This project is provided as-is for educational and entertainment purposes.

## Support

For issues or questions, please check the troubleshooting section or review the code comments.

## Credits

Built with:
- Flask
- Flask-SocketIO
- SQLAlchemy
- Socket.IO
- QRCode

Enjoy your FMK Quiz! 🎉
