#!/bin/bash
set -e

# Configuration
BACKUP_DIR="/opt/chatapp/backups"
TEST_DIR="/opt/chatapp/backup-test"
POSTGRES_CONTAINER="chatapp-postgres-test"
REDIS_CONTAINER="chatapp-redis-test"
S3_BUCKET="chatapp-backups"
DATE=$(date +%Y%m%d_%H%M%S)

# Logging setup
LOG_FILE="$BACKUP_DIR/logs/restore_test_${DATE}.log"
exec 1> >(tee -a "$LOG_FILE") 2>&1

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

# Download latest backups
download_backups() {
    log "Downloading latest backups..."
    
    # Create test directory
    mkdir -p "$TEST_DIR"
    
    # Get latest PostgreSQL backup
    LATEST_PG=$(aws s3 ls "s3://${S3_BUCKET}/postgres/" | sort | tail -n 1 | awk '{print $4}')
    aws s3 cp "s3://${S3_BUCKET}/postgres/${LATEST_PG}" "$TEST_DIR/"
    
    # Get latest Redis backup
    LATEST_REDIS=$(aws s3 ls "s3://${S3_BUCKET}/redis/" | sort | tail -n 1 | awk '{print $4}')
    aws s3 cp "s3://${S3_BUCKET}/redis/${LATEST_REDIS}" "$TEST_DIR/"
    
    log "Backups downloaded successfully"
}

# Decrypt backups
decrypt_backups() {
    log "Decrypting backups..."
    
    # Decrypt PostgreSQL backup
    gpg --decrypt "$TEST_DIR"/*.tar.gz.gpg > "$TEST_DIR/postgres_backup.tar.gz"
    tar xzf "$TEST_DIR/postgres_backup.tar.gz" -C "$TEST_DIR"
    
    # Decrypt Redis backup
    gpg --decrypt "$TEST_DIR"/*.rdb.gpg > "$TEST_DIR/dump.rdb"
    
    log "Backups decrypted successfully"
}

# Test PostgreSQL restore
test_postgres_restore() {
    log "Testing PostgreSQL restore..."
    
    # Start test container
    docker run -d --name $POSTGRES_CONTAINER \
        -e POSTGRES_PASSWORD=test \
        -v "$TEST_DIR/postgres:/var/lib/postgresql/data" \
        postgres:15
    
    # Wait for container to be ready
    sleep 30
    
    # Verify database
    if docker exec $POSTGRES_CONTAINER psql -U postgres -c "\l" | grep chatapp; then
        log "PostgreSQL restore test successful"
    else
        log "ERROR: PostgreSQL restore test failed"
        exit 1
    fi
}

# Test Redis restore
test_redis_restore() {
    log "Testing Redis restore..."
    
    # Start test container
    docker run -d --name $REDIS_CONTAINER \
        -v "$TEST_DIR/dump.rdb:/data/dump.rdb" \
        redis:7-alpine
    
    # Wait for container to be ready
    sleep 10
    
    # Verify Redis
    if docker exec $REDIS_CONTAINER redis-cli PING | grep PONG; then
        log "Redis restore test successful"
    else
        log "ERROR: Redis restore test failed"
        exit 1
    fi
}

# Cleanup test environment
cleanup() {
    log "Cleaning up test environment..."
    
    # Stop and remove containers
    docker stop $POSTGRES_CONTAINER $REDIS_CONTAINER
    docker rm $POSTGRES_CONTAINER $REDIS_CONTAINER
    
    # Remove test files
    rm -rf "$TEST_DIR"
    
    log "Cleanup completed"
}

# Main execution
log "Starting restore test process..."

download_backups
decrypt_backups
test_postgres_restore
test_redis_restore
cleanup

log "Restore test completed successfully" 