/**
 * Main JavaScript file - Common functionality across the application
 */

// Initialize Socket.IO connection
let socket;

function initializeSocket() {
    socket = io();

    socket.on('connect', () => {
        socket.emit('join_poll');
    });

    socket.on('disconnect', () => {
    });

    return socket;
}

// Utility function for API calls
async function apiCall(url, method = 'GET', data = null) {
    const options = {
        method: method,
        headers: {
            'Content-Type': 'application/json',
        },
    };

    if (data) {
        options.body = JSON.stringify(data);
    }

    try {
        const response = await fetch(url, options);
        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || 'Request failed');
        }

        return result;
    } catch (error) {
        console.error('API call failed:', error);
        throw error;
    }
}

// Show notification/toast message
function showNotification(message, type = 'info', position = 'top-right') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;

    let positionStyles = 'top: 20px; right: 20px;';
    if (position === 'top-center') {
        positionStyles = 'top: 20px; left: 50%; transform: translateX(-50%);';
    }

    notification.style.cssText = `
        position: fixed;
        ${positionStyles}
        padding: 15px 20px;
        border-radius: 8px;
        color: white;
        font-weight: 600;
        z-index: 10000;
        animation: slideIn 0.3s ease;
        max-width: 300px;
    `;

    // Set background color based on type
    const colors = {
        info: '#3498db',
        success: '#2ecc71',
        error: '#e74c3c',
        warning: '#f39c12'
    };
    notification.style.backgroundColor = colors[type] || colors.info;

    document.body.appendChild(notification);

    // Remove after 3 seconds
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Add animation styles
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(400px);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }

    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(400px);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// Format date/time
function formatDateTime(isoString) {
    if (!isoString) return 'N/A';
    const date = new Date(isoString);
    return date.toLocaleString();
}

// Format time ago
function timeAgo(isoString) {
    if (!isoString) return 'N/A';
    const date = new Date(isoString);
    const seconds = Math.floor((new Date() - date) / 1000);

    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + ' years ago';

    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + ' months ago';

    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + ' days ago';

    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + ' hours ago';

    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + ' minutes ago';

    return Math.floor(seconds) + ' seconds ago';
}
