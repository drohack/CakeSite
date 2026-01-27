/**
 * Poll page JavaScript - Handles user polling interface
 */

let currentPollData = null;
let currentGroupId = null;
let assignments = {
    marry: null,
    f: null,
    kill: null
};
let selectedImageId = null;
let imageElements = {};

// Initialize poll page
document.addEventListener('DOMContentLoaded', () => {

    // Add debug indicator
    document.querySelector('.waiting-screen p').textContent = 'Loading poll...';

    // Initialize socket
    initializeSocket();

    // Setup socket listeners
    setupSocketListeners();

    // Load current poll
    loadCurrentPoll();

    // Setup submit button
    document.getElementById('submit-btn').addEventListener('click', submitPoll);

    // Setup category buttons
    setupCategoryButtons();
});

// Load current poll
async function loadCurrentPoll() {
    try {
        const result = await apiCall('/poll/current');
        currentPollData = result;
        currentGroupId = result.group.id;

        if (result.has_submitted) {
            // User already submitted, show results
            await loadAndShowResults();
        } else {
            // Show poll interface
            showPollInterface(result.group);
        }
    } catch (error) {
        console.error('Failed to load poll:', error);
        showWaitingScreen('No active poll. Waiting for admin to start...');
    }
}

// Show waiting screen
function showWaitingScreen(message = 'Waiting for poll to start...') {
    document.getElementById('poll-waiting').style.display = 'block';
    document.getElementById('poll-active').style.display = 'none';
    document.getElementById('poll-results').style.display = 'none';
    document.querySelector('.waiting-screen p').textContent = message;
}

// Show poll interface
function showPollInterface(groupData) {

    document.getElementById('poll-waiting').style.display = 'none';
    document.getElementById('poll-waiting-next').style.display = 'none';
    document.getElementById('poll-active').style.display = 'flex';

    // Reset assignments
    assignments = { marry: null, f: null, kill: null };
    selectedImageId = null;
    imageElements = {};

    // Load images as selectable cards
    const container = document.getElementById('images-selection');
    container.innerHTML = '';

    groupData.images.forEach(image => {
        const card = document.createElement('div');
        card.className = 'image-card';
        card.dataset.imageId = image.id;
        card.innerHTML = `
            <img src="/images/${image.filename}" alt="${image.filename}">
            <div class="category-badge" style="display: none;"></div>
        `;

        // Click to select image
        card.addEventListener('click', () => selectImage(image.id));

        imageElements[image.id] = card;
        container.appendChild(card);
    });

    // Reset category buttons
    document.querySelectorAll('.category-btn').forEach(btn => {
        btn.classList.remove('assigned');
        btn.disabled = true;
    });

    updateSubmitButton();
}

// Setup drag and drop (DEPRECATED - using tap selection now)
function setupDragAndDrop_OLD() {
    let draggedElement = null;

    document.addEventListener('dragstart', (e) => {
        if (e.target.classList.contains('draggable-image')) {
            draggedElement = e.target;
            e.target.classList.add('dragging');
        }
    });

    document.addEventListener('dragend', (e) => {
        if (e.target.classList.contains('draggable-image')) {
            e.target.classList.remove('dragging');
        }
    });

    // Setup drop zones
    document.querySelectorAll('.drop-area').forEach(dropArea => {
        dropArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropArea.classList.add('drag-over');
        });

        dropArea.addEventListener('dragleave', (e) => {
            dropArea.classList.remove('drag-over');
        });

        dropArea.addEventListener('drop', (e) => {
            e.preventDefault();
            dropArea.classList.remove('drag-over');

            if (!draggedElement) return;

            const category = dropArea.dataset.category;
            const imageId = parseInt(draggedElement.dataset.imageId);

            // Check if image is already assigned elsewhere
            for (let cat in assignments) {
                if (assignments[cat] === imageId && cat !== category) {
                    showNotification('This image is already assigned to ' + cat, 'error');
                    return;
                }
            }

            // Remove previous image from this category if exists
            if (assignments[category]) {
                const prevImg = document.querySelector(`img[data-image-id="${assignments[category]}"]`);
                if (prevImg && prevImg.parentElement.classList.contains('drop-area')) {
                    document.getElementById('images-pool').appendChild(prevImg);
                }
            }

            // Remove the image from the pool or previous drop zone
            if (draggedElement.parentElement) {
                draggedElement.remove();
            }

            // Add to new drop zone
            dropArea.innerHTML = '';
            dropArea.appendChild(draggedElement);

            // Update assignment
            assignments[category] = imageId;

            updateSubmitButton();
        });
    });

    // Make images draggable back to pool
    document.getElementById('images-pool').addEventListener('dragover', (e) => {
        e.preventDefault();
    });

    document.getElementById('images-pool').addEventListener('drop', (e) => {
        e.preventDefault();

        if (!draggedElement) return;

        const imageId = parseInt(draggedElement.dataset.imageId);

        // Remove from assignments
        for (let cat in assignments) {
            if (assignments[cat] === imageId) {
                assignments[cat] = null;
            }
        }

        // Move back to pool
        if (draggedElement.parentElement.classList.contains('drop-area')) {
            draggedElement.parentElement.innerHTML = '<span class="drop-placeholder">Drop here</span>';
        }
        document.getElementById('images-pool').appendChild(draggedElement);

        updateSubmitButton();
    });
}

