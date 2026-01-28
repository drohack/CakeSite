/**
 * Image Manager JavaScript - Upload, rename, delete images
 */

let images = [];
let pendingFile = null;
let pendingFileName = '';

// Initialize image manager
document.addEventListener('DOMContentLoaded', () => {
    loadImages();
    setupFileUpload();
    setupDragAndDrop();
    setupClipboardPaste();
});

// Load all images
async function loadImages() {
    try {
        images = await apiCall('/admin/images');
        displayImages();
    } catch (error) {
        showNotification('Failed to load images: ' + error.message, 'error');
    }
}

// Display images in grid
function displayImages() {
    const grid = document.getElementById('images-grid');
    grid.innerHTML = '';

    if (images.length === 0) {
        grid.innerHTML = '<div class="no-images"><h2>No images found</h2><p>Upload images to get started</p></div>';
        return;
    }

    images.forEach(image => {
        const card = createImageCard(image);
        grid.appendChild(card);
    });
}

// Create image card
function createImageCard(image) {
    const card = document.createElement('div');
    card.className = 'image-card';
    card.dataset.imageId = image.id;

    const imageName = image.filename.replace(/\.[^/.]+$/, ''); // Remove extension

    card.innerHTML = `
        <img src="/images/${image.filename}" alt="${image.filename}">
        <div class="image-info">
            <div class="status-badge ${image.is_active ? 'active' : 'inactive'}">
                ${image.is_active ? 'Active' : 'Inactive'}
            </div>
            <div class="image-name" data-image-id="${image.id}">${imageName}</div>
            <div class="image-actions">
                <button class="btn btn-sm ${image.is_active ? 'btn-secondary' : 'btn-success'}"
                        onclick="toggleImage(${image.id}, this)">
                    ${image.is_active ? 'Disable' : 'Enable'}
                </button>
                <button class="btn btn-sm btn-danger" onclick="deleteImage(${image.id})">
                    Delete
                </button>
            </div>
        </div>
    `;

    // Add click handler for renaming
    const nameDiv = card.querySelector('.image-name');
    nameDiv.addEventListener('click', () => startRename(image.id, imageName));

    return card;
}

// Setup file upload
function setupFileUpload() {
    const fileInput = document.getElementById('file-upload');

    fileInput.addEventListener('change', async (e) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        // If single file, show preview modal
        if (files.length === 1) {
            showPreviewModal(files[0]);
        } else {
            // Multiple files - upload directly with original names
            await uploadMultipleFiles(files);
        }

        // Clear file input
        fileInput.value = '';
    });
}

// Setup drag and drop
function setupDragAndDrop() {
    const dropZone = document.getElementById('drop-zone');

    // Prevent default drag behaviors on entire document
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        document.addEventListener(eventName, (e) => {
            e.preventDefault();
            e.stopPropagation();
        }, false);
    });

    // Highlight drop zone when dragging over
    dropZone.addEventListener('dragenter', (e) => {
        dropZone.classList.add('drag-over');
    });

    dropZone.addEventListener('dragleave', (e) => {
        // Only remove if leaving the container completely
        if (e.target === dropZone) {
            dropZone.classList.remove('drag-over');
        }
    });

    dropZone.addEventListener('drop', async (e) => {
        dropZone.classList.remove('drag-over');

        const files = e.dataTransfer.files;
        if (!files || files.length === 0) return;

        // If single file, show preview modal
        if (files.length === 1) {
            showPreviewModal(files[0]);
        } else {
            // Multiple files - upload directly
            await uploadMultipleFiles(files);
        }
    });
}

// Setup clipboard paste
function setupClipboardPaste() {
    document.addEventListener('paste', (e) => {
        const items = e.clipboardData.items;

        for (const item of items) {
            if (item.type.indexOf('image') !== -1) {
                const file = item.getAsFile();
                if (file) {
                    e.preventDefault();
                    showPreviewModal(file);
                    break;
                }
            }
        }
    });
}

// Show preview modal
function showPreviewModal(file) {
    pendingFile = file;

    // Get original filename without extension
    const originalName = file.name.replace(/\.[^/.]+$/, '');
    pendingFileName = originalName || 'Untitled';

    // Set default name
    document.getElementById('image-name-input').value = pendingFileName;

    // Show preview
    const reader = new FileReader();
    reader.onload = (e) => {
        document.getElementById('preview-image').src = e.target.result;
    };
    reader.readAsDataURL(file);

    // Show modal
    document.getElementById('preview-modal').style.display = 'flex';

    // Focus input and select text
    setTimeout(() => {
        const input = document.getElementById('image-name-input');
        input.focus();
        input.select();
    }, 100);
}

// Close preview modal
function closePreviewModal() {
    document.getElementById('preview-modal').style.display = 'none';
    pendingFile = null;
    pendingFileName = '';
}

// Confirm and upload from modal
document.addEventListener('DOMContentLoaded', () => {
    const confirmBtn = document.getElementById('confirm-upload-btn');
    const nameInput = document.getElementById('image-name-input');

    if (confirmBtn) {
        confirmBtn.addEventListener('click', async () => {
            const customName = nameInput.value.trim();
            if (!customName) {
                alert('Please enter a name for the image');
                return;
            }

            if (pendingFile) {
                await uploadFileWithName(pendingFile, customName);
                closePreviewModal();
            }
        });
    }

    // Allow Enter key to confirm
    if (nameInput) {
        nameInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                confirmBtn.click();
            } else if (e.key === 'Escape') {
                closePreviewModal();
            }
        });
    }
});

