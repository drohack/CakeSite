/**
 * Admin panel JavaScript - Handles admin functionality
 */

let currentPoll = null;
let currentPollId = null;

// Center notification for admin page
function showNotificationCenter(message, type = 'info') {
    showNotification(message, type, 'top-center');
}

// Initialize admin panel
document.addEventListener('DOMContentLoaded', () => {
    // Initialize socket
    initializeSocket();

    // Setup tab switching
    setupTabs();

    // Load images
    loadImages();

    // Load S/P sessions dropdown
    loadSPSessionsDropdown();

    // Setup image bulk controls
    setupImageBulkControls();

    // Auto-load QR code
    loadQRCode();

    // Setup button handlers
    setupButtonHandlers();

    // Setup socket listeners
    setupSocketListeners();

    // Check for existing poll
    checkCurrentPoll();

    // Auto-refresh only active content
    setInterval(() => {
        const pollTab = document.getElementById('poll-tab');

        // Only refresh live results on poll tab if poll is active
        if (pollTab.classList.contains('active') && currentPollId && currentPoll && currentPoll.status === 'active') {
            loadCurrentGroup();
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

            // Load polls if switching to results tab
            if (tabName === 'results') {
                loadPollsDropdown();
            }
        });
    });

    // Setup poll dropdown
    const pollSelect = document.getElementById('poll-select');
    if (pollSelect) {
        pollSelect.addEventListener('change', (e) => {
            const selectedPollId = parseInt(e.target.value);
            if (selectedPollId) {
                loadPollResults(selectedPollId);
            }
        });
    }
}

// Load all images
async function loadImages() {
    try {
        const images = await apiCall('/admin/images');
        displayImages(images);
    } catch (error) {
        showNotificationCenter('Failed to load images: ' + error.message, 'error');
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
        showNotificationCenter(`Image ${result.is_active ? 'activated' : 'deactivated'}`, 'success');
    } catch (error) {
        showNotificationCenter('Failed to toggle image: ' + error.message, 'error');
    }
}

// Setup image bulk controls
function setupImageBulkControls() {
    document.getElementById('enable-all').addEventListener('click', async () => {
        await setAllImagesActive(true);
    });

    document.getElementById('disable-all').addEventListener('click', async () => {
        await setAllImagesActive(false);
    });

    document.getElementById('load-sp-session').addEventListener('click', async () => {
        const sessionId = document.getElementById('sp-session-load').value;
        if (!sessionId) {
            showNotificationCenter('Please select a session', 'error');
            return;
        }
        await loadSPSessionToImages(parseInt(sessionId));
    });
}

// Set all images active or inactive
async function setAllImagesActive(isActive) {
    try {
        const images = await apiCall('/admin/images');
        let count = 0;

        for (const image of images) {
            if (image.is_active !== isActive) {
                await apiCall(`/admin/images/${image.id}/toggle`, 'POST');
                count++;
            }
        }

        showNotificationCenter(`${count} images ${isActive ? 'enabled' : 'disabled'}`, 'success');
        loadImages(); // Reload to update UI
    } catch (error) {
        showNotificationCenter('Failed to update images: ' + error.message, 'error');
    }
}

// Load S/P sessions dropdown
async function loadSPSessionsDropdown() {
    try {
        const sessions = await apiCall('/smashpass/sessions/all');
        const select = document.getElementById('sp-session-load');
        select.innerHTML = '<option value="">Select session...</option>';

        sessions.forEach(session => {
            const option = document.createElement('option');
            option.value = session.id;
            const status = session.status.charAt(0).toUpperCase() + session.status.slice(1);
            const date = session.started_at ? new Date(session.started_at).toLocaleString() : 'Not started';
            option.textContent = `Session #${session.id} - ${status} - ${date}`;
            select.appendChild(option);
        });
    } catch (error) {
        console.error('Failed to load S/P sessions:', error);
    }
}

