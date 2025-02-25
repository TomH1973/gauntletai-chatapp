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

# Start the client in development mode
echo "Starting client..."
npm start 