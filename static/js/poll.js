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

// Initialize poll page
document.addEventListener('DOMContentLoaded', () => {
    // Initialize socket
    initializeSocket();

    // Setup socket listeners
    setupSocketListeners();

    // Load current poll
    loadCurrentPoll();

    // Setup drag and drop
    setupDragAndDrop();

    // Setup submit button
    document.getElementById('submit-btn').addEventListener('click', submitPoll);
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
    document.getElementById('poll-active').style.display = 'block';
    document.getElementById('poll-results').style.display = 'none';

    // Reset assignments
    assignments = { marry: null, f: null, kill: null };

    // Load images
    const pool = document.getElementById('images-pool');
    pool.innerHTML = '';

    groupData.images.forEach(image => {
        const img = document.createElement('img');
        img.src = `/images/${image.filename}`;
        img.className = 'draggable-image';
        img.draggable = true;
        img.dataset.imageId = image.id;
        img.dataset.filename = image.filename;
        pool.appendChild(img);
    });

    // Clear drop zones
    document.querySelectorAll('.drop-area').forEach(area => {
        area.innerHTML = '<span class="drop-placeholder">Drop here</span>';
    });

    updateSubmitButton();
}

// Setup drag and drop
function setupDragAndDrop() {
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
        displayResults(result.results);
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
        showNotification('New group available!', 'info');
        setTimeout(() => loadCurrentPoll(), 500);
    });

    socket.on('poll_ended', (data) => {
        showNotification('Poll ended. Thank you for participating!', 'info');
        showWaitingScreen('Poll has ended. Thank you for participating!');
    });

    socket.on('results_updated', (data) => {
        // If we're viewing results, update them
        const resultsSection = document.getElementById('poll-results');
        if (resultsSection.style.display === 'block' && data.group_id === currentGroupId) {
            displayResults(data);
        }
    });
}

// Add CSS for total submissions display
const style = document.createElement('style');
style.textContent = `
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
document.head.appendChild(style);
