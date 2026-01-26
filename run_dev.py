#!/usr/bin/env python3
"""
Development server runner script.
Runs the Flask application in development mode with auto-reload.
"""

import os
import sys

# Ensure we're in the correct directory
os.chdir(os.path.dirname(os.path.abspath(__file__)))

# Set development environment variables
os.environ['FLASK_ENV'] = 'development'
os.environ['FLASK_DEBUG'] = '1'

# Import and run the app
from app import app, socketio

if __name__ == '__main__':
    print("=" * 60)
    print("Starting FMK Quiz in DEVELOPMENT mode")
    print("=" * 60)
    print(f"Server running at: http://localhost:5000")
    print(f"Admin panel: http://localhost:5000/admin")
    print(f"User poll: http://localhost:5000/poll")
    print("=" * 60)
    print("\nPress CTRL+C to stop the server\n")

    socketio.run(app, host='0.0.0.0', port=5000, debug=True)
