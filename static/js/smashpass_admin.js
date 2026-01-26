/**
 * Smash or Pass Admin JavaScript - Admin control panel
 */

let currentSession = null;
let currentSessionId = null;
let currentImage = null;

// Center notification for admin page
function showNotificationCenter(message, type = 'info') {
    showNotification(message, type, 'top-center');
}

// Initialize admin panel
document.addEventListener('DOMContentLoaded', () => {
    // Initialize socket
    initializeSocket();

    // Setup button handlers
    setupButtonHandlers();

    // Setup socket listeners
    setupSocketListeners();

    // Auto-generate QR code on load
    loadQRCode();

    // Check for existing session
    checkCurrentSession();

    // Auto-refresh results every 2 seconds when viewing current image
    setInterval(() => {
        if (currentSessionId && currentImage) {
            loadCurrentImage();
        }
    }, 2000);
});

// Load QR code on page load
async function loadQRCode() {
    try {
        const result = await apiCall('/smashpass/qr');
        // Load into both QR locations
        document.getElementById('sp-qr-image-main').src = result.qr_code;
        document.getElementById('sp-qr-url-main').textContent = result.url;
        document.getElementById('sp-qr-image').src = result.qr_code;
        document.getElementById('sp-qr-url').textContent = result.url;
    } catch (error) {
        console.error('Failed to load QR code:', error);
    }
}

// Setup button handlers
function setupButtonHandlers() {
    // Create Session (auto-starts)
    document.getElementById('create-session').addEventListener('click', async () => {
        try {
            const result = await apiCall('/smashpass/session/create', 'POST');
            currentSession = result.session;
            currentSessionId = result.session.id;
            showNotificationCenter(`Session started with ${result.total_images} images`, 'success');

            // Hide initial QR, show main content
            document.getElementById('sp-initial-qr').style.display = 'none';
            document.getElementById('sp-main-content').style.display = 'grid';

            updateSessionStatus();
            updateButtonStates();
            loadCurrentImage();
        } catch (error) {
            showNotificationCenter('Failed to create session: ' + error.message, 'error');
        }
    });

    // Next Image
    document.getElementById('next-image').addEventListener('click', async () => {
        if (!currentSessionId) return;
        try {
            const result = await apiCall(`/smashpass/session/${currentSessionId}/next`, 'POST');
            currentSession = result.session;

            if (result.completed) {
                showNotificationCenter('Session completed!', 'success');
                document.getElementById('sp-main-content').style.display = 'none';
                updateSessionStatus();
                updateButtonStates();
                // Auto-show final results
                setTimeout(() => loadFinalResults(), 500);
            } else {
                showNotificationCenter('Moved to next image', 'success');
                loadCurrentImage();
                updateSessionStatus();
                updateButtonStates();
            }
        } catch (error) {
            showNotificationCenter('Failed to move to next image: ' + error.message, 'error');
        }
    });
}

// Check for existing session
async function checkCurrentSession() {
    try {
        const result = await apiCall('/smashpass/session/current');
        currentSession = result.session;
        currentSessionId = result.session.id;
        currentImage = result.current_image;

        updateSessionStatus();
        updateButtonStates();

        if (currentImage) {
            displayCurrentImage(currentImage);
        }
    } catch (error) {
        // No active session, which is fine
        console.log('No active session');
    }
}

// Update session status display
function updateSessionStatus() {
    const statusInfo = document.getElementById('status-info');
    const progressCounter = document.getElementById('progress-counter');

    if (!currentSession) {
        statusInfo.textContent = 'No active session';
        progressCounter.textContent = '0 / 0';
        return;
    }

    const status = currentSession.status.charAt(0).toUpperCase() + currentSession.status.slice(1);
    const imageOrder = currentSession.image_order || [];
    const totalImages = imageOrder.length;
    const currentIndex = currentSession.current_image_index + 1;

    statusInfo.textContent = `Session #${currentSession.id} - ${status} - ${currentSession.started_at ? 'Started: ' + formatDateTime(currentSession.started_at) : 'Not started'}`;
    progressCounter.textContent = `${currentIndex} / ${totalImages}`;
}

// Update button states
function updateButtonStates() {
    const createBtn = document.getElementById('create-session');
    const nextBtn = document.getElementById('next-image');

    if (!currentSession) {
        createBtn.disabled = false;
        nextBtn.disabled = true;
        return;
    }

    switch (currentSession.status) {
        case 'active':
            createBtn.disabled = true;
            nextBtn.disabled = false;
            break;
        case 'completed':
            createBtn.disabled = false;
            nextBtn.disabled = true;
            break;
        default:
            createBtn.disabled = true;
            nextBtn.disabled = true;
    }
}

