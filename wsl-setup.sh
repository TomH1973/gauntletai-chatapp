#!/bin/bash
# WSL setup script for Chat App

# Display banner
echo "====================================="
echo "Chat App - WSL Setup Script"
echo "====================================="

# Function to check if a command exists
command_exists() {
  command -v "$1" >/dev/null 2>&1
}

# Check for required tools
echo "Checking required tools..."

if ! command_exists node; then
  echo "Node.js is not installed. Please install Node.js v14 or later."
  exit 1
fi

if ! command_exists npm; then
  echo "npm is not installed. Please install npm."
  exit 1
fi

if ! command_exists docker; then
  echo "Docker is not installed. Please install Docker."
  echo "You can install Docker in WSL using: sudo apt-get update && sudo apt-get install docker.io"
  exit 1
fi

# Install dependencies
echo "Installing dependencies..."
npm install

echo "Installing server dependencies..."
cd server && npm install && cd ..

# Set execute permissions for scripts
echo "Setting execute permissions for scripts..."
chmod +x server/start-wsl.sh start-client-wsl.sh

# Setup complete
echo ""
echo "Setup complete! You can now run the application using:"
echo "npm run wsl:dev       - Run server and client directly"
echo "npm run wsl:docker:up - Run using Docker Compose"
echo ""
echo "Other useful commands:"
echo "npm run wsl:server    - Run server only"
echo "npm run wsl:client    - Run client only"
echo "npm run wsl:docker:db - Run PostgreSQL in Docker only"
echo "" 