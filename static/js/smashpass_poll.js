/**
 * Smash or Pass Poll JavaScript - User voting interface
 */

let currentSessionId = null;
let currentImageData = null;
let hasVoted = false;
let selectedVote = null;

// Initialize poll page
document.addEventListener('DOMContentLoaded', () => {
    // Setup socket listeners first
    setupSocketListeners();

    // Setup vote buttons
    setupVoteButtons();

    // Setup submit button
    setupSubmitButton();

    // Load current session
    loadCurrentSession();
});

// Load current session
async function loadCurrentSession() {
    try {
        const result = await apiCall('/smashpass/current');
        currentSessionId = result.session_id;
        currentImageData = result.image;
        hasVoted = result.has_voted;

        // Show voting screen
        showVotingScreen(currentImageData, hasVoted, result.vote);
    } catch (error) {
        showWaitingScreen('Waiting for session to start...');
    }
}

// Show waiting screen
function showWaitingScreen(message = 'Waiting for session to start...') {
    document.getElementById('sp-waiting').style.display = 'block';
    document.getElementById('sp-voting').style.display = 'none';
    document.getElementById('sp-completed').style.display = 'none';
    document.querySelector('.waiting-screen p').textContent = message;
}

// Show voting screen
function showVotingScreen(imageData, voted = false, userVote = null) {
    document.getElementById('sp-waiting').style.display = 'none';
    document.getElementById('sp-voting').style.display = 'flex';
    document.getElementById('sp-completed').style.display = 'none';

    // Update image display
    document.getElementById('sp-image-name').textContent = imageData.name;
    document.getElementById('sp-voting-image').src = `/images/${imageData.filename}`;

    // Reset selection
    selectedVote = null;
    const smashBtn = document.getElementById('smash-btn');
    const passBtn = document.getElementById('pass-btn');
    const submitBtn = document.getElementById('submit-vote-btn');

    smashBtn.classList.remove('selected');
    passBtn.classList.remove('selected');

    if (voted) {
        // User already voted
        selectedVote = userVote;
        if (userVote === 'smash') {
            smashBtn.classList.add('selected');
        } else if (userVote === 'pass') {
            passBtn.classList.add('selected');
        }
        submitBtn.disabled = true;
        submitBtn.textContent = 'Submitted';
        document.getElementById('vote-status').style.display = 'block';
    } else {
        // Fresh vote
        submitBtn.disabled = true;
        submitBtn.textContent = 'Submit';
        document.getElementById('vote-status').style.display = 'none';
    }
}

// Show completed screen
function showCompletedScreen() {
    document.getElementById('sp-waiting').style.display = 'none';
    document.getElementById('sp-voting').style.display = 'none';
    document.getElementById('sp-completed').style.display = 'block';
}

// Setup vote buttons
function setupVoteButtons() {
    const smashBtn = document.getElementById('smash-btn');
    const passBtn = document.getElementById('pass-btn');
    const submitBtn = document.getElementById('submit-vote-btn');

    smashBtn.addEventListener('click', () => {
        if (hasVoted) return;

        selectedVote = 'smash';
        smashBtn.classList.add('selected');
        passBtn.classList.remove('selected');
        submitBtn.disabled = false;
    });

    passBtn.addEventListener('click', () => {
        if (hasVoted) return;

        selectedVote = 'pass';
        passBtn.classList.add('selected');
        smashBtn.classList.remove('selected');
        submitBtn.disabled = false;
    });
}

// Setup submit button
function setupSubmitButton() {
    document.getElementById('submit-vote-btn').addEventListener('click', async () => {
        if (!selectedVote) {
            showNotification('Please select Smash or Pass', 'error');
            return;
        }
        await submitVote(selectedVote);
    });
}

// Submit vote
async function submitVote(vote) {
    if (!currentSessionId || !currentImageData) {
        showNotification('No active session', 'error');
        return;
    }

    const voteData = {
        session_id: currentSessionId,
        image_id: currentImageData.id,
        vote: vote
    };

    try {
        const result = await apiCall('/smashpass/vote', 'POST', voteData);
        showNotification(`Voted ${vote.toUpperCase()}!`, 'success');

        // Update UI
        hasVoted = true;
        const submitBtn = document.getElementById('submit-vote-btn');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Submitted';

        document.getElementById('vote-status').style.display = 'block';
    } catch (error) {
        showNotification('Failed to submit vote: ' + error.message, 'error');
    }
}

// Setup socket listeners
function setupSocketListeners() {
    // Initialize socket
    if (typeof initializeSocket === 'function') {
        initializeSocket();
    }

    // Join smashpass room
    socket.on('connect', () => {
        console.log('Socket connected - joining smashpass room');
        socket.emit('join_smashpass');
    });

    socket.on('joined_smashpass', (data) => {
        console.log('Successfully joined smashpass room', data);
    });

    socket.on('smashpass_started', (data) => {
        console.log('Session started event received', data);
        showNotification('Session started!', 'success');
        setTimeout(() => {
            hasVoted = false;
            selectedVote = null;
            loadCurrentSession();
        }, 300);
    });

    socket.on('smashpass_next_image', (data) => {
        console.log('Next image event received', data);
        showNotification('Next image!', 'info');
        hasVoted = false;
        selectedVote = null;
        loadCurrentSession();
    });

    socket.on('smashpass_completed', (data) => {
        console.log('Session completed event received', data);
        showNotification('Session completed! Thank you for participating!', 'info');
        showCompletedScreen();
    });

    socket.on('smashpass_vote_update', (data) => {
        console.log('Vote update received', data);
        // Could show live vote counts here if desired
        // For now, just keep the interface clean
    });
}
