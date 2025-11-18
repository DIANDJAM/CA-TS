#!/bin/bash
# Simple bash script to start the local web server
# This is an alternative to running serve.py directly

echo "========================================================================"
echo "CA Legislative Transcripts Archive - Local Server"
echo "========================================================================"
echo ""

# Check if Python 3 is available
if command -v python3 &> /dev/null; then
    PYTHON_CMD="python3"
elif command -v python &> /dev/null; then
    PYTHON_CMD="python"
else
    echo "Error: Python is not installed or not in PATH"
    echo "Please install Python 3 to run the local server"
    exit 1
fi

echo "Starting server with $PYTHON_CMD..."
echo ""

# Run the Python server script
exec "$PYTHON_CMD" serve.py
