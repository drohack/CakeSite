/**
 * Image Manager JavaScript - Upload, rename, delete images
 */

let images = [];
let pendingFile = null;
let pendingFileName = '';

// Initialize image manager
document.addEventListener('DOMContentLoaded', () => {
    loadFolders();
    loadImages();
    setupFileUpload();
    setupDragAndDrop();
    setupClipboardPaste();
    setupFolderFilter();
    setupSyncDatabase();
});

// Load folders and populate dropdown
async function loadFolders() {
    try {
        const folders = await apiCall('/admin/folders');
        const select = document.getElementById('folder-select-upload');
        select.innerHTML = '';

        folders.forEach(folder => {
            const option = document.createElement('option');
            option.value = folder.name;
            option.textContent = `${folder.display_name} (${folder.image_count})`;
            select.appendChild(option);
        });

        // Priority: URL param > Last selected (localStorage) > 'default' folder > First folder
        const urlParams = new URLSearchParams(window.location.search);
        const folderParam = urlParams.get('folder');
        const lastSelectedFolder = localStorage.getItem('lastSelectedFolder');

        if (folderParam) {
            // URL parameter takes priority
            select.value = folderParam;
        } else if (lastSelectedFolder && folders.find(f => f.name === lastSelectedFolder)) {
            // Use last selected folder if it still exists
            select.value = lastSelectedFolder;
        } else {
            // Fall back to 'default' folder if it exists
            const defaultFolder = folders.find(f => f.name === 'default');
            if (defaultFolder) {
                select.value = 'default';
            } else if (folders.length > 0) {
                // Or select first folder if no default
                select.value = folders[0].name;
            }
        }

        // Trigger filter update
        displayImages();
    } catch (error) {
        console.error('Failed to load folders:', error);
        showNotification('Failed to load folders: ' + error.message, 'error');
    }
}

// Load all images
async function loadImages() {
    try {
        images = await apiCall('/admin/images');
        displayImages();
    } catch (error) {
        showNotification('Failed to load images: ' + error.message, 'error');
    }
}

// Display images in grid (filtered by selected folder)
function displayImages() {
    const grid = document.getElementById('images-grid');
    grid.innerHTML = '';

    // Get selected folder
    const selectedFolder = document.getElementById('folder-select-upload').value;

    // Filter images by folder
    const filteredImages = selectedFolder
        ? images.filter(img => img.folder === selectedFolder)
        : images;

    if (filteredImages.length === 0) {
        const message = selectedFolder
            ? `<h2>No images in this folder</h2><p>Upload images to get started</p>`
            : `<h2>Select a folder</h2><p>Choose a folder to view and manage its images</p>`;
        grid.innerHTML = `<div class="no-images">${message}</div>`;
        return;
    }

    filteredImages.forEach(image => {
        const card = createImageCard(image);
        grid.appendChild(card);
    });
}

