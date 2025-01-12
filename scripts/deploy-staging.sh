#!/bin/bash
set -e

# Configuration
DEPLOY_DIR="/opt/chatapp/staging"
BACKUP_DIR="$DEPLOY_DIR/backup"
DOCKER_COMPOSE="docker-compose -f docker-compose.staging.yml"
MAX_RETRIES=5
HEALTH_CHECK_URL="http://localhost:3000/api/health"

# Create necessary directories
mkdir -p $DEPLOY_DIR $BACKUP_DIR

# Backup current state
echo "Backing up current state..."
if [ -f "$DEPLOY_DIR/docker-compose.staging.yml" ]; then
  cp $DEPLOY_DIR/docker-compose.staging.yml $BACKUP_DIR/
  $DOCKER_COMPOSE down || true
fi

# Pull latest images
echo "Pulling latest images..."
$DOCKER_COMPOSE pull

# Start services
echo "Starting services..."
$DOCKER_COMPOSE up -d

# Health check function
check_health() {
  for i in $(seq 1 $MAX_RETRIES); do
    echo "Health check attempt $i of $MAX_RETRIES..."
    if curl -s $HEALTH_CHECK_URL > /dev/null; then
      echo "Health check passed!"
      return 0
    fi
    sleep 10
  done
  echo "Health check failed after $MAX_RETRIES attempts"
  return 1
}

# Perform health check
if ! check_health; then
  echo "Deployment failed health check, rolling back..."
  $DOCKER_COMPOSE down
  if [ -f "$BACKUP_DIR/docker-compose.staging.yml" ]; then
    cp $BACKUP_DIR/docker-compose.staging.yml $DEPLOY_DIR/
    $DOCKER_COMPOSE up -d
    if check_health; then
      echo "Rollback successful"
      exit 1
    fi
  fi
  echo "Rollback failed, manual intervention required"
  exit 1
fi

echo "Deployment successful!"
exit 0 