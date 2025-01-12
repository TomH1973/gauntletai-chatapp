#!/bin/bash
set -e

# Configuration
BACKUP_DIR="/opt/chatapp/backups"
POSTGRES_CONTAINER="chatapp-postgres"
S3_BUCKET="chatapp-backups"
DATE=$(date +%Y%m%d_%H%M%S)

# Logging setup
LOG_FILE="$BACKUP_DIR/logs/wal_archive_${DATE}.log"
exec 1> >(tee -a "$LOG_FILE") 2>&1

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

# Archive WAL files
archive_wal() {
    log "Starting WAL archiving..."
    
    # Create WAL archive directory if not exists
    mkdir -p "$BACKUP_DIR/postgres/wal"
    
    # Switch to new WAL segment
    docker exec $POSTGRES_CONTAINER psql -U postgres -c "SELECT pg_switch_wal();"
    
    # Archive current WAL files
    docker exec $POSTGRES_CONTAINER pg_archivewalcopy \
        "$BACKUP_DIR/postgres/wal"
    
    # Encrypt and upload to S3
    for wal in "$BACKUP_DIR/postgres/wal"/*; do
        if [ -f "$wal" ]; then
            # Encrypt WAL file
            gpg --encrypt --recipient backup@chatapp.example.com \
                "$wal" > "${wal}.gpg"
            
            # Upload to S3
            aws s3 cp "${wal}.gpg" \
                "s3://${S3_BUCKET}/postgres/wal/"
            
            # Remove original and encrypted files
            rm "$wal" "${wal}.gpg"
        fi
    done
    
    log "WAL archiving completed"
}

# Main execution
log "Starting WAL archive process..."
archive_wal
log "WAL archive process completed successfully" 