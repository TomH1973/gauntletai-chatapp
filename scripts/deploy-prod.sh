#!/bin/bash
set -e

# Configuration
DEPLOY_DIR="/opt/chatapp/prod"
BACKUP_DIR="$DEPLOY_DIR/backup"
DOCKER_COMPOSE="docker-compose -f docker-compose.prod.yml"
MAX_RETRIES=5
HEALTH_CHECK_URL="http://localhost/health"
SERVICES=("app1" "app2" "app3" "websocket1" "websocket2" "websocket3")

# Create necessary directories
mkdir -p $DEPLOY_DIR $BACKUP_DIR

# Backup current state
echo "Backing up current state..."
if [ -f "$DEPLOY_DIR/docker-compose.prod.yml" ]; then
    cp $DEPLOY_DIR/docker-compose.prod.yml $BACKUP_DIR/
    $DOCKER_COMPOSE down || true
fi

# Pull latest images
echo "Pulling latest images..."
$DOCKER_COMPOSE pull

# Start services in order
echo "Starting services..."
$DOCKER_COMPOSE up -d postgres redis
sleep 10  # Wait for databases to be ready

# Start app instances one by one
for service in "${SERVICES[@]}"; do
    echo "Starting $service..."
    $DOCKER_COMPOSE up -d $service
    sleep 5  # Wait for service to initialize
done

# Start nginx last
$DOCKER_COMPOSE up -d nginx

# Health check function
check_health() {
    for i in $(seq 1 $MAX_RETRIES); do
        echo "Health check attempt $i of $MAX_RETRIES..."
        if curl -sf $HEALTH_CHECK_URL > /dev/null; then
            echo "Health check passed!"
            return 0
        fi
        sleep 10
    done
    echo "Health check failed after $MAX_RETRIES attempts"
    return 1
}

# Rollback function
rollback() {
    echo "Rolling back deployment..."
    $DOCKER_COMPOSE down
    if [ -f "$BACKUP_DIR/docker-compose.prod.yml" ]; then
        cp $BACKUP_DIR/docker-compose.prod.yml $DEPLOY_DIR/
        $DOCKER_COMPOSE up -d
        if check_health; then
            echo "Rollback successful"
            exit 1
        fi
    fi
    echo "Rollback failed, manual intervention required"
    exit 1
}

# Perform health check
if ! check_health; then
    rollback
fi

# Verify individual service health
for service in "${SERVICES[@]}"; do
    if ! $DOCKER_COMPOSE exec -T $service wget -q --spider http://localhost:3000/api/health; then
        echo "Service $service health check failed"
        rollback
    fi
done

# Clean up old images and volumes
echo "Cleaning up..."
docker system prune -f

echo "Deployment successful!"
exit 0 