// Load S/P session results and apply to images
async function loadSPSessionToImages(sessionId) {
    try {
        const results = await apiCall(`/smashpass/session/${sessionId}/results`);
        const images = await apiCall('/admin/images');

        let enabledCount = 0;
        let disabledCount = 0;

        // Create map of filenames to image IDs
        const imageMap = {};
        images.forEach(img => {
            imageMap[img.filename] = img.id;
        });

        // Enable smashes, disable passes
        for (const smash of results.smashes) {
            const imageId = imageMap[smash.filename];
            if (imageId) {
                const image = images.find(i => i.id === imageId);
                if (image && !image.is_active) {
                    await apiCall(`/admin/images/${imageId}/toggle`, 'POST');
                    enabledCount++;
                }
            }
        }

        for (const pass of results.passes) {
            const imageId = imageMap[pass.filename];
            if (imageId) {
                const image = images.find(i => i.id === imageId);
                if (image && image.is_active) {
                    await apiCall(`/admin/images/${imageId}/toggle`, 'POST');
                    disabledCount++;
                }
            }
        }

        showNotificationCenter(`Loaded: ${enabledCount} smashes enabled, ${disabledCount} passes disabled`, 'success');
        loadImages(); // Reload to update UI
    } catch (error) {
        showNotificationCenter('Failed to load S/P results: ' + error.message, 'error');
    }
}

// Load QR code on page load
async function loadQRCode() {
    try {
        const result = await apiCall('/admin/qr');
        // Load into both QR locations
        const qrImageMain = document.getElementById('qr-image-initial');
        const qrUrlMain = document.getElementById('qr-url-initial');
        const qrImage = document.getElementById('qr-image');
        const qrUrl = document.getElementById('qr-url');

        if (qrImageMain) {
            qrImageMain.src = result.qr_code;
            qrUrlMain.textContent = result.url;
        }
        if (qrImage) {
            qrImage.src = result.qr_code;
            qrUrl.textContent = result.url;
        }
    } catch (error) {
        console.error('Failed to load QR code:', error);
    }
}

// Setup button handlers
function setupButtonHandlers() {
    // Create Poll (auto-starts)
    document.getElementById('create-poll').addEventListener('click', async () => {
        try {
            const result = await apiCall('/admin/poll/create', 'POST');
            currentPoll = result.poll;
            currentPollId = result.poll.id;

            // Auto-start the poll
            const startResult = await apiCall(`/admin/poll/${currentPollId}/start`, 'POST');
            currentPoll = startResult;

            // Switch to poll tab if not already there
            const pollTab = document.querySelector('[data-tab="poll"]');
            if (pollTab && !pollTab.classList.contains('active')) {
                pollTab.click();
            }

            showNotificationCenter(`Poll started with ${result.groups_created} groups`, 'success');
            updatePollStatus();
            updateButtonStates();

            await loadCurrentGroup();
        } catch (error) {
            console.error('Error creating poll:', error);
            showNotificationCenter('Failed to create poll: ' + error.message, 'error');
        }
    });

    // Next Group
    document.getElementById('next-group').addEventListener('click', async () => {
        if (!currentPollId) return;
        try {
            const result = await apiCall(`/admin/poll/${currentPollId}/next-group`, 'POST');
            currentPoll = result;
            showNotificationCenter('Moved to next group', 'success');
            updatePollStatus();
            loadCurrentGroup();
        } catch (error) {
            showNotificationCenter('Failed to move to next group: ' + error.message, 'error');
        }
    });

    // End Poll
    document.getElementById('end-poll').addEventListener('click', async () => {
        if (!currentPollId) return;
        if (!confirm('Are you sure you want to end this poll?')) return;
        try {
            const result = await apiCall(`/admin/poll/${currentPollId}/end`, 'POST');
            currentPoll = result;
            showNotificationCenter('Poll ended', 'success');
            updatePollStatus();
            updateButtonStates();
        } catch (error) {
            showNotificationCenter('Failed to end poll: ' + error.message, 'error');
        }
    });
}

