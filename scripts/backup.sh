#!/bin/bash
set -e

# Configuration
BACKUP_DIR="/opt/chatapp/backups"
POSTGRES_CONTAINER="chatapp-postgres"
REDIS_CONTAINER="chatapp-redis"
RETENTION_DAYS=30
BACKUP_PREFIX="chatapp"
S3_BUCKET="chatapp-backups"
DATE=$(date +%Y%m%d_%H%M%S)

# Create backup directories
mkdir -p "$BACKUP_DIR/postgres"
mkdir -p "$BACKUP_DIR/redis"
mkdir -p "$BACKUP_DIR/logs"

# Logging setup
LOG_FILE="$BACKUP_DIR/logs/backup_${DATE}.log"
exec 1> >(tee -a "$LOG_FILE") 2>&1

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

# Backup PostgreSQL
backup_postgres() {
    log "Starting PostgreSQL backup..."
    
    # Create WAL archive if not exists
    mkdir -p "$BACKUP_DIR/postgres/wal"
    
    # Perform full backup
    docker exec $POSTGRES_CONTAINER pg_basebackup \
        -D "$BACKUP_DIR/postgres/base_${DATE}" \
        -Ft -z -P -v
    
    # Archive WAL files
    docker exec $POSTGRES_CONTAINER pg_archivecleanup \
        "$BACKUP_DIR/postgres/wal" \
        $(ls -t "$BACKUP_DIR/postgres/wal" | head -n1)
    
    log "PostgreSQL backup completed"
}

# Backup Redis
backup_redis() {
    log "Starting Redis backup..."
    
    # Save Redis data
    docker exec $REDIS_CONTAINER redis-cli SAVE
    
    # Copy dump.rdb
    docker cp \
        $REDIS_CONTAINER:/data/dump.rdb \
        "$BACKUP_DIR/redis/dump_${DATE}.rdb"
    
    log "Redis backup completed"
}

# Verify backups
verify_backups() {
    log "Verifying backups..."
    
    # Verify PostgreSQL backup
    if pg_verifybackup "$BACKUP_DIR/postgres/base_${DATE}"; then
        log "PostgreSQL backup verified successfully"
    else
        log "ERROR: PostgreSQL backup verification failed"
        exit 1
    fi
    
    # Verify Redis backup
    if redis-check-rdb "$BACKUP_DIR/redis/dump_${DATE}.rdb"; then
        log "Redis backup verified successfully"
    else
        log "ERROR: Redis backup verification failed"
        exit 1
    fi
}

# Encrypt backups
encrypt_backups() {
    log "Encrypting backups..."
    
    # Encrypt PostgreSQL backup
    tar czf - "$BACKUP_DIR/postgres/base_${DATE}" | \
        gpg --encrypt --recipient backup@chatapp.example.com \
        > "$BACKUP_DIR/postgres/base_${DATE}.tar.gz.gpg"
    
    # Encrypt Redis backup
    gpg --encrypt --recipient backup@chatapp.example.com \
        "$BACKUP_DIR/redis/dump_${DATE}.rdb" \
        > "$BACKUP_DIR/redis/dump_${DATE}.rdb.gpg"
    
    log "Backup encryption completed"
}

# Upload to S3
upload_to_s3() {
    log "Uploading backups to S3..."
    
    # Upload PostgreSQL backup
    aws s3 cp \
        "$BACKUP_DIR/postgres/base_${DATE}.tar.gz.gpg" \
        "s3://${S3_BUCKET}/postgres/"
    
    # Upload Redis backup
    aws s3 cp \
        "$BACKUP_DIR/redis/dump_${DATE}.rdb.gpg" \
        "s3://${S3_BUCKET}/redis/"
    
    log "Backup upload completed"
}

# Cleanup old backups
cleanup_old_backups() {
    log "Cleaning up old backups..."
    
    # Remove local backups older than retention period
    find "$BACKUP_DIR" -type f -mtime +$RETENTION_DAYS -delete
    
    # Remove old S3 backups
    aws s3 ls "s3://${S3_BUCKET}" --recursive | \
        while read -r line; do
            createDate=$(echo $line | awk {'print $1" "$2'})
            createDate=$(date -d "$createDate" +%s)
            olderThan=$(date -d "-$RETENTION_DAYS days" +%s)
            if [[ $createDate -lt $olderThan ]]; then
                fileName=$(echo $line | awk {'print $4'})
                aws s3 rm "s3://${S3_BUCKET}/$fileName"
            fi
        done
    
    log "Cleanup completed"
}

# Main execution
log "Starting backup process..."

backup_postgres
backup_redis
verify_backups
encrypt_backups
upload_to_s3
cleanup_old_backups

log "Backup process completed successfully" 