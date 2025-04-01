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

# Backup the original .env file
cp .env .env.backup

# Auto-detect the best database connection for WSL
echo "Detecting optimal PostgreSQL connection for WSL..."

# Try to connect to localhost first
if pg_isready -h localhost -p 5432 -U postgres > /dev/null 2>&1; then
  echo "✅ PostgreSQL available on localhost"
  sed -i 's|^# \?DATABASE_URL=.*$|DATABASE_URL="postgresql://postgres:postgres@localhost:5432/chatapp"|g' .env
  sed -i 's|^# \?DATABASE_URL="postgresql://postgres:postgres@host.docker.internal:5432/chatapp"|# DATABASE_URL="postgresql://postgres:postgres@host.docker.internal:5432/chatapp"|g' .env
  sed -i 's|^# \?DATABASE_URL="postgresql://postgres:postgres@172.17.0.1:5432/chatapp"|# DATABASE_URL="postgresql://postgres:postgres@172.17.0.1:5432/chatapp"|g' .env
# Try host.docker.internal next
elif pg_isready -h host.docker.internal -p 5432 -U postgres > /dev/null 2>&1; then
  echo "✅ PostgreSQL available via host.docker.internal"
  sed -i 's|^# \?DATABASE_URL=.*$|# DATABASE_URL="postgresql://postgres:postgres@localhost:5432/chatapp"|g' .env
  sed -i 's|^# \?DATABASE_URL="postgresql://postgres:postgres@host.docker.internal:5432/chatapp"|DATABASE_URL="postgresql://postgres:postgres@host.docker.internal:5432/chatapp"|g' .env
  sed -i 's|^# \?DATABASE_URL="postgresql://postgres:postgres@172.17.0.1:5432/chatapp"|# DATABASE_URL="postgresql://postgres:postgres@172.17.0.1:5432/chatapp"|g' .env
# Finally try the WSL 2 IP address
elif pg_isready -h 172.17.0.1 -p 5432 -U postgres > /dev/null 2>&1; then
  echo "✅ PostgreSQL available via 172.17.0.1"
  sed -i 's|^# \?DATABASE_URL=.*$|# DATABASE_URL="postgresql://postgres:postgres@localhost:5432/chatapp"|g' .env
  sed -i 's|^# \?DATABASE_URL="postgresql://postgres:postgres@host.docker.internal:5432/chatapp"|# DATABASE_URL="postgresql://postgres:postgres@host.docker.internal:5432/chatapp"|g' .env
  sed -i 's|^# \?DATABASE_URL="postgresql://postgres:postgres@172.17.0.1:5432/chatapp"|DATABASE_URL="postgresql://postgres:postgres@172.17.0.1:5432/chatapp"|g' .env
else
  echo "⚠️ No PostgreSQL server detected. Using default localhost configuration."
  echo "⚠️ If connection fails, please start PostgreSQL or update connection URL manually."
fi

# Make sure pg_isready is installed
if ! command -v pg_isready &> /dev/null; then
  echo "⚠️ pg_isready not found. Skipping automatic database connection detection."
  echo "⚠️ You may need to install PostgreSQL client: sudo apt-get install postgresql-client"
fi

# Ensure Prisma schema is up to date
echo "Generating Prisma client..."
npx prisma generate

# Check if database needs migration
echo "Checking database status..."
npx prisma migrate status

# Attempt to run migrations if needed
echo "Running database migrations if needed..."
npx prisma migrate dev --name production-ready-update || {
  echo "⚠️ Migration failed. You may need to manually setup the database."
  echo "⚠️ Try: npm run wsl:db:migrate"
}

# Start the server with hot reloading
echo "Starting server with hot reloading..."
NODE_ENV=development npx nodemon --watch '**/*.js' --watch '**/*.ts' --ignore 'node_modules/' --ext js,ts,json index.js 