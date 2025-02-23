#!/bin/bash

# Set environment variables
export NODE_ENV=test
export WS_URL=${WS_URL:-"ws://localhost:3002"}

# Ensure k6 is installed
if ! command -v k6 &> /dev/null; then
    echo "k6 is not installed. Please install it first:"
    echo "Windows (PowerShell): choco install k6"
    echo "Linux: snap install k6"
    echo "macOS: brew install k6"
    exit 1
fi

# Start the WebSocket server in test mode
echo "Starting WebSocket server in test mode..."
npm run start:test &
SERVER_PID=$!

# Wait for server to be ready
sleep 5

# Run the recovery tests
echo "Running recovery tests..."
k6 run tests/performance/recovery.k6.js

# Cleanup
echo "Cleaning up..."
kill $SERVER_PID

# Check test results
if [ $? -eq 0 ]; then
    echo "Recovery tests passed successfully!"
    exit 0
else
    echo "Recovery tests failed!"
    exit 1
fi 