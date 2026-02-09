FOLDER-BASED IMAGE ORGANIZATION

Organize your images into folders for better management!

Structure:
images/
  ├── default/          # Default folder (created automatically)
  ├── characters/       # Example: Character images
  ├── landscapes/       # Example: Landscape images
  └── party2024/        # Example: Event-specific images

Supported formats:
- PNG (.png)
- JPEG (.jpg, .jpeg)
- GIF (.gif)
- WebP (.webp)
- AVIF (.avif)
- BMP (.bmp)

How it works:
1. Create folders inside the images/ directory
2. Place images in their respective folders
3. The application automatically detects folders and images on startup
4. Use the Folder Manager (/admin/folders/manage) to create/delete folders via UI
5. When uploading images, select which folder to upload to
6. When creating polls/sessions, choose a specific folder or "All Folders"

Migration:
- On first run, existing images are automatically moved to a "default" folder
- All future images must be placed in folders (not the root directory)

For best results:
- Use clear, high-quality images
- Keep filenames simple and descriptive
- Recommended size: at least 500x500 pixels
- Organize images by theme, event, or category

Admin Panel:
- Manage Folders: /admin/folders/manage (create/delete folders)
- Upload Images: /admin/images/manage (upload to specific folders)
- Toggle images on/off for polls in the Admin panel
