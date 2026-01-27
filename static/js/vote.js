/**
 * Unified voting page - Handles both Smash or Pass and MFK voting
 */

let currentVoteType = null;
let currentData = null;

// Smash or Pass state
let spSelectedVote = null;
let spHasVoted = false;

// MFK state
let mfkAssignments = { marry: null, f: null, kill: null };
let mfkSelectedImageId = null;
let mfkImageElements = {};

// Initialize voting page
document.addEventListener('DOMContentLoaded', () => {
    // Setup socket listeners
    setupSocketListeners();

    // Setup S/P controls
    setupSPControls();

    // Setup MFK controls
    setupMFKControls();

    // Load current vote
    loadCurrentVote();
});

// Load what's currently active
async function loadCurrentVote() {
    try {
        const result = await apiCall('/vote/current');
        currentVoteType = result.type;
        currentData = result;

        if (result.type === 'smashpass') {
            showSPInterface(result);
        } else if (result.type === 'mfk') {
            showMFKInterface(result);
        }
    } catch (error) {
        showWaiting('Waiting for voting to start...');
    }
}

// Show waiting screen
function showWaiting(message) {
    document.getElementById('waiting-screen').style.display = 'flex';
    document.getElementById('sp-interface').style.display = 'none';
    document.getElementById('mfk-interface').style.display = 'none';
    document.querySelector('.waiting-screen p').textContent = message;
}

// ============================================================================
// SMASH OR PASS INTERFACE
// ============================================================================

function showSPInterface(data) {
    document.getElementById('waiting-screen').style.display = 'none';
    document.getElementById('sp-interface').style.display = 'flex';
    document.getElementById('mfk-interface').style.display = 'none';

    document.getElementById('sp-image-name').textContent = data.image.name;
    document.getElementById('sp-voting-image').src = `/images/${data.image.filename}`;

    const smashBtn = document.getElementById('smash-btn');
    const passBtn = document.getElementById('pass-btn');
    const submitBtn = document.getElementById('submit-sp-btn');

    smashBtn.classList.remove('selected');
    passBtn.classList.remove('selected');
    spSelectedVote = null;

    if (data.has_voted) {
        spSelectedVote = data.vote;
        if (data.vote === 'smash') {
            smashBtn.classList.add('selected');
        } else {
            passBtn.classList.add('selected');
        }
        submitBtn.disabled = true;
        submitBtn.textContent = 'Submitted';
        document.getElementById('sp-vote-status').style.display = 'block';
    } else {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Submit';
        document.getElementById('sp-vote-status').style.display = 'none';
    }

    spHasVoted = data.has_voted;
}

function setupSPControls() {
    const smashBtn = document.getElementById('smash-btn');
    const passBtn = document.getElementById('pass-btn');
    const submitBtn = document.getElementById('submit-sp-btn');

    smashBtn.addEventListener('click', () => {
        if (spHasVoted) return;
        spSelectedVote = 'smash';
        smashBtn.classList.add('selected');
        passBtn.classList.remove('selected');
        submitBtn.disabled = false;
    });

    passBtn.addEventListener('click', () => {
        if (spHasVoted) return;
        spSelectedVote = 'pass';
        passBtn.classList.add('selected');
        smashBtn.classList.remove('selected');
        submitBtn.disabled = false;
    });

    submitBtn.addEventListener('click', async () => {
        if (!spSelectedVote || !currentData) return;

        const voteData = {
            session_id: currentData.session_id,
            image_id: currentData.image.id,
            vote: spSelectedVote
        };

        try {
            await apiCall('/smashpass/vote', 'POST', voteData);
            showNotification(`Voted ${spSelectedVote.toUpperCase()}!`, 'success');

            spHasVoted = true;
            submitBtn.disabled = true;
            submitBtn.textContent = 'Submitted';
            document.getElementById('sp-vote-status').style.display = 'block';
        } catch (error) {
            showNotification('Failed to submit vote: ' + error.message, 'error');
        }
    });
}

// ============================================================================
// MFK INTERFACE
// ============================================================================

function showMFKInterface(data) {
    document.getElementById('waiting-screen').style.display = 'none';
    document.getElementById('sp-interface').style.display = 'none';
    document.getElementById('mfk-interface').style.display = 'flex';

    if (data.has_submitted) {
        document.getElementById('mfk-voting').style.display = 'none';
        document.getElementById('mfk-waiting-next').style.display = 'flex';
        return;
    }

    document.getElementById('mfk-voting').style.display = 'flex';
    document.getElementById('mfk-waiting-next').style.display = 'none';

    // Reset state
    mfkAssignments = { marry: null, f: null, kill: null };
    mfkSelectedImageId = null;
    mfkImageElements = {};

    // Load images
    const container = document.getElementById('images-selection');
    container.innerHTML = '';

    data.group.images.forEach(image => {
        const card = document.createElement('div');
        card.className = 'image-card';
        card.dataset.imageId = image.id;
        card.innerHTML = `
            <img src="/images/${image.filename}" alt="${image.filename}">
            <div class="category-badge" style="display: none;"></div>
        `;

        card.addEventListener('click', () => selectMFKImage(image.id));

        mfkImageElements[image.id] = card;
        container.appendChild(card);
    });

    // Reset category buttons
    document.querySelectorAll('.category-btn').forEach(btn => {
        btn.classList.remove('assigned');
        btn.disabled = true;
    });

    updateMFKSubmitButton();
}

