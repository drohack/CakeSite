@echo off
REM FMK Quiz Setup Script for Windows
REM This script helps set up the application for first-time use

echo ================================================
echo FMK Quiz - Setup Script
echo ================================================
echo.

REM Create necessary directories
echo Creating directories...
if not exist "images" mkdir images
if not exist "data" mkdir data
if not exist "static\css" mkdir static\css
if not exist "static\js" mkdir static\js
if not exist "templates" mkdir templates

echo [OK] Directories created
echo.

REM Check for Python
where python >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Python is not installed. Please install Python 3.11 or higher.
    pause
    exit /b 1
)

echo [OK] Python found
python --version
echo.

REM Check for Docker
where docker >nul 2>nul
if %errorlevel% equ 0 (
    echo [OK] Docker found
    docker --version
    set HAS_DOCKER=true
) else (
    echo [WARNING] Docker not found (optional, but recommended^)
    set HAS_DOCKER=false
)
echo.

REM Ask user how they want to run the app
echo How would you like to run the application?
echo 1^) Docker (recommended^)
echo 2^) Development mode (Python directly^)
echo.
set /p choice="Enter choice [1-2]: "

if "%choice%"=="1" (
    if "%HAS_DOCKER%"=="false" (
        echo [ERROR] Docker is required for this option. Please install Docker first.
        pause
        exit /b 1
    )

    echo.
    echo Building Docker image...
    docker-compose build

    echo.
    echo [OK] Setup complete!
    echo.
    echo To start the application, run:
    echo   docker-compose up -d
    echo.
    echo To view logs:
    echo   docker-compose logs -f
    echo.
    echo To stop the application:
    echo   docker-compose down
    echo.
) else if "%choice%"=="2" (
    echo.
    echo Installing Python dependencies...
    pip install -r requirements.txt

    echo.
    echo [OK] Setup complete!
    echo.
    echo To start the application, run:
    echo   python run_dev.py
    echo.
    echo Or:
    echo   python app.py
    echo.
) else (
    echo Invalid choice. Exiting.
    pause
    exit /b 1
)

echo ================================================
echo Next steps:
echo ================================================
echo 1. Add image files to the 'images/' directory
echo 2. Start the application using the command above
echo 3. Open http://localhost:5000 in your browser
echo 4. Go to Admin panel: http://localhost:5000/admin
echo.
echo See QUICKSTART.md for a complete tutorial
echo ================================================
pause
