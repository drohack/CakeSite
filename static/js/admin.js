/**
 * Admin panel JavaScript - Handles admin functionality
 */

let currentPoll = null;
let currentPollId = null;

// Initialize admin panel
document.addEventListener('DOMContentLoaded', () => {
    // Initialize socket
    initializeSocket();

    // Setup tab switching
    setupTabs();

    // Load images
    loadImages();

    // Setup button handlers
    setupButtonHandlers();

    // Setup socket listeners
    setupSocketListeners();

    // Check for existing poll
    checkCurrentPoll();

    // Auto-refresh current group results every 3 seconds when on results tab
    setInterval(() => {
        const resultsTab = document.getElementById('results-tab');
        const currentResults = document.getElementById('current-results');
        if (resultsTab.classList.contains('active') &&
            currentResults.classList.contains('active') &&
            currentPollId) {
            loadCurrentGroupResults();
        }
    }, 3000);
});

// Tab switching
function setupTabs() {
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const tabName = button.dataset.tab;

            // Remove active class from all tabs
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));

            // Add active class to clicked tab
            button.classList.add('active');
            document.getElementById(`${tabName}-tab`).classList.add('active');
        });
    });

    // Results toggle buttons
    const resultButtons = document.querySelectorAll('.result-btn');
    const resultSections = document.querySelectorAll('.results-section');

    resultButtons.forEach(button => {
        button.addEventListener('click', () => {
            const resultType = button.dataset.result;

            resultButtons.forEach(btn => btn.classList.remove('active'));
            resultSections.forEach(section => section.classList.remove('active'));

            button.classList.add('active');
            document.getElementById(`${resultType}-results`).classList.add('active');

            // Load appropriate results
            if (resultType === 'current') {
                loadCurrentGroupResults();
            } else {
                loadCumulativeResults();
            }
        });
    });
}

// Load all images
async function loadImages() {
    try {
        const images = await apiCall('/admin/images');
        displayImages(images);
    } catch (error) {
        showNotification('Failed to load images: ' + error.message, 'error');
    }
}

// Display images in grid
function displayImages(images) {
    const grid = document.getElementById('images-grid');
    grid.innerHTML = '';

    if (images.length === 0) {
        grid.innerHTML = '<p>No images found. Add images to the images/ folder.</p>';
        return;
    }

    images.forEach(image => {
        const card = document.createElement('div');
        card.className = 'image-card';
        card.innerHTML = `
            <img src="/images/${image.filename}" alt="${image.filename}">
            <div class="image-overlay">
                <span class="filename" title="${image.filename}">${image.filename}</span>
                <button class="toggle-btn ${image.is_active ? 'active' : 'inactive'}"
                        data-image-id="${image.id}">
                    ${image.is_active ? 'Active' : 'Inactive'}
                </button>
            </div>
        `;

        // Add toggle handler
        const toggleBtn = card.querySelector('.toggle-btn');
        toggleBtn.addEventListener('click', () => toggleImage(image.id, toggleBtn));

        grid.appendChild(card);
    });
}

// Toggle image active status
async function toggleImage(imageId, button) {
    try {
        const result = await apiCall(`/admin/images/${imageId}/toggle`, 'POST');
        button.className = `toggle-btn ${result.is_active ? 'active' : 'inactive'}`;
        button.textContent = result.is_active ? 'Active' : 'Inactive';
        showNotification(`Image ${result.is_active ? 'activated' : 'deactivated'}`, 'success');
    } catch (error) {
        showNotification('Failed to toggle image: ' + error.message, 'error');
    }
}

