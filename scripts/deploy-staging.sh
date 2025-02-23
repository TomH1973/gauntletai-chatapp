#!/bin/bash
set -e

echo "🚀 Deploying to staging..."

# Load environment variables
source .env.staging

# Build the application
echo "📦 Building application..."
npm run build

# Run database migrations
echo "🔄 Running database migrations..."
npx prisma migrate deploy

# Generate Prisma client
echo "⚡ Generating Prisma client..."
npx prisma generate

# Deploy monitoring stack first
echo "📊 Deploying monitoring stack..."
docker compose -f docker-compose.monitoring.yml up -d prometheus grafana

# Deploy the application
echo "🌟 Deploying application..."
docker compose -f docker-compose.staging.yml up -d

# Run smoke tests
echo "🔍 Running smoke tests..."
npm run test:smoke

# Seed staging data
echo "🌱 Seeding staging data..."
npm run prisma:seed

echo "✨ Deployment complete!"

# Print URLs
echo "
🔗 Application: https://staging.chatapp.example.com
📊 Grafana: https://grafana.staging.chatapp.example.com
🔍 Prometheus: https://prometheus.staging.chatapp.example.com
"

# Health check
echo "🏥 Running health check..."
curl -s https://staging.chatapp.example.com/api/health || echo "Health check failed!" 