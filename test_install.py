#!/usr/bin/env python3
"""
Installation test script for FMK Quiz.
Verifies that all dependencies are installed and the application can run.
"""

import sys
import os

def check_python_version():
    """Check if Python version is 3.11 or higher."""
    version = sys.version_info
    if version.major < 3 or (version.major == 3 and version.minor < 9):
        print("❌ Python 3.9+ required. Current version:", sys.version)
        return False
    print(f"✓ Python version OK: {version.major}.{version.minor}.{version.micro}")
    return True

def check_dependencies():
    """Check if all required packages are installed."""
    required_packages = [
        'flask',
        'flask_socketio',
        'flask_sqlalchemy',
        'qrcode',
        'PIL',
        'gunicorn',
        'eventlet'
    ]

    missing = []
    for package in required_packages:
        try:
            if package == 'PIL':
                __import__('PIL')
            else:
                __import__(package)
            print(f"✓ {package} installed")
        except ImportError:
            print(f"❌ {package} NOT installed")
            missing.append(package)

    return len(missing) == 0, missing

def check_directories():
    """Check if all required directories exist."""
    required_dirs = [
        'images',
        'static/css',
        'static/js',
        'templates'
    ]

    all_exist = True
    for dir_path in required_dirs:
        if os.path.exists(dir_path):
            print(f"✓ Directory exists: {dir_path}")
        else:
            print(f"❌ Directory missing: {dir_path}")
            all_exist = False

    return all_exist

def check_files():
    """Check if all required files exist."""
    required_files = [
        'app.py',
        'database.py',
        'requirements.txt',
        'Dockerfile',
        'templates/base.html',
        'templates/admin.html',
        'templates/poll.html',
        'templates/index.html',
        'static/css/style.css',
        'static/js/main.js',
        'static/js/admin.js',
        'static/js/poll.js'
    ]

    all_exist = True
    for file_path in required_files:
        if os.path.exists(file_path):
            print(f"✓ File exists: {file_path}")
        else:
            print(f"❌ File missing: {file_path}")
            all_exist = False

    return all_exist

def test_import_app():
    """Test if the main application can be imported."""
    try:
        import app
        print("✓ Application imports successfully")
        return True
    except Exception as e:
        print(f"❌ Failed to import application: {e}")
        return False

def main():
    """Run all tests."""
    print("=" * 60)
    print("FMK Quiz - Installation Test")
    print("=" * 60)
    print()

    print("Checking Python version...")
    python_ok = check_python_version()
    print()

    print("Checking directories...")
    dirs_ok = check_directories()
    print()

    print("Checking files...")
    files_ok = check_files()
    print()

    print("Checking dependencies...")
    deps_ok, missing = check_dependencies()
    print()

    if not deps_ok:
        print("Missing packages:", ', '.join(missing))
        print("Run: pip install -r requirements.txt")
        print()

    print("Testing application import...")
    app_ok = test_import_app()
    print()

    print("=" * 60)
    if python_ok and dirs_ok and files_ok and deps_ok and app_ok:
        print("✓ ALL TESTS PASSED!")
        print("=" * 60)
        print()
        print("Your installation is ready!")
        print()
        print("To start the application:")
        print("  Development mode: python run_dev.py")
        print("  Docker mode: docker-compose up -d")
        print()
        print("Then open: http://localhost:5000")
        return 0
    else:
        print("❌ SOME TESTS FAILED")
        print("=" * 60)
        print()
        print("Please fix the issues above before running the application.")
        return 1

if __name__ == '__main__':
    sys.exit(main())
