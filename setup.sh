#!/bin/bash

# FMK Quiz Setup Script
# This script helps set up the application for first-time use

echo "================================================"
echo "FMK Quiz - Setup Script"
echo "================================================"
echo ""

# Create necessary directories
echo "Creating directories..."
mkdir -p images
mkdir -p data
mkdir -p static/css
mkdir -p static/js
mkdir -p templates

echo "✓ Directories created"
echo ""

# Check for Python
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is not installed. Please install Python 3.11 or higher."
    exit 1
fi

echo "✓ Python 3 found: $(python3 --version)"
echo ""

# Check for Docker (optional)
if command -v docker &> /dev/null; then
    echo "✓ Docker found: $(docker --version)"
    HAS_DOCKER=true
else
    echo "⚠ Docker not found (optional, but recommended)"
    HAS_DOCKER=false
fi
echo ""

# Ask user how they want to run the app
echo "How would you like to run the application?"
echo "1) Docker (recommended)"
echo "2) Development mode (Python directly)"
echo ""
read -p "Enter choice [1-2]: " choice

case $choice in
    1)
        if [ "$HAS_DOCKER" = false ]; then
            echo "❌ Docker is required for this option. Please install Docker first."
            exit 1
        fi

        echo ""
        echo "Building Docker image..."
        docker-compose build

        echo ""
        echo "✓ Setup complete!"
        echo ""
        echo "To start the application, run:"
        echo "  docker-compose up -d"
        echo ""
        echo "To view logs:"
        echo "  docker-compose logs -f"
        echo ""
        echo "To stop the application:"
        echo "  docker-compose down"
        echo ""
        ;;
    2)
        echo ""
        echo "Installing Python dependencies..."
        pip3 install -r requirements.txt

        echo ""
        echo "✓ Setup complete!"
        echo ""
        echo "To start the application, run:"
        echo "  python3 run_dev.py"
        echo ""
        echo "Or:"
        echo "  python3 app.py"
        echo ""
        ;;
    *)
        echo "Invalid choice. Exiting."
        exit 1
        ;;
esac

echo "================================================"
echo "Next steps:"
echo "================================================"
echo "1. Add image files to the 'images/' directory"
echo "2. Start the application using the command above"
echo "3. Open http://localhost:5000 in your browser"
echo "4. Go to Admin panel: http://localhost:5000/admin"
echo ""
echo "See QUICKSTART.md for a complete tutorial"
echo "================================================"
