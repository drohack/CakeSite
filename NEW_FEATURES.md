# New Features - FMK Quiz Application

## 🎉 What's New

Your FMK Quiz application now includes **folder-based image organization** plus two interactive game features!

---

## 📁 Feature: Folder-Based Image Organization

Organize your images into folders for better management and themed polls!

### What's New
- **Multiple Folders**: Organize images by theme, event, or category (e.g., "Characters", "Landscapes", "Party2024")
- **Folder Manager**: Web UI to create and manage folders
- **Selective Polls**: Create MFK polls or S/P sessions from specific folders or all folders
- **Advanced Upload System**: Multiple upload methods with auto-resize and preview
- **Smart Folder Memory**: Remembers your last selected folder across sessions

### Key Features

✅ **Folder Management UI**: Create and delete folders via `/admin/folders/manage`
✅ **Organized Storage**: `images/default/`, `images/characters/`, etc.
✅ **Selective Polling**: Choose specific folder or "All Folders" when creating polls
✅ **Advanced Upload System**: Multiple methods with auto-resize and preview
✅ **Smart Folder Memory**: Remembers your last selected folder
✅ **Auto-Migration**: Existing images automatically moved to "default" folder on first run
✅ **Database Sync Tool**: Detect and fix filesystem/database inconsistencies

### How to Use

#### 1. Manage Folders
**URL**: http://localhost:5000/admin/folders/manage

- Click "Create Folder"
- Enter folder name (e.g., "characters", "party2024")
- Enter display name (e.g., "Characters", "Party 2024")
- View all folders with image counts
- Delete empty folders

#### 2. Upload Images to Folders
**URL**: http://localhost:5000/admin/images/manage

**Multiple Upload Methods:**
- **File Browser**: Click "Upload Images" → Select multiple files → Direct upload
- **Drag & Drop**: Drag multiple files onto page → Direct upload
- **Clipboard Paste**: Copy image files from desktop → Ctrl+V → Direct upload (multiple supported!)
- **URL Paste**: Copy image URL → Ctrl+V → Preview & rename → Upload
- **Single File Preview**: Any single file shows preview modal for renaming

**Smart Features:**
- Auto-resize images >1920px (perfect for 1080p displays)
- Folder memory (remembers last selected folder)
- Toast notifications for all operations
- Spaces and parentheses allowed in filenames

