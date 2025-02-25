#!/bin/bash
# WSL startup script for chat application server

# Display banner
echo "====================================="
echo "Chat App Server - WSL Startup Script"
echo "====================================="

# Check if .env file exists
if [ ! -f .env ]; then
  echo "Error: .env file not found!"
  echo "Please create a .env file with required environment variables."
  exit 1
fi

# Ensure Prisma schema is up to date
echo "Generating Prisma client..."
npx prisma generate

# Check if database needs migration
echo "Checking database status..."
npx prisma migrate status

# Start the server
echo "Starting server..."
npm start 