// Setup button handlers
function setupButtonHandlers() {
    // Generate QR Code
    document.getElementById('generate-qr').addEventListener('click', async () => {
        try {
            const result = await apiCall('/admin/qr');
            document.getElementById('qr-image').src = result.qr_code;
            document.getElementById('qr-url').textContent = result.url;
            document.getElementById('qr-display').style.display = 'block';
            showNotification('QR code generated', 'success');
        } catch (error) {
            showNotification('Failed to generate QR code: ' + error.message, 'error');
        }
    });

    // Create Poll
    document.getElementById('create-poll').addEventListener('click', async () => {
        try {
            const result = await apiCall('/admin/poll/create', 'POST');
            currentPoll = result.poll;
            currentPollId = result.poll.id;
            showNotification(`Poll created with ${result.groups_created} groups`, 'success');
            updatePollStatus();
            updateButtonStates();
        } catch (error) {
            showNotification('Failed to create poll: ' + error.message, 'error');
        }
    });

    // Start Poll
    document.getElementById('start-poll').addEventListener('click', async () => {
        if (!currentPollId) return;
        try {
            const result = await apiCall(`/admin/poll/${currentPollId}/start`, 'POST');
            currentPoll = result;
            showNotification('Poll started!', 'success');
            updatePollStatus();
            updateButtonStates();
            loadCurrentGroup();
        } catch (error) {
            showNotification('Failed to start poll: ' + error.message, 'error');
        }
    });

    // Next Group
    document.getElementById('next-group').addEventListener('click', async () => {
        if (!currentPollId) return;
        try {
            const result = await apiCall(`/admin/poll/${currentPollId}/next-group`, 'POST');
            currentPoll = result;
            showNotification('Moved to next group', 'success');
            updatePollStatus();
            loadCurrentGroup();
        } catch (error) {
            showNotification('Failed to move to next group: ' + error.message, 'error');
        }
    });

    // End Poll
    document.getElementById('end-poll').addEventListener('click', async () => {
        if (!currentPollId) return;
        if (!confirm('Are you sure you want to end this poll?')) return;
        try {
            const result = await apiCall(`/admin/poll/${currentPollId}/end`, 'POST');
            currentPoll = result;
            showNotification('Poll ended', 'success');
            updatePollStatus();
            updateButtonStates();
        } catch (error) {
            showNotification('Failed to end poll: ' + error.message, 'error');
        }
    });
}

// Check for existing poll
async function checkCurrentPoll() {
    try {
        const result = await apiCall('/admin/poll/current');
        currentPoll = result.poll;
        currentPollId = result.poll.id;
        updatePollStatus();
        updateButtonStates();
        if (result.current_group) {
            displayCurrentGroup(result.current_group);
        }
    } catch (error) {
        // No active poll, which is fine
        console.log('No active poll');
    }
}

// Update poll status display
function updatePollStatus() {
    const statusInfo = document.getElementById('status-info');
    if (!currentPoll) {
        statusInfo.innerHTML = '<p>No active poll</p>';
        return;
    }

    const status = currentPoll.status.charAt(0).toUpperCase() + currentPoll.status.slice(1);
    statusInfo.innerHTML = `
        <p><strong>Poll ID:</strong> ${currentPoll.id}</p>
        <p><strong>Status:</strong> ${status}</p>
        <p><strong>Current Group:</strong> ${currentPoll.current_group + 1} / ${currentPoll.total_groups}</p>
        <p><strong>Started:</strong> ${formatDateTime(currentPoll.started_at)}</p>
        ${currentPoll.ended_at ? `<p><strong>Ended:</strong> ${formatDateTime(currentPoll.ended_at)}</p>` : ''}
    `;
}

// Update button states based on poll status
function updateButtonStates() {
    const createBtn = document.getElementById('create-poll');
    const startBtn = document.getElementById('start-poll');
    const nextBtn = document.getElementById('next-group');
    const endBtn = document.getElementById('end-poll');

    if (!currentPoll) {
        createBtn.disabled = false;
        startBtn.disabled = true;
        nextBtn.disabled = true;
        endBtn.disabled = true;
        return;
    }

    switch (currentPoll.status) {
        case 'setup':
            createBtn.disabled = true;
            startBtn.disabled = false;
            nextBtn.disabled = true;
            endBtn.disabled = true;
            break;
        case 'active':
            createBtn.disabled = true;
            startBtn.disabled = true;
            nextBtn.disabled = (currentPoll.current_group + 1 >= currentPoll.total_groups);
            endBtn.disabled = false;
            break;
        case 'ended':
            createBtn.disabled = false;
            startBtn.disabled = true;
            nextBtn.disabled = true;
            endBtn.disabled = true;
            break;
    }
}