#### 3. Create Polls from Specific Folders
**MFK Admin** (http://localhost:5000/admin/mfk):
- Select folder from dropdown (or "All Folders")
- Click "Create Poll"
- Only images from selected folder(s) will be included

**Smash or Pass Admin** (http://localhost:5000/admin/smashpass):
- Select folder from dropdown (or "All Folders")
- Click "Create Session"
- Only images from selected folder(s) will be included

### Folder Naming Rules
- Use only letters, numbers, underscores, and hyphens
- Examples: `characters`, `party_2024`, `landscapes`, `my-event`
- Display names can have spaces: "My Event", "Party 2024"

### Database Changes
- **Images table**: Added `folder` column
- **New Folders table**: Stores folder metadata
- **Composite unique constraint**: Same filename allowed in different folders

### Migration
On first startup after upgrade:
1. Creates "default" folder
2. Moves all root images to `images/default/`
3. Updates database records
4. Clears existing polls (clean slate)

---

## 📸 Feature 1: Image Slideshow

A full-screen slideshow that displays all images one at a time with their names.

### Access
- **URL**: http://localhost:5000/slideshow

### Features
- 🖼️ Displays each image with its name (filename without extension) at the top
- ⏯️ Auto-play with 5-second intervals
- ⬅️➡️ Manual navigation (Previous/Next buttons)
- ⏸️ Pause/Play controls
- ⌨️ Keyboard controls:
  - Arrow Left/Right: Navigate images
  - Spacebar: Pause/Play
- 🌙 Full-screen dark background
- 📊 Shows current position (e.g., "3 / 10")

### Usage
1. Click "View Slideshow" on the home page
2. Images auto-advance every 5 seconds
3. Use controls to pause or manually navigate
4. Press ESC or click "Home" to exit

---

## 🔥 Feature 2: Smash or Pass Game

An interactive voting game where users vote "Smash" or "Pass" for each image individually, with real-time results.

### How It Works

#### For Admins
**URL**: http://localhost:5000/smashpass/admin

1. **Create Session**: Generates a random order of all images
2. **Generate QR Code**: Create QR code for users to join
3. **Start Session**: Begin the voting
4. **Live Results**: See real-time vote counts (Smash vs Pass)
   - Left side: Current image display
   - Right side: Live voting bars
5. **Next Image**: Move to the next image (locks submissions for current)
6. **Auto-Update FMK**: When moving to next image:
   - Images with more "Smash" votes → Set to **Active** (enabled for FMK)
   - Images with more "Pass" votes → Set to **Inactive** (disabled for FMK)
7. **View Results**: After completion, see all Smashes and Passes

#### For Users (Mobile-Friendly)
**URL**: http://localhost:5000/smashpass

1. Scan QR code or visit the URL
2. See current image with its name
3. Vote "Smash" 🔥 or "Pass" 👎
4. Can change vote before admin moves to next image
5. Automatically updates to next image when admin advances
6. Receives completion message when all images are done

### Key Features

✅ **Random Order**: Images shown in randomized order
✅ **Real-Time Updates**: Live vote counts via WebSocket
✅ **Mobile-First**: Designed for phone voting via QR code
✅ **Vote Changes**: Users can change their vote before admin locks it
✅ **Auto-Integration**: Results automatically update FMK active/inactive status
✅ **Final Summary**: View all Smashes and Passes at the end

### Admin Workflow

1. Go to Smash or Pass Admin panel
2. Click "Generate QR Code"
3. Click "Create New Session"
4. Click "Start Session"
5. Share QR code with users
6. Watch live vote counts
7. Click "Next Image" when ready to move on
8. Repeat until all images are completed
9. Click "View Final Results" to see summary

### User Workflow

1. Scan QR code or visit `/smashpass`
2. Wait for admin to start session
3. See current image and name
4. Click "SMASH" 🔥 or "PASS" 👎
5. Wait for admin to move to next image
6. Repeat until completed

---

## 🎯 Integration with FMK Game

**Important**: The Smash or Pass game automatically configures the FMK game!

When the admin moves to the next image in Smash or Pass:
- The system counts the votes for the current image
- If **Smash** votes > **Pass** votes → Image is set to **Active** (enabled for FMK polls)
- If **Pass** votes > **Smash** votes → Image is set to **Inactive** (disabled for FMK polls)
- If tied → Image keeps its current active/inactive status

This means you can use Smash or Pass as a **filtering mechanism** before running FMK polls!

**Recommended Flow:**
1. Run Smash or Pass first to let users vote on all images
2. System automatically activates "Smashes" and deactivates "Passes"
3. Then create FMK polls - only the "Smash" images will be included!

---

## 🌐 Updated Home Page

The home page now has three sections:

1. **Marry, F, Kill Game**
   - Join MFK Poll (user voting)
   - MFK Admin Panel (admin control)

2. **Smash or Pass Game**
   - Join Smash or Pass (user voting)
   - S/P Admin Panel (admin control)

3. **Image Slideshow**
   - View Slideshow (full-screen display)

---

## 📊 Database Updates

New tables added:
- `smashpass_sessions`: Stores Smash or Pass game sessions
- `smashpass_votes`: Stores individual user votes

The `images` table's `is_active` field is automatically updated based on Smash or Pass results.

---

## 🔌 WebSocket Events

New real-time events:
- `smashpass_started`: Session has started
- `smashpass_next_image`: Admin moved to next image
- `smashpass_completed`: Session completed
- `smashpass_vote_update`: New vote received (live count update)

---

## 🎨 Mobile Responsive

All new features are fully mobile-responsive:
- Slideshow adapts to screen size
- Smash or Pass voting interface optimized for phones
- Large touch targets for easy voting
- Auto-scaling images

---

## 🚀 Quick Start

### Test Slideshow
1. Visit http://localhost:5000/slideshow
2. Images will auto-play if you have images in the `images/` folder

### Test Smash or Pass
1. Admin: http://localhost:5000/smashpass/admin
2. Create session → Start session
3. Users: http://localhost:5000/smashpass
4. Vote and see live results!

---

## 📝 Notes

- **Add Images**: Make sure to add images to the `images/` folder
- **Restart Required**: After adding images, restart the container:
  ```bash
  docker-compose restart
  ```
- **Minimum Images**: Need at least 1 image for slideshow, recommended 5+ for Smash or Pass

---

## 🎮 Example Complete Workflow

1. **Setup**: Add 10 images to `images/` folder
2. **Filter**: Run Smash or Pass game
   - Users vote on all 10 images
   - Maybe 7 get "Smash", 3 get "Pass"
   - System auto-enables the 7 "Smashes"
3. **Slideshow**: Show all images to users
4. **FMK Game**: Run MFK polls
   - Only the 7 "Smash" images are included
   - Create poll with groups of 3
   - Users vote Marry/F/Kill
5. **Results**: View cumulative MFK results

---

## 🆘 Troubleshooting

**Slideshow shows "No images"**
- Add images to `images/` folder
- Restart container: `docker-compose restart`

**Smash or Pass won't start**
- Make sure you clicked "Create New Session" first
- Then click "Start Session"
- Check that images exist in the database

**Users can't connect**
- Make sure both admin and users are on the same network
- QR code generates the correct server URL
- Port 5000 is accessible

**Votes not updating in real-time**
- Check WebSocket connection in browser console
- Hard refresh the page (Ctrl+Shift+R)

---

## 🎊 Enjoy Your Enhanced FMK Quiz App!

You now have three complete interactive experiences:
1. 🎮 **Marry, F, Kill** - Classic voting game
2. 🔥 **Smash or Pass** - Filter and rate images
3. 📸 **Slideshow** - Display all images

All with real-time updates, mobile support, and seamless integration!
