# FMK Quiz - Quick Start Guide

This guide will get you up and running in under 5 minutes.

## Option 1: Docker Compose (Recommended)

1. **Organize your images** into folders:
   ```bash
   mkdir -p images/default
   # Add images to images/default/ or create other folders
   ```

2. **Start the application**:
   ```bash
   docker-compose up -d
   ```

3. **Access the application**:
   - Open `http://localhost:5000` in your browser
   - Admin Panel: `http://localhost:5000/admin`
   - Folder Manager: `http://localhost:5000/admin/folders/manage`
   - Image Upload: `http://localhost:5000/admin/images/manage`

4. **Stop the application**:
   ```bash
   docker-compose down
   ```

## Option 2: Development Mode (Without Docker)

1. **Install Python 3.11+** if not already installed

2. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

3. **Organize images** into folders:
   ```bash
   mkdir -p images/default
   # Add images to images/default/ or use the UI to create folders
   ```

4. **Run the development server**:
   ```bash
   python run_dev.py
   ```
   Or simply:
   ```bash
   python app.py
   ```

5. **Access the application** at `http://localhost:5000`

## Option 3: Docker (Manual)

1. **Build the image**:
   ```bash
   docker build -t fmk-quiz .
   ```

2. **Create data directory**:
   ```bash
   mkdir -p data
   ```

3. **Run the container**:
   ```bash
   docker run -d \
     --name fmk-quiz \
     -p 5000:5000 \
     -v $(pwd)/images:/app/images \
     -v $(pwd)/data:/app/data \
     fmk-quiz
   ```

4. **View logs**:
   ```bash
   docker logs -f fmk-quiz
   ```

## Using the Application

### As Admin:

1. **Manage Folders** at `http://localhost:5000/admin/folders/manage`:
   - Create folders (e.g., "characters", "party2024")
   - Organize image sets

2. **Upload Images** at `http://localhost:5000/admin/images/manage`:
   - Folder auto-selected (remembers last choice)
   - **Multiple upload methods**:
     - File browser (select multiple files)
     - Drag & drop (multiple files supported)
     - Clipboard paste (Ctrl+V - supports multiple files!)
     - URL paste (Ctrl+V - shows preview & rename)
   - Large images auto-resized to 1920px max
   - Single files show preview modal for renaming

3. **Go to MFK Admin** at `http://localhost:5000/admin/mfk`:
   - **Manage Images tab**:
     - Select folder to view/manage
     - Toggle images on/off
   - **Poll Control tab**:
     - Select folder for poll
     - Generate QR code for users
     - Create and start poll
     - Monitor submissions
     - Click "Next Group" to move to next set
     - End poll (auto-switches to Results)
   - **Results tab**: View current and cumulative results

4. **Or use Smash or Pass** at `http://localhost:5000/admin/smashpass`:
   - Select folder
   - Create session to let users vote on each image
   - Results auto-update image active/inactive status

### As User:

1. Go to `http://localhost:5000/poll` (or scan the QR code)
2. Wait for admin to start the poll
3. Drag each image to Marry, F, or Kill bucket
4. Click Submit
5. View live results
6. Wait for next group

## Sample Images

For testing, you can download free images from:
- [Unsplash](https://unsplash.com/) - Free high-quality photos
- [Pexels](https://pexels.com/) - Free stock photos
- [Pixabay](https://pixabay.com/) - Free images

Or use any images you have. Supported formats: PNG, JPG, JPEG, GIF, WebP

## Testing Workflow

1. **Setup**:
   - Start the application
   - Create a folder (e.g., "test") in Folder Manager
   - Upload at least 6 images to that folder

2. **Run Smash or Pass** (optional filtering):
   - Go to S/P Admin, select "test" folder
   - Create session
   - Vote on images (sets active/inactive)

3. **Run MFK Poll**:
   - Open MFK Admin in one browser window
   - Open user page in another window (or on phone)
   - In Admin:
     - Select "test" folder in Manage Images tab
     - Verify which images are active
     - Create poll (should create 2+ groups)
   - In User page:
     - Vote on images
     - Submit and see results
   - In Admin:
     - Click "Next Group"
     - User page auto-updates with new images
   - Repeat until all groups complete
   - In Admin:
     - End poll (auto-switches to Results tab)
     - View cumulative results

## Troubleshooting

**No images showing:**
- Make sure images are in the `images/` folder
- Check that files have image extensions (.jpg, .png, etc.)
- Restart the application

**Port 5000 already in use:**
- Change port in docker-compose.yml or run command
- Or stop the application using that port

**Database issues:**
- Delete `fmk_quiz.db` or `data/fmk_quiz.db`
- Restart the application

**WebSocket errors:**
- Hard refresh the browser (Ctrl+Shift+R)
- Check browser console for errors

## Next Steps

- Read the full [README.md](README.md) for detailed documentation
- Customize the styling in `static/css/style.css`
- Add authentication to the admin panel
- Set up a reverse proxy with SSL for production use

Enjoy! 🎉