// Load and display current image
async function loadCurrentImage() {
    if (!currentSessionId) return;

    try {
        const result = await apiCall('/smashpass/session/current');
        currentImage = result.current_image;

        if (currentImage) {
            displayCurrentImage(currentImage);
        } else {
            // No current image (session completed or not started)
            document.getElementById('sp-main-content').style.display = 'none';
        }

        // Update session info
        if (result.session) {
            currentSession = result.session;
            updateSessionStatus();
            updateButtonStates();
        }
    } catch (error) {
        console.error('Failed to load current image:', error);
        document.getElementById('sp-main-content').style.display = 'none';
    }
}

// Display current image and results
function displayCurrentImage(imageData) {
    // Hide initial QR, show main content
    document.getElementById('sp-initial-qr').style.display = 'none';
    const displaySection = document.getElementById('sp-main-content');
    displaySection.style.display = 'grid';

    document.getElementById('current-name').textContent = imageData.name;
    document.getElementById('current-sp-image').src = `/images/${imageData.filename}`;

    // Update vote counts
    const totalVotes = imageData.smash_count + imageData.pass_count;
    const smashPercent = totalVotes > 0 ? (imageData.smash_count / totalVotes * 100) : 0;
    const passPercent = totalVotes > 0 ? (imageData.pass_count / totalVotes * 100) : 0;

    document.getElementById('smash-count').textContent = imageData.smash_count;
    document.getElementById('pass-count').textContent = imageData.pass_count;
    document.getElementById('total-votes').textContent = totalVotes;

    // Update vertical bars (height instead of width)
    document.getElementById('smash-bar').style.height = smashPercent + '%';
    document.getElementById('pass-bar').style.height = passPercent + '%';
}

// Load and display final results
async function loadFinalResults() {
    if (!currentSessionId) {
        console.error('No current session ID');
        return;
    }

    console.log('Loading final results for session', currentSessionId);

    try {
        const results = await apiCall(`/smashpass/session/${currentSessionId}/results`);
        console.log('Results loaded:', results);

        // Display smashes
        const smashList = document.getElementById('smashes-list');
        smashList.innerHTML = '';

        if (results.smashes.length === 0) {
            smashList.innerHTML = '<p>No smashes</p>';
        } else {
            results.smashes.forEach(img => {
                const card = createResultCard(img, 'smash');
                smashList.appendChild(card);
            });
        }

        // Display passes
        const passList = document.getElementById('passes-list');
        passList.innerHTML = '';

        if (results.passes.length === 0) {
            passList.innerHTML = '<p>No passes</p>';
        } else {
            results.passes.forEach(img => {
                const card = createResultCard(img, 'pass');
                passList.appendChild(card);
            });
        }

        // Hide main content and progress, show results page
        document.getElementById('sp-main-content').style.display = 'none';
        document.getElementById('sp-progress').style.display = 'none';
        document.getElementById('sp-initial-qr').style.display = 'none';
        document.getElementById('sp-results-page').style.display = 'block';

        console.log('Results page displayed');
    } catch (error) {
        console.error('Failed to load results:', error);
        showNotificationCenter('Failed to load results: ' + error.message, 'error');
    }
}

// Create result card
function createResultCard(imageData, type) {
    const card = document.createElement('div');
    card.className = 'result-card';
    card.innerHTML = `
        <img src="/images/${imageData.filename}" alt="${imageData.name}">
        <div class="name">${imageData.name}</div>
        <div class="votes">
            🔥 ${imageData.smash_count} | 👎 ${imageData.pass_count}
        </div>
    `;
    return card;
}

// Setup socket listeners
function setupSocketListeners() {
    socket.emit('join_smashpass');

    socket.on('smashpass_started', (data) => {
        showNotificationCenter('Session has started!', 'info');
        checkCurrentSession();
    });

    socket.on('smashpass_next_image', (data) => {
        showNotificationCenter('Moved to next image', 'info');
        loadCurrentImage();
    });

    socket.on('smashpass_completed', (data) => {
        showNotificationCenter('Session completed!', 'info');
        checkCurrentSession();
    });

    socket.on('smashpass_vote_update', (data) => {
        // Update current image display if it matches
        if (currentImage && data.image_id === currentImage.id) {
            currentImage.smash_count = data.smash_count;
            currentImage.pass_count = data.pass_count;
            displayCurrentImage(currentImage);
        }
    });
}