// Select an image
function selectImage(imageId) {
    selectedImageId = imageId;

    // Update visual selection
    Object.values(imageElements).forEach(card => {
        card.classList.remove('selected');
    });
    if (imageElements[imageId]) {
        imageElements[imageId].classList.add('selected');
    }

    // Enable all category buttons when an image is selected
    document.querySelectorAll('.category-btn').forEach(btn => {
        btn.disabled = false;
    });
}

// Setup category buttons
function setupCategoryButtons() {
    document.querySelectorAll('.category-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const category = btn.dataset.category;

            if (!selectedImageId) {
                showNotification('Please select an image first', 'error');
                return;
            }

            // If clicking a category that's assigned, check if it's the same image
            if (btn.classList.contains('assigned') && assignments[category] === selectedImageId) {
                // Same image clicking its own category - unassign it
                unassignCategory(category);
                return;
            }

            // Otherwise, assign (will swap if category is already assigned to different image)
            assignImageToCategory(selectedImageId, category);
        });
    });
}

// Unassign a category
function unassignCategory(category) {

    const imageId = assignments[category];
    if (!imageId) return;

    // Remove assignment
    assignments[category] = null;

    // Update button visual
    const btn = document.querySelector(`[data-category="${category}"]`);
    btn.classList.remove('assigned');

    // Remove badge from image
    const card = imageElements[imageId];
    if (card) {
        const badge = card.querySelector('.category-badge');
        badge.style.display = 'none';
    }

    updateSubmitButton();
}

// Assign image to category
function assignImageToCategory(imageId, category) {

    // Check if this image is already assigned to another category
    for (let cat in assignments) {
        if (assignments[cat] === imageId && cat !== category) {
            // Remove from previous category
            assignments[cat] = null;
            const prevBtn = document.querySelector(`[data-category="${cat}"]`);
            if (prevBtn) prevBtn.classList.remove('assigned');
        }
    }

    // Check if another image is already in this category
    if (assignments[category] && assignments[category] !== imageId) {
        // Clear badge from previous image
        const prevCard = imageElements[assignments[category]];
        if (prevCard) {
            const badge = prevCard.querySelector('.category-badge');
            badge.style.display = 'none';
        }
    }

    // Assign new
    assignments[category] = imageId;

    // Update button visual
    const btn = document.querySelector(`[data-category="${category}"]`);
    btn.classList.add('assigned');

    // Update image badge
    const card = imageElements[imageId];
    if (card) {
        const badge = card.querySelector('.category-badge');
        const categoryLabels = {
            marry: '💍',
            f: '🔥',
            kill: '💀'
        };
        badge.textContent = categoryLabels[category];
        badge.style.display = 'block';
    }

    // Deselect image
    selectedImageId = null;
    Object.values(imageElements).forEach(c => c.classList.remove('selected'));

    // Disable category buttons until next selection
    document.querySelectorAll('.category-btn').forEach(b => b.disabled = true);

    updateSubmitButton();
}

// Update submit button state
function updateSubmitButton() {
    const submitBtn = document.getElementById('submit-btn');
    const allAssigned = assignments.marry && assignments.f && assignments.kill;
    submitBtn.disabled = !allAssigned;
}

// Submit poll
async function submitPoll() {
    if (!assignments.marry || !assignments.f || !assignments.kill) {
        showNotification('Please assign all images', 'error');
        return;
    }

    const submitData = {
        poll_id: currentPollData.poll_id,
        group_id: currentGroupId,
        marry_image_id: assignments.marry,
        f_image_id: assignments.f,
        kill_image_id: assignments.kill
    };

    try {
        const result = await apiCall('/poll/submit', 'POST', submitData);
        showNotification('Submitted successfully!', 'success');

        // Show waiting screen instead of results
        document.getElementById('poll-active').style.display = 'none';
        document.getElementById('poll-waiting-next').style.display = 'flex';
    } catch (error) {
        showNotification('Failed to submit: ' + error.message, 'error');
    }
}

// Load and show results
async function loadAndShowResults() {
    try {
        const results = await apiCall(`/poll/results/${currentGroupId}`);
        displayResults(results);
    } catch (error) {
        showNotification('Failed to load results', 'error');
    }
}

// Display results
function displayResults(data) {
    document.getElementById('poll-waiting').style.display = 'none';
    document.getElementById('poll-active').style.display = 'none';
    document.getElementById('poll-results').style.display = 'block';

    const container = document.getElementById('results-display');
    container.innerHTML = '';

    if (!data || !data.results) {
        container.innerHTML = '<p>No results available.</p>';
        return;
    }

    container.innerHTML = `<p class="total-submissions"><strong>Total Votes:</strong> ${data.total_submissions}</p>`;

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
        showNotification('Poll started!', 'success');
        setTimeout(() => loadCurrentPoll(), 500);
    });

    socket.on('group_changed', (data) => {
        showNotification('Next group!', 'info');
        loadCurrentPoll();
    });

    socket.on('poll_ended', (data) => {
        showNotification('Poll ended. Thank you for participating!', 'info');
        document.getElementById('poll-waiting-next').style.display = 'none';
        showWaitingScreen('Poll has ended. Thank you for participating!');
    });
}

// Add CSS for total submissions display
const pollStyle = document.createElement('style');
pollStyle.textContent = `
    .total-submissions {
        font-size: 1.25rem;
        margin-bottom: 20px;
        padding: 15px;
        background: #3498db;
        color: white;
        border-radius: 8px;
        text-align: center;
    }
`;
document.head.appendChild(pollStyle);
