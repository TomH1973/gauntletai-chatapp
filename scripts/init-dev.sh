#!/bin/sh
set -e

# Function to check if a service is ready
wait_for_service() {
    local host=$1
    local port=$2
    local service=$3
    
    echo "Waiting for $service to be ready..."
    while ! nc -z $host $port; do
        echo "Waiting for $service connection..."
        sleep 1
    done
    echo "$service is ready!"
}

# Wait for required services
wait_for_service postgres 5432 "PostgreSQL"
wait_for_service redis 6379 "Redis"

# Setup database
echo "Setting up database..."
npx prisma generate
if [ "$NODE_ENV" = "development" ]; then
    echo "Running development migrations..."
    npx prisma migrate dev
    echo "Seeding database..."
    npx prisma db seed
else
    echo "Running production migrations..."
    npx prisma migrate deploy
fi

# Install dependencies if node_modules is empty
if [ ! -d "node_modules" ] || [ -z "$(ls -A node_modules)" ]; then
    echo "Installing dependencies..."
    npm install
fi

# Start the application based on environment
if [ "$NODE_ENV" = "development" ]; then
    echo "Starting in development mode..."
    npm run dev
else
    echo "Starting in production mode..."
    npm start
fi 