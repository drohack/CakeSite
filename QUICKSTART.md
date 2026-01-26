# FMK Quiz - Quick Start Guide

This guide will get you up and running in under 5 minutes.

## Option 1: Docker Compose (Recommended)

1. **Add your images** to the `images/` folder

2. **Start the application**:
   ```bash
   docker-compose up -d
   ```

3. **Access the application**:
   - Open `http://localhost:5000` in your browser
   - Go to Admin Panel: `http://localhost:5000/admin`

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

3. **Add images** to the `images/` folder

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

1. Go to `http://localhost:5000/admin`
2. **Manage Images tab**: Toggle images on/off
3. **Poll Control tab**:
   - Generate QR code for users
   - Create a new poll
   - Start the poll
   - Monitor submissions
   - Click "Next Group" to move to next set of images
   - End the poll when done
4. **Results tab**: View current and cumulative results

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

1. Add at least 6 images to `images/` folder
2. Start the application
3. Open Admin Panel in one browser window
4. Open Poll page in another window (or on phone)
5. In Admin:
   - Create poll (should create 2+ groups)
   - Start poll
6. In Poll:
   - Drag and drop images
   - Submit
   - See results
7. In Admin:
   - Click "Next Group"
8. In Poll:
   - Page should automatically show new images
   - Submit again
9. In Admin:
   - View cumulative results
   - End poll

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