// Check for existing poll
async function checkCurrentPoll() {
    try {
        const response = await fetch('/admin/poll/current');
        if (!response.ok) {
            // No active poll, which is fine
            return;
        }
        const result = await response.json();
        currentPoll = result.poll;
        currentPollId = result.poll.id;
        updatePollStatus();
        updateButtonStates();
        if (result.current_group) {
            displayCurrentGroup(result.current_group);
        }
    } catch (error) {
        // No active poll, which is fine
    }
}

// Update poll status display
function updatePollStatus() {
    const statusInfo = document.getElementById('status-info');
    const progressDisplay = document.getElementById('group-submissions');

    if (!currentPoll) {
        statusInfo.textContent = 'No active poll';
        if (progressDisplay) progressDisplay.textContent = 'Group 0 / 0 - Submissions: 0';
        return;
    }

    const status = currentPoll.status.charAt(0).toUpperCase() + currentPoll.status.slice(1);
    statusInfo.textContent = `Poll #${currentPoll.id} - ${status} - ${currentPoll.started_at ? 'Started: ' + formatDateTime(currentPoll.started_at) : 'Not started'}`;
}

// Update button states based on poll status
function updateButtonStates() {
    const createBtn = document.getElementById('create-poll');
    const nextBtn = document.getElementById('next-group');
    const endBtn = document.getElementById('end-poll');

    if (!currentPoll) {
        createBtn.disabled = false;
        nextBtn.disabled = true;
        endBtn.disabled = true;
        return;
    }

    switch (currentPoll.status) {
        case 'active':
            createBtn.disabled = true;
            nextBtn.disabled = (currentPoll.current_group + 1 >= currentPoll.total_groups);
            endBtn.disabled = false;
            break;
        case 'ended':
            createBtn.disabled = false;
            nextBtn.disabled = true;
            endBtn.disabled = true;
            break;
        default:
            createBtn.disabled = true;
            nextBtn.disabled = true;
            endBtn.disabled = true;
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

// Display current group with live results
async function displayCurrentGroup(groupData) {

    // Hide initial QR, show main content
    document.getElementById('poll-initial-qr').style.display = 'none';
    document.getElementById('poll-main-content').style.display = 'grid';

    const submissionsDiv = document.getElementById('group-submissions');

    // Update bottom progress with group number and submissions
    if (currentPoll) {
        submissionsDiv.textContent = `Group ${currentPoll.current_group + 1} / ${currentPoll.total_groups} - Submissions: ${groupData.submission_count || 0}`;
    } else {
        submissionsDiv.textContent = `Submissions: ${groupData.submission_count || 0}`;
    }

    // Get live results for current group
    try {
        const results = await apiCall(`/admin/poll/${currentPollId}/results/current`);

        // Check if results is null or has no data
        if (!results || !results.results || results.results.length === 0) {
            // No results yet, show empty state with images at 0
            displayLiveResults({
                results: groupData.images.map(img => ({
                    filename: img.filename,
                    marry: 0,
                    f: 0,
                    kill: 0
                }))
            });
        } else {
            displayLiveResults(results);
        }
    } catch (error) {
        // Error getting results, show empty state with images at 0
        displayLiveResults({
            results: groupData.images.map(img => ({
                filename: img.filename,
                marry: 0,
                f: 0,
                kill: 0
            }))
        });
    }
}

// Display live results for current group
function displayLiveResults(resultsData) {
    const container = document.getElementById('poll-results-live');
    if (!container) {
        console.error('poll-results-live container not found!');
        return;
    }

    container.innerHTML = '';

    if (!resultsData || !resultsData.results) {
        console.error('No results data');
        return;
    }

    const results = resultsData.results;

    if (results.length === 0) {
        console.error('Results array is empty!');
        return;
    }

    // Assign unique categories to each image
    const assignments = assignUniqueCategories(results);

    results.forEach((imageResult, index) => {
        const card = document.createElement('div');
        card.className = 'image-result-card';

        // Get assigned category for this image
        const winner = assignments[index];

        // Get image name without extension
        const imageName = imageResult.filename.replace(/\.[^/.]+$/, '');

        // Calculate total for percentage
        const total = imageResult.marry + imageResult.f + imageResult.kill;
        const marryPct = total > 0 ? (imageResult.marry / total * 100) : 0;
        const fPct = total > 0 ? (imageResult.f / total * 100) : 0;
        const killPct = total > 0 ? (imageResult.kill / total * 100) : 0;

        card.innerHTML = `
            <div class="winner-title">${winner}</div>
            <img src="/images/${imageResult.filename}" alt="${imageName}">
            <div class="image-name-label">${imageName}</div>
            <div class="bars-container">
                <div class="vote-column">
                    <div class="label">💍 M</div>
                    <div class="bar">
                        <div class="bar-fill marry-fill" style="height: ${marryPct}%">
                            ${imageResult.marry}
                        </div>
                    </div>
                </div>
                <div class="vote-column">
                    <div class="label">🔥 F</div>
                    <div class="bar">
                        <div class="bar-fill f-fill" style="height: ${fPct}%">
                            ${imageResult.f}
                        </div>
                    </div>
                </div>
                <div class="vote-column">
                    <div class="label">💀 K</div>
                    <div class="bar">
                        <div class="bar-fill kill-fill" style="height: ${killPct}%">
                            ${imageResult.kill}
                        </div>
                    </div>
                </div>
            </div>
        `;

        container.appendChild(card);
    });

}

// Assign unique categories to each image ensuring Marry, Fuck, Kill appear exactly once
function assignUniqueCategories(results) {
    const assignments = ['', '', ''];
    const used = new Set();

    // For each category, find which image has the most votes for it
    const categories = [
        { name: 'marry', label: '💍 Marry', key: 'marry' },
        { name: 'fuck', label: '🔥 Fuck', key: 'f' },
        { name: 'kill', label: '💀 Kill', key: 'kill' }
    ];

    categories.forEach(category => {
        let maxVotes = -1;
        let bestIndex = -1;

        results.forEach((result, index) => {
            if (!used.has(index)) {
                const votes = result[category.key];
                if (votes > maxVotes) {
                    maxVotes = votes;
                    bestIndex = index;
                }
            }
        });

        if (bestIndex !== -1) {
            assignments[bestIndex] = category.label;
            used.add(bestIndex);
        }
    });

    // If any image still unassigned (shouldn't happen with 3 images and 3 categories)
    assignments.forEach((assignment, index) => {
        if (!assignment) {
            // Find which category is not used
            const usedCategories = new Set(assignments.filter(a => a));
            for (let cat of categories) {
                if (!usedCategories.has(cat.label)) {
                    assignments[index] = cat.label;
                    break;
                }
            }
        }
    });

    return assignments;
}

// Load all polls into dropdown
async function loadPollsDropdown() {
    try {
        const polls = await apiCall('/admin/polls/all');
        const select = document.getElementById('poll-select');
        select.innerHTML = '';

        if (polls.length === 0) {
            select.innerHTML = '<option value="">No polls found</option>';
            return;
        }

        polls.forEach((poll, index) => {
            const option = document.createElement('option');
            option.value = poll.id;
            const status = poll.status.charAt(0).toUpperCase() + poll.status.slice(1);
            const date = poll.started_at ? new Date(poll.started_at).toLocaleString() : 'Not started';
            option.textContent = `Poll #${poll.id} - ${status} - ${date}`;

            if (index === 0) option.selected = true;
            select.appendChild(option);
        });

        // Auto-load the first (most recent) poll
        if (polls.length > 0) {
            loadPollResults(polls[0].id);
        }
    } catch (error) {
        console.error('Failed to load polls:', error);
        document.getElementById('poll-select').innerHTML = '<option value="">Error loading polls</option>';
    }
}

// Load results for a specific poll
async function loadPollResults(pollId) {
    const container = document.getElementById('results-grid-display');
    container.innerHTML = '';

    try {
        const results = await apiCall(`/admin/poll/${pollId}/results/cumulative`);

        if (!results || !results.results || results.results.length === 0) {
            container.innerHTML = '<div class="no-results">No results available for this poll</div>';
            return;
        }

        displayGroupedResults(results);
    } catch (error) {
        console.error('Failed to load poll results:', error);
        container.innerHTML = '<div class="no-results">No results available</div>';
    }
}

// Display results organized by groups
function displayGroupedResults(cumulativeData) {
    const container = document.getElementById('results-grid-display');
    container.innerHTML = '';

    if (!cumulativeData || !cumulativeData.results || cumulativeData.results.length === 0) {
        container.innerHTML = '<div class="no-results">No results available</div>';
        return;
    }

    const results = cumulativeData.results;

    // Organize images by category (which one they won)
    const marryImages = [];
    const fuckImages = [];
    const killImages = [];

    results.forEach(img => {
        if (img.marry >= img.f && img.marry >= img.kill) {
            marryImages.push(img);
        } else if (img.f >= img.kill) {
            fuckImages.push(img);
        } else {
            killImages.push(img);
        }
    });

    // Sort each category by vote count (descending)
    marryImages.sort((a, b) => b.marry - a.marry);
    fuckImages.sort((a, b) => b.f - a.f);
    killImages.sort((a, b) => b.kill - a.kill);

    // Determine how many rows we need
    const maxRows = Math.max(marryImages.length, fuckImages.length, killImages.length);

    // Create rows
    for (let i = 0; i < maxRows; i++) {
        const row = document.createElement('div');
        row.className = 'results-row';

        // Marry cell
        if (i < marryImages.length) {
            row.appendChild(createResultCell(marryImages[i], 'marry'));
        } else {
            row.appendChild(createEmptyCell());
        }

        // Fuck cell
        if (i < fuckImages.length) {
            row.appendChild(createResultCell(fuckImages[i], 'f'));
        } else {
            row.appendChild(createEmptyCell());
        }

        // Kill cell
        if (i < killImages.length) {
            row.appendChild(createResultCell(killImages[i], 'kill'));
        } else {
            row.appendChild(createEmptyCell());
        }

        container.appendChild(row);
    }
}

// Create a result cell
function createResultCell(imageData, category) {
    const cell = document.createElement('div');
    cell.className = 'results-cell';

    const imageName = imageData.filename.replace(/\.[^/.]+$/, '');
    const voteCount = imageData[category];

    cell.innerHTML = `
        <img src="/images/${imageData.filename}" alt="${imageName}">
        <div class="image-name">${imageName}</div>
        <div class="vote-count">${voteCount} votes</div>
    `;

    return cell;
}

// Create empty cell
function createEmptyCell() {
    const cell = document.createElement('div');
    cell.className = 'results-cell';
    cell.innerHTML = '<div class="no-results">-</div>';
    return cell;
}

// Setup socket listeners
function setupSocketListeners() {
    socket.on('poll_started', (data) => {
        showNotificationCenter('Poll has started!', 'info');
        checkCurrentPoll();
    });

    socket.on('group_changed', (data) => {
        showNotificationCenter('Moved to next group', 'info');
        checkCurrentPoll();
    });

    socket.on('poll_ended', (data) => {
        showNotificationCenter('Poll has ended', 'info');
        checkCurrentPoll();
    });

    socket.on('results_updated', (data) => {
        // Refresh current group display if on poll control tab
        const pollTab = document.getElementById('poll-tab');
        if (pollTab.classList.contains('active')) {
            loadCurrentGroup();
        }
    });
}
