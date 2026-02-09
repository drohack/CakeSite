/**
 * Slideshow JavaScript - Controls image slideshow (Manual navigation only)
 */

let allImages = [];
let images = [];
let currentIndex = 0;
let isGridView = false;

// Initialize slideshow
document.addEventListener('DOMContentLoaded', () => {
    loadFolders();
    loadImages();
    setupControls();
    setupFolderSync();
});

// Load folders and populate dropdown
async function loadFolders() {
    try {
        const folders = await apiCall('/admin/folders');
        const select = document.getElementById('folder-select');
        select.innerHTML = '<option value="all">All Folders</option>';

        folders.forEach(folder => {
            const option = document.createElement('option');
            option.value = folder.name;
            option.textContent = `${folder.display_name} (${folder.image_count})`;
            select.appendChild(option);
        });

        // Load from localStorage
        const lastSelected = localStorage.getItem('lastSelectedFolder');
        if (lastSelected && lastSelected !== 'all') {
            select.value = lastSelected;
        }
    } catch (error) {
        console.error('Failed to load folders:', error);
    }
}

// Setup folder sync with localStorage
function setupFolderSync() {
    const select = document.getElementById('folder-select');
    select.addEventListener('change', () => {
        // Save to localStorage
        localStorage.setItem('lastSelectedFolder', select.value);
        // Reload images with new filter
        loadImages();
    });
}

// Load all images (filtered by folder)
async function loadImages() {
    try {
        allImages = await apiCall('/slideshow/images');

        // Filter by selected folder
        const selectedFolder = document.getElementById('folder-select').value;
        if (selectedFolder === 'all') {
            images = allImages;
        } else {
            images = allImages.filter(img => img.folder === selectedFolder);
        }

        // Reset view state
        isGridView = false;
        currentIndex = 0;

        // Hide grid view, show slideshow
        document.getElementById('grid-view').style.display = 'none';

        if (images.length === 0) {
            document.getElementById('slideshow-container').style.display = 'none';
            document.getElementById('no-images').style.display = 'block';
            return;
        }

        document.getElementById('slideshow-container').style.display = 'flex';
        document.getElementById('no-images').style.display = 'none';
        showImage(0);
    } catch (error) {
        console.error('Failed to load images:', error);
        showNotification('Failed to load images', 'error');
    }
}

// Show specific image
function showImage(index) {
    if (images.length === 0) return;

    // Check if we've reached the end (going forward)
    if (index >= images.length) {
        // Show grid view at the end
        showGridView();
        return;
    }

    // Check if we've gone before the start (going backward)
    if (index < 0) {
        // Show grid view at the beginning
        showGridView();
        return;
    }

    currentIndex = index;
    const image = images[currentIndex];

    // Update display
    document.getElementById('image-name').textContent = image.name;
    document.getElementById('current-image').src = `/images/${image.filename}`;
    document.getElementById('slide-counter').textContent = `${currentIndex + 1} / ${images.length}`;
}

// Next image
function nextImage() {
    showImage(currentIndex + 1);
}

// Previous image
function previousImage() {
    showImage(currentIndex - 1);
}

// Show grid view
function showGridView() {
    isGridView = true;
    document.getElementById('slideshow-container').style.display = 'none';
    document.getElementById('grid-view').style.display = 'flex';

    // Populate grid
    const gridContainer = document.getElementById('grid-container');
    gridContainer.innerHTML = '';

    images.forEach((image, index) => {
        const gridItem = document.createElement('div');
        gridItem.className = 'grid-item';
        gridItem.innerHTML = `
            <img src="/images/${image.filename}" alt="${image.name}">
            <div class="grid-item-name">${image.name}</div>
        `;

        // Click to go to that image in slideshow
        gridItem.addEventListener('click', () => {
            showImage(index);
            hideGridView();
        });

        gridContainer.appendChild(gridItem);
    });
}

// Hide grid view
function hideGridView() {
    isGridView = false;
    document.getElementById('grid-view').style.display = 'none';
    document.getElementById('slideshow-container').style.display = 'flex';
}

// Setup control buttons
function setupControls() {
    document.getElementById('prev-btn').addEventListener('click', () => {
        if (isGridView) {
            // From grid, go to last image
            showImage(images.length - 1);
            hideGridView();
        } else {
            previousImage();
        }
    });

    document.getElementById('next-btn').addEventListener('click', () => {
        if (isGridView) {
            // From grid, go to first image
            showImage(0);
            hideGridView();
        } else {
            nextImage();
        }
    });

    document.getElementById('show-grid-btn').addEventListener('click', () => {
        showGridView();
    });

    document.getElementById('back-to-slideshow').addEventListener('click', () => {
        hideGridView();
    });

    // Keyboard controls
    document.addEventListener('keydown', (e) => {
        if (isGridView) {
            if (e.key === 'Escape') {
                hideGridView();
            } else if (e.key === 'ArrowRight' || e.key === ' ') {
                e.preventDefault();
                // From grid, go to first image
                showImage(0);
                hideGridView();
            } else if (e.key === 'ArrowLeft') {
                // From grid, go to last image
                showImage(images.length - 1);
                hideGridView();
            }
            return;
        }

        switch(e.key) {
            case 'ArrowLeft':
                previousImage();
                break;
            case 'ArrowRight':
            case ' ':
                e.preventDefault();
                nextImage();
                break;
            case 'g':
            case 'G':
                showGridView();
                break;
        }
    });
}