// Upload multiple files directly
async function uploadMultipleFiles(files) {
    showUploadStatus('Uploading images...', 'info');
    document.getElementById('images-grid').classList.add('uploading');

    let successCount = 0;
    let failCount = 0;
    const errors = [];

    for (const file of files) {
        try {
            await uploadSingleFile(file);
            successCount++;
        } catch (error) {
            failCount++;
            errors.push(`${file.name}: ${error.message}`);
        }
    }

    // Show results
    if (failCount === 0) {
        showUploadStatus(`Successfully uploaded ${successCount} image(s)`, 'success');
    } else {
        showUploadStatus(
            `Uploaded ${successCount}, Failed ${failCount}. Errors: ${errors.join(', ')}`,
            'error'
        );
    }

    // Reload images
    await loadImages();

    document.getElementById('images-grid').classList.remove('uploading');

    // Hide status after 5 seconds
    setTimeout(() => {
        document.getElementById('upload-status').style.display = 'none';
    }, 5000);
}

// Upload file with custom name
async function uploadFileWithName(file, customName) {
    showUploadStatus('Uploading...', 'info');

    try {
        // Get file extension
        const ext = file.name.split('.').pop();

        // Create new file with custom name
        const newFileName = customName.endsWith(`.${ext}`) ? customName : `${customName}.${ext}`;
        const renamedFile = new File([file], newFileName, { type: file.type });

        await uploadSingleFile(renamedFile);

        showUploadStatus(`Successfully uploaded "${newFileName}"`, 'success');

        // Reload images
        await loadImages();

        setTimeout(() => {
            document.getElementById('upload-status').style.display = 'none';
        }, 3000);
    } catch (error) {
        showUploadStatus(`Failed to upload: ${error.message}`, 'error');
    }
}

// Upload single file
async function uploadSingleFile(file) {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch('/admin/images/upload', {
        method: 'POST',
        body: formData
    });

    if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || 'Upload failed');
    }

    return await response.json();
}

// Show upload status
function showUploadStatus(message, type) {
    const status = document.getElementById('upload-status');
    status.textContent = message;
    status.className = `upload-status ${type}`;
    status.style.display = 'block';
}

// Toggle image active/inactive
async function toggleImage(imageId, button) {
    try {
        const result = await apiCall(`/admin/images/${imageId}/toggle`, 'POST');

        // Update button
        button.className = `btn btn-sm ${result.is_active ? 'btn-secondary' : 'btn-success'}`;
        button.textContent = result.is_active ? 'Disable' : 'Enable';

        // Update badge
        const card = document.querySelector(`[data-image-id="${imageId}"]`);
        const badge = card.querySelector('.status-badge');
        badge.className = `status-badge ${result.is_active ? 'active' : 'inactive'}`;
        badge.textContent = result.is_active ? 'Active' : 'Inactive';

        showNotification(`Image ${result.is_active ? 'enabled' : 'disabled'}`, 'success');
    } catch (error) {
        showNotification('Failed to toggle image: ' + error.message, 'error');
    }
}

// Start renaming an image
function startRename(imageId, currentName) {
    const nameDiv = document.querySelector(`.image-name[data-image-id="${imageId}"]`);

    // Create input field
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'image-name-input';
    input.value = currentName;

    // Replace div with input
    nameDiv.replaceWith(input);
    input.focus();
    input.select();

    // Save on blur or enter
    const saveRename = async () => {
        const newName = input.value.trim();

        if (!newName || newName === currentName) {
            // Cancelled or no change - restore original
            const newNameDiv = document.createElement('div');
            newNameDiv.className = 'image-name';
            newNameDiv.dataset.imageId = imageId;
            newNameDiv.textContent = currentName;
            newNameDiv.addEventListener('click', () => startRename(imageId, currentName));
            input.replaceWith(newNameDiv);
            return;
        }

        try {
            const result = await apiCall(`/admin/images/${imageId}/rename`, 'POST', {
                new_name: newName
            });

            showNotification('Image renamed successfully', 'success');

            // Reload images to reflect changes
            await loadImages();
        } catch (error) {
            showNotification('Failed to rename: ' + error.message, 'error');

            // Restore original name
            const newNameDiv = document.createElement('div');
            newNameDiv.className = 'image-name';
            newNameDiv.dataset.imageId = imageId;
            newNameDiv.textContent = currentName;
            newNameDiv.addEventListener('click', () => startRename(imageId, currentName));
            input.replaceWith(newNameDiv);
        }
    };

    input.addEventListener('blur', saveRename);
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            input.blur();
        } else if (e.key === 'Escape') {
            input.value = currentName;
            input.blur();
        }
    });
}

// Delete image
async function deleteImage(imageId) {
    const image = images.find(img => img.id === imageId);
    if (!image) return;

    if (!confirm(`Are you sure you want to delete "${image.filename}"?\n\nThis cannot be undone.`)) {
        return;
    }

    try {
        await apiCall(`/admin/images/${imageId}/delete`, 'POST');
        showNotification('Image deleted successfully', 'success');

        // Reload images
        await loadImages();
    } catch (error) {
        showNotification('Failed to delete image: ' + error.message, 'error');
    }
}