// Load and display current group
async function loadCurrentGroup() {
    if (!currentPollId) return;
    try {
        const result = await apiCall('/admin/poll/current');
        if (result.current_group) {
            displayCurrentGroup(result.current_group);
        }
    } catch (error) {
        console.error('Failed to load current group:', error);
    }
}

// Display current group images
function displayCurrentGroup(groupData) {
    const container = document.getElementById('group-images');
    const submissionsDiv = document.getElementById('group-submissions');

    container.innerHTML = '';
    groupData.images.forEach(image => {
        const img = document.createElement('img');
        img.src = `/images/${image.filename}`;
        img.className = 'group-image-preview';
        img.alt = image.filename;
        container.appendChild(img);
    });

    submissionsDiv.textContent = `Submissions: ${groupData.submission_count || 0}`;
}

// Load current group results
async function loadCurrentGroupResults() {
    if (!currentPollId) return;
    try {
        const results = await apiCall(`/admin/poll/${currentPollId}/results/current`);
        displayResults(results, 'current-results-display');
    } catch (error) {
        document.getElementById('current-results-display').innerHTML =
            '<p>No results available yet.</p>';
    }
}

// Load cumulative results
async function loadCumulativeResults() {
    if (!currentPollId) return;
    try {
        const results = await apiCall(`/admin/poll/${currentPollId}/results/cumulative`);
        displayResults(results, 'cumulative-results-display');
    } catch (error) {
        document.getElementById('cumulative-results-display').innerHTML =
            '<p>No results available yet.</p>';
    }
}

// Display results
function displayResults(data, containerId) {
    const container = document.getElementById(containerId);
    container.innerHTML = '';

    if (!data || !data.results || data.results.length === 0) {
        container.innerHTML = '<p>No results available.</p>';
        return;
    }

    container.innerHTML = `<p><strong>Total Submissions:</strong> ${data.total_submissions}</p>`;

    data.results.forEach(result => {
        const resultDiv = document.createElement('div');
        resultDiv.className = 'result-item';
        resultDiv.innerHTML = `
            <div class="result-item-header">
                <img src="/images/${result.filename}" alt="${result.filename}">
                <h4>${result.filename}</h4>
            </div>
            <div class="result-bars">
                <div class="result-bar">
                    <span class="result-label">💍 Marry:</span>
                    <div class="bar-container">
                        <div class="bar-fill marry" style="width: ${result.marry_pct}%">
                            ${result.marry} (${result.marry_pct}%)
                        </div>
                    </div>
                </div>
                <div class="result-bar">
                    <span class="result-label">🔥 F:</span>
                    <div class="bar-container">
                        <div class="bar-fill f" style="width: ${result.f_pct}%">
                            ${result.f} (${result.f_pct}%)
                        </div>
                    </div>
                </div>
                <div class="result-bar">
                    <span class="result-label">💀 Kill:</span>
                    <div class="bar-container">
                        <div class="bar-fill kill" style="width: ${result.kill_pct}%">
                            ${result.kill} (${result.kill_pct}%)
                        </div>
                    </div>
                </div>
            </div>
        `;
        container.appendChild(resultDiv);
    });
}

// Setup socket listeners
function setupSocketListeners() {
    socket.on('poll_started', (data) => {
        showNotification('Poll has started!', 'info');
        checkCurrentPoll();
    });

    socket.on('group_changed', (data) => {
        showNotification('Moved to next group', 'info');
        checkCurrentPoll();
    });

    socket.on('poll_ended', (data) => {
        showNotification('Poll has ended', 'info');
        checkCurrentPoll();
    });

    socket.on('results_updated', (data) => {
        // Refresh current group display if on poll control tab
        const pollTab = document.getElementById('poll-tab');
        if (pollTab.classList.contains('active')) {
            loadCurrentGroup();
        }

        // Refresh results if on results tab
        const resultsTab = document.getElementById('results-tab');
        const currentResults = document.getElementById('current-results');
        if (resultsTab.classList.contains('active') && currentResults.classList.contains('active')) {
            loadCurrentGroupResults();
        }
    });
}