// Setup folder filter change handler
function setupFolderFilter() {
    const select = document.getElementById('folder-select-upload');
    select.addEventListener('change', () => {
        // Save selected folder to localStorage
        localStorage.setItem('lastSelectedFolder', select.value);
        displayImages();
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
    document.addEventListener('paste', async (e) => {
        // Check for files first (supports multiple file copy from desktop)
        const files = e.clipboardData.files;
        if (files && files.length > 0) {
            e.preventDefault();

            // Filter for image files only
            const imageFiles = Array.from(files).filter(file => file.type.startsWith('image/'));

            if (imageFiles.length === 0) {
                return; // No image files
            }

            if (imageFiles.length === 1) {
                // Single file - show preview modal
                showPreviewModal(imageFiles[0]);
            } else {
                // Multiple files - upload directly
                await uploadMultipleFiles(imageFiles);
            }
            return;
        }

        // Fall back to checking items (for in-browser copy/paste)
        const items = e.clipboardData.items;

        // Check for actual image data
        for (const item of items) {
            if (item.type.indexOf('image') !== -1) {
                const file = item.getAsFile();
                if (file) {
                    e.preventDefault();
                    showPreviewModal(file);
                    return;
                }
            }
        }

        // Check for text (might be a URL)
        for (const item of items) {
            if (item.type === 'text/plain') {
                e.preventDefault();
                item.getAsString(async (text) => {
                    const trimmedText = text.trim();

                    // Check if it looks like a URL
                    if (isImageURL(trimmedText)) {
                        await handleImageURL(trimmedText);
                    }
                });
                break;
            }
        }
    });
}

// Check if text is an image URL
function isImageURL(text) {
    try {
        const url = new URL(text);
        // Check if URL ends with common image extensions
        const imageExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp', '.svg'];
        const pathname = url.pathname.toLowerCase();
        return imageExtensions.some(ext => pathname.endsWith(ext));
    } catch {
        return false;
    }
}

// Handle pasted image URL
async function handleImageURL(url) {
    try {
        showNotification('Downloading image from URL...', 'info');

        // Try client-side fetch first
        try {
            const response = await fetch(url, { mode: 'cors' });
            if (response.ok) {
                const blob = await response.blob();

                // Check if it's actually an image
                if (blob.type.startsWith('image/')) {
                    // Extract filename from URL
                    const urlPath = new URL(url).pathname;
                    const filename = urlPath.split('/').pop().split('?')[0] || 'image.png';

                    // Convert blob to file
                    const file = new File([blob], filename, { type: blob.type });

                    // Show preview modal for renaming
                    showPreviewModal(file);
                    showNotification('Image loaded - you can rename it before uploading', 'success');
                    return;
                }
            }
        } catch (fetchError) {
            // CORS or network error - use server-side download with preview
            console.log('Client-side fetch failed, using server-side download:', fetchError);
        }

        // Fallback: server-side download, then show preview
        await handleImageURLServerSide(url);

    } catch (error) {
        console.error('Failed to load image from URL:', error);
        const errorMsg = error.message || 'Failed to load image from URL';
        alert('URL Upload Failed:\n\n' + errorMsg + '\n\nURL: ' + url);
        showNotification('Failed to load image from URL: ' + errorMsg, 'error');
    }
}

// Handle image URL via server-side download, then show preview
async function handleImageURLServerSide(url) {
    try {
        // Use a special endpoint to download and return the image
        const response = await fetch('/admin/images/proxy-url', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: url })
        });

        if (!response.ok) {
            const result = await response.json();
            throw new Error(result.error || 'Failed to download image');
        }

        // Get the image as blob
        const blob = await response.blob();

        // Extract filename from URL
        const urlPath = new URL(url).pathname;
        const filename = urlPath.split('/').pop().split('?')[0] || 'image.png';

        // Convert blob to file
        const file = new File([blob], filename, { type: blob.type });

        // Show preview modal for renaming
        showPreviewModal(file);
        showNotification('Image downloaded - you can rename it before uploading', 'success');

    } catch (error) {
        console.error('Server-side download error:', error);
        throw error;
    }
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
    showNotification(`Uploading ${files.length} images...`, 'info');
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
            console.error(`Upload failed for ${file.name}:`, error);
        }
    }

    document.getElementById('images-grid').classList.remove('uploading');

    // Show results as toast
    if (failCount === 0) {
        showNotification(`✅ Successfully uploaded ${successCount} image(s)!`, 'success');
    } else {
        showNotification(
            `Uploaded ${successCount}, Failed ${failCount}. Check console for details.`,
            'error'
        );
        console.error('Upload errors:', errors);
    }

    // Reload images
    await loadImages();
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

        showNotification(`Successfully uploaded "${newFileName}"`, 'success');

        // Reload images
        await loadImages();
    } catch (error) {
        showNotification(`Failed to upload: ${error.message}`, 'error');
        console.error('Upload error:', error);
    }
}

