/**
 * Folder Manager JavaScript - Create, view, and delete folders
 */

let folders = [];

// Initialize folder manager
document.addEventListener('DOMContentLoaded', () => {
    loadFolders();
    setupEventHandlers();
});

// Load all folders
async function loadFolders() {
    try {
        folders = await apiCall('/admin/folders');
        displayFolders();
    } catch (error) {
        showNotification('Failed to load folders: ' + error.message, 'error');
    }
}

// Display folders in grid
function displayFolders() {
    const list = document.getElementById('folders-list');
    list.innerHTML = '';

    if (folders.length === 0) {
        list.innerHTML = `
            <div class="no-folders">
                <h2>No folders found</h2>
                <p>Create a folder to organize your images</p>
            </div>
        `;
        return;
    }

    folders.forEach(folder => {
        const card = createFolderCard(folder);
        list.appendChild(card);
    });
}

// Create folder card
function createFolderCard(folder) {
    const card = document.createElement('div');
    card.className = 'folder-card';
    card.dataset.folderId = folder.id;
    card.style.cursor = 'pointer';

    card.innerHTML = `
        <div class="folder-card-header">
            <div class="folder-info">
                <div class="folder-name">${escapeHtml(folder.display_name)}</div>
                <div class="folder-technical-name">${escapeHtml(folder.name)}</div>
            </div>
        </div>
        <div class="folder-stats">
            <div class="stat-item">
                <span class="stat-label">Images</span>
                <span class="stat-value">${folder.image_count}</span>
            </div>
        </div>
        <div class="folder-actions">
            <button class="btn btn-primary btn-sm" onclick="event.stopPropagation(); navigateToFolder('${escapeHtml(folder.name)}')">
                View Images
            </button>
            <button class="btn btn-danger btn-sm" onclick="event.stopPropagation(); deleteFolder(${folder.id}, '${escapeHtml(folder.name)}', ${folder.image_count})">
                Delete
            </button>
        </div>
    `;

    // Make entire card clickable to view images
    card.addEventListener('click', () => {
        navigateToFolder(folder.name);
    });

    return card;
}

// Navigate to image upload page with folder selected
function navigateToFolder(folderName) {
    window.location.href = `/admin/images/manage?folder=${encodeURIComponent(folderName)}`;
}

// Setup event handlers
function setupEventHandlers() {
    // Create folder button
    document.getElementById('create-folder-btn').addEventListener('click', openCreateFolderModal);

    // Confirm create folder button
    document.getElementById('confirm-create-folder-btn').addEventListener('click', createFolder);

    // Enter key in inputs
    document.getElementById('folder-name-input').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') createFolder();
    });

    document.getElementById('folder-display-name-input').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') createFolder();
    });

    // Auto-fill display name from folder name
    document.getElementById('folder-name-input').addEventListener('input', (e) => {
        const displayNameInput = document.getElementById('folder-display-name-input');
        if (!displayNameInput.value || displayNameInput.dataset.autoFilled === 'true') {
            const name = e.target.value;
            const displayName = name.replace(/[_-]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
            displayNameInput.value = displayName;
            displayNameInput.dataset.autoFilled = 'true';
        }
    });

    document.getElementById('folder-display-name-input').addEventListener('input', () => {
        document.getElementById('folder-display-name-input').dataset.autoFilled = 'false';
    });
}

// Open create folder modal
function openCreateFolderModal() {
    document.getElementById('folder-name-input').value = '';
    document.getElementById('folder-display-name-input').value = '';
    document.getElementById('folder-display-name-input').dataset.autoFilled = 'true';
    document.getElementById('create-folder-modal').style.display = 'flex';
    document.getElementById('folder-name-input').focus();
}

// Close create folder modal
function closeCreateFolderModal() {
    document.getElementById('create-folder-modal').style.display = 'none';
}

// Create folder
async function createFolder() {
    const nameInput = document.getElementById('folder-name-input');
    const displayNameInput = document.getElementById('folder-display-name-input');

    const name = nameInput.value.trim();
    const displayName = displayNameInput.value.trim();

    if (!name) {
        showNotification('Folder name is required', 'error');
        return;
    }

    // Validate folder name format
    if (!/^[a-zA-Z0-9_\-]+$/.test(name)) {
        showNotification('Invalid folder name. Use only letters, numbers, underscores, and hyphens.', 'error');
        return;
    }

    try {
        const result = await apiCall('/admin/folders', 'POST', {
            name: name,
            display_name: displayName || name
        });

        showNotification('Folder created successfully', 'success');
        closeCreateFolderModal();

        // Redirect to image upload page with this folder selected
        window.location.href = `/admin/images/manage?folder=${encodeURIComponent(name)}`;
    } catch (error) {
        showNotification('Failed to create folder: ' + error.message, 'error');
    }
}

// Delete folder
async function deleteFolder(folderId, folderName, imageCount) {
    if (imageCount > 0) {
        showNotification(`Cannot delete folder "${folderName}" with ${imageCount} images. Delete all images first.`, 'error');
        return;
    }

    if (!confirm(`Are you sure you want to delete the folder "${folderName}"?`)) {
        return;
    }

    try {
        await apiCall(`/admin/folders/${folderId}`, 'DELETE');
        showNotification('Folder deleted successfully', 'success');
        loadFolders();
    } catch (error) {
        showNotification('Failed to delete folder: ' + error.message, 'error');
    }
}

// Escape HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
