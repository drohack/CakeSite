/**
 * Smash or Pass Remote - minimal Next / End control for the active session.
 * Reuses apiCall, initializeSocket, showNotification from main.js.
 */

let currentSessionId = null;

document.addEventListener('DOMContentLoaded', () => {
    initializeSocket();
    setupButtonHandlers();
    setupSocketListeners();
    refresh();
});

function setupButtonHandlers() {
    document.getElementById('next-image').addEventListener('click', async () => {
        if (!currentSessionId) return;
        try {
            const result = await apiCall(`/smashpass/session/${currentSessionId}/next`, 'POST');
            if (result.completed) {
                showNotification('Session completed!', 'success', 'top-center');
            } else {
                showNotification('Moved to next image', 'success', 'top-center');
            }
            refresh();
        } catch (error) {
            showNotification('Failed to move to next image: ' + error.message, 'error', 'top-center');
        }
    });

    document.getElementById('end-session').addEventListener('click', async () => {
        if (!currentSessionId) return;
        if (!confirm('Are you sure you want to end this session?')) return;
        try {
            await apiCall(`/smashpass/session/${currentSessionId}/end`, 'POST');
            showNotification('Session ended', 'success', 'top-center');
            refresh();
        } catch (error) {
            showNotification('Failed to end session: ' + error.message, 'error', 'top-center');
        }
    });
}

function setupSocketListeners() {
    socket.emit('join_smashpass');
    socket.on('smashpass_started', refresh);
    socket.on('smashpass_next_image', refresh);
    socket.on('smashpass_completed', refresh);
}

// Fetch the current session and update the controls. Only an 'active'
// session is controllable; anything else means nothing is running.
async function refresh() {
    try {
        const result = await apiCall('/smashpass/session/current');
        const session = result.session;

        if (session && session.status === 'active') {
            currentSessionId = session.id;
            const total = (session.image_order || []).length;
            const current = session.current_image_index + 1;
            setState(
                `Session #${session.id} - Active`,
                `${current} / ${total}`,
                true
            );
            return;
        }
    } catch (error) {
        // 404 (no session) or auth/network error -> treat as no active session.
    }

    currentSessionId = null;
    setState('No active session', '– / –', false);
}

function setState(statusText, progressText, controllable) {
    document.getElementById('status-info').textContent = statusText;
    document.getElementById('progress-counter').textContent = progressText;
    document.getElementById('next-image').disabled = !controllable;
    document.getElementById('end-session').disabled = !controllable;
}
