#!/bin/bash
# WSL startup script for chat application client

# Display banner
echo "====================================="
echo "Chat App Client - WSL Startup Script"
echo "====================================="

# Check if node_modules exists, if not install dependencies
if [ ! -d "node_modules" ]; then
  echo "Installing dependencies..."
  npm install
fi

# Set environment variables for improved development experience
export FAST_REFRESH=true
export CHOKIDAR_USEPOLLING=true
export WATCHPACK_POLLING=true

# Start the client in development mode with enhanced hot reloading
echo "Starting client with enhanced hot reloading..."
npm start 