// Upload single file
async function uploadSingleFile(file) {
    const folder = document.getElementById('folder-select-upload').value;

    if (!folder) {
        throw new Error('Please select a folder first');
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('folder', folder);

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

// Setup sync database functionality
function setupSyncDatabase() {
    const syncBtn = document.getElementById('sync-database-btn');
    if (syncBtn) {
        syncBtn.addEventListener('click', openSyncModal);
    }

    const applyBtn = document.getElementById('apply-sync-btn');
    if (applyBtn) {
        applyBtn.addEventListener('click', applySyncChanges);
    }
}

// Open sync modal and scan
async function openSyncModal() {
    const modal = document.getElementById('sync-modal');
    const scanningDiv = document.getElementById('sync-scanning');
    const reportDiv = document.getElementById('sync-report');
    const applyBtn = document.getElementById('apply-sync-btn');

    // Show modal and scanning state
    modal.style.display = 'flex';
    scanningDiv.style.display = 'block';
    reportDiv.style.display = 'none';
    applyBtn.style.display = 'none';

    try {
        // Scan filesystem vs database
        const report = await apiCall('/admin/images/sync', 'GET');

        // Hide scanning, show report
        scanningDiv.style.display = 'none';
        reportDiv.style.display = 'block';

        // Generate report HTML
        const reportHTML = generateSyncReport(report);
        reportDiv.innerHTML = reportHTML;

        // Show apply button if there are issues
        if (report.total_issues > 0) {
            applyBtn.style.display = 'inline-block';
        }
    } catch (error) {
        scanningDiv.style.display = 'none';
        reportDiv.style.display = 'block';
        reportDiv.innerHTML = `
            <div class="sync-status warning">
                ❌ Scan Failed
            </div>
            <p style="color: #e74c3c; text-align: center;">
                ${error.message || 'Failed to scan database'}
            </p>
        `;
    }
}

// Close sync modal
function closeSyncModal() {
    document.getElementById('sync-modal').style.display = 'none';
}

// Generate sync report HTML
function generateSyncReport(report) {
    let html = '';

    // Status header
    if (report.total_issues === 0) {
        html += `
            <div class="sync-status success">
                ✅ Everything In Sync!
            </div>
            <p style="text-align: center; color: #ccc; margin-bottom: 20px;">
                ${report.in_sync_count} images and folders are properly synced with the filesystem.
            </p>
        `;
        return html;
    }

    html += `
        <div class="sync-status warning">
            ⚠️ Issues Found: ${report.total_issues}
        </div>
        <p style="text-align: center; color: #ccc; margin-bottom: 20px;">
            Found ${report.in_sync_count} in sync, ${report.total_issues} issues to fix
        </p>
        <div class="sync-issues">
    `;

    // Orphaned database records
    if (report.orphaned_records.length > 0) {
        html += `
            <div class="issue-category">
                <div class="issue-header">
                    ⚠️ Orphaned Database Records
                    <span class="issue-count">${report.orphaned_records.length}</span>
                </div>
                <div class="issue-description">
                    These records exist in the database but files are missing. They will be removed.
                </div>
                <ul class="issue-list">
        `;
        report.orphaned_records.forEach(record => {
            html += `<li>"${record.filename}" in folder "${record.folder}"</li>`;
        });
        html += `
                </ul>
            </div>
        `;
    }

    // Orphaned files
    if (report.orphaned_files.length > 0) {
        html += `
            <div class="issue-category">
                <div class="issue-header">
                    📁 Orphaned Files
                    <span class="issue-count">${report.orphaned_files.length}</span>
                </div>
                <div class="issue-description">
                    These files exist but are not in the database. They will be added and set to Active.
                </div>
                <ul class="issue-list">
        `;
        report.orphaned_files.forEach(file => {
            html += `<li>"${file.filename}" in folder "${file.folder}"</li>`;
        });
        html += `
                </ul>
            </div>
        `;
    }

    // Missing folders
    if (report.missing_folders.length > 0) {
        html += `
            <div class="issue-category">
                <div class="issue-header">
                    🗂️ Missing Folders
                    <span class="issue-count">${report.missing_folders.length}</span>
                </div>
                <div class="issue-description">
                    These directories exist but have no folder record. Folder records will be created.
                </div>
                <ul class="issue-list">
        `;
        report.missing_folders.forEach(folder => {
            html += `<li>"${folder.name}" (${folder.image_count} images)</li>`;
        });
        html += `
                </ul>
            </div>
        `;
    }

    html += `
        </div>
        <div class="sync-note">
            ℹ️ Note: All new images will be set to Active. No existing images will be modified.
        </div>
    `;

    return html;
}

// Apply sync changes
async function applySyncChanges() {
    const applyBtn = document.getElementById('apply-sync-btn');
    const reportDiv = document.getElementById('sync-report');

    // Disable button
    applyBtn.disabled = true;
    applyBtn.textContent = 'Applying...';

    try {
        const result = await apiCall('/admin/images/sync', 'POST');

        // Show success
        reportDiv.innerHTML = `
            <div class="sync-status success">
                ✅ Sync Complete!
            </div>
            <p style="text-align: center; color: #ccc; margin-bottom: 20px;">
                Database successfully synced with filesystem!
            </p>
            <div class="sync-issues">
                <div style="text-align: center; padding: 20px;">
                    <p style="color: #fff; margin-bottom: 10px;"><strong>Changes applied:</strong></p>
                    <p style="color: #ccc;">• ${result.removed_records} orphaned records removed</p>
                    <p style="color: #ccc;">• ${result.added_files} new images added</p>
                    <p style="color: #ccc;">• ${result.created_folders} folder records created</p>
                </div>
            </div>
            <div class="sync-note">
                🎉 Your database is now in sync!
            </div>
        `;

        // Hide apply button
        applyBtn.style.display = 'none';

        // Reload images and folders
        await loadFolders();
        await loadImages();

        showNotification('Database synced successfully!', 'success');
    } catch (error) {
        reportDiv.innerHTML = `
            <div class="sync-status warning">
                ❌ Sync Failed
            </div>
            <p style="color: #e74c3c; text-align: center;">
                ${error.message || 'Failed to apply changes'}
            </p>
        `;
        applyBtn.disabled = false;
        applyBtn.textContent = 'Apply Changes';
        showNotification('Failed to sync database: ' + error.message, 'error');
    }
}

// Make functions global for onclick handlers
window.closeSyncModal = closeSyncModal;