function setupMFKControls() {
    const submitBtn = document.getElementById('submit-mfk-btn');

    // Setup category buttons
    document.querySelectorAll('.category-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const category = btn.dataset.category;

            if (!mfkSelectedImageId) {
                showNotification('Please select an image first', 'error');
                return;
            }

            // If clicking same image's own category, unassign
            if (btn.classList.contains('assigned') && mfkAssignments[category] === mfkSelectedImageId) {
                unassignMFKCategory(category);
                return;
            }

            // Otherwise assign (will swap if needed)
            assignMFKImageToCategory(mfkSelectedImageId, category);
        });
    });

    // Submit button
    submitBtn.addEventListener('click', async () => {
        if (!mfkAssignments.marry || !mfkAssignments.f || !mfkAssignments.kill) {
            showNotification('Please assign all images', 'error');
            return;
        }

        const submitData = {
            poll_id: currentData.poll_id,
            group_id: currentData.group.id,
            marry_image_id: mfkAssignments.marry,
            f_image_id: mfkAssignments.f,
            kill_image_id: mfkAssignments.kill
        };

        try {
            await apiCall('/poll/submit', 'POST', submitData);
            showNotification('Submitted successfully!', 'success');

            document.getElementById('mfk-voting').style.display = 'none';
            document.getElementById('mfk-waiting-next').style.display = 'flex';
        } catch (error) {
            showNotification('Failed to submit: ' + error.message, 'error');
        }
    });
}

function selectMFKImage(imageId) {
    mfkSelectedImageId = imageId;

    Object.values(mfkImageElements).forEach(card => {
        card.classList.remove('selected');
    });
    if (mfkImageElements[imageId]) {
        mfkImageElements[imageId].classList.add('selected');
    }

    document.querySelectorAll('.category-btn').forEach(btn => {
        btn.disabled = false;
    });
}

function unassignMFKCategory(category) {
    const imageId = mfkAssignments[category];
    if (!imageId) return;

    mfkAssignments[category] = null;

    const btn = document.querySelector(`[data-category="${category}"]`);
    btn.classList.remove('assigned');

    const card = mfkImageElements[imageId];
    if (card) {
        const badge = card.querySelector('.category-badge');
        badge.style.display = 'none';
    }

    updateMFKSubmitButton();
}

function assignMFKImageToCategory(imageId, category) {
    // Remove from any previous category
    for (let cat in mfkAssignments) {
        if (mfkAssignments[cat] === imageId && cat !== category) {
            mfkAssignments[cat] = null;
            const prevBtn = document.querySelector(`[data-category="${cat}"]`);
            if (prevBtn) prevBtn.classList.remove('assigned');
        }
    }

    // Clear previous image from this category
    if (mfkAssignments[category] && mfkAssignments[category] !== imageId) {
        const prevCard = mfkImageElements[mfkAssignments[category]];
        if (prevCard) {
            const badge = prevCard.querySelector('.category-badge');
            badge.style.display = 'none';
        }
    }

    // Assign
    mfkAssignments[category] = imageId;

    const btn = document.querySelector(`[data-category="${category}"]`);
    btn.classList.add('assigned');

    const card = mfkImageElements[imageId];
    if (card) {
        const badge = card.querySelector('.category-badge');
        const categoryLabels = { marry: '💍', f: '🔥', kill: '💀' };
        badge.textContent = categoryLabels[category];
        badge.style.display = 'block';
    }

    mfkSelectedImageId = null;
    Object.values(mfkImageElements).forEach(c => c.classList.remove('selected'));
    document.querySelectorAll('.category-btn').forEach(b => b.disabled = true);

    updateMFKSubmitButton();
}

function updateMFKSubmitButton() {
    const submitBtn = document.getElementById('submit-mfk-btn');
    const allAssigned = mfkAssignments.marry && mfkAssignments.f && mfkAssignments.kill;
    submitBtn.disabled = !allAssigned;
}

// ============================================================================
// SOCKET LISTENERS
// ============================================================================

function setupSocketListeners() {
    if (typeof initializeSocket === 'function') {
        initializeSocket();
    }

    socket.on('connect', () => {
        socket.emit('join_smashpass');
        socket.emit('join_poll');
    });

    // Universal vote changed event
    socket.on('vote_changed', (data) => {
        showNotification('Voting mode changed!', 'info');
        loadCurrentVote();
    });

    // Smash or Pass events
    socket.on('smashpass_started', (data) => {
        showNotification('Smash or Pass started!', 'success');
        loadCurrentVote();
    });

    socket.on('smashpass_next_image', (data) => {
        showNotification('Next image!', 'info');
        spHasVoted = false;
        spSelectedVote = null;
        loadCurrentVote();
    });

    socket.on('smashpass_completed', (data) => {
        showNotification('Smash or Pass completed!', 'info');
        showWaiting('Voting session ended. Waiting for next...');
    });

    // MFK events
    socket.on('poll_started', (data) => {
        showNotification('MFK Poll started!', 'success');
        loadCurrentVote();
    });

    socket.on('group_changed', (data) => {
        showNotification('Next group!', 'info');
        loadCurrentVote();
    });

    socket.on('poll_ended', (data) => {
        showNotification('Poll ended!', 'info');
        showWaiting('Voting session ended. Waiting for next...');
    });
}
