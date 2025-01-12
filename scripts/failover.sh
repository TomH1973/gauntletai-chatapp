#!/bin/bash
set -e

# Configuration
PRIMARY_REGION="us-east-1"
SECONDARY_REGION="us-west-2"
ROUTE53_ZONE_ID="YOUR_ZONE_ID"
DNS_NAME="chatapp.example.com"
HEALTH_CHECK_URL="https://chatapp.example.com/api/health"
SLACK_WEBHOOK_URL="YOUR_WEBHOOK_URL"

# Logging setup
LOG_FILE="/var/log/chatapp/failover.log"
mkdir -p "$(dirname "$LOG_FILE")"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

notify_slack() {
    curl -X POST -H 'Content-type: application/json' \
        --data "{\"text\":\"$1\"}" \
        "$SLACK_WEBHOOK_URL"
}

check_health() {
    local region=$1
    local endpoint="https://$region.$DNS_NAME/api/health"
    
    if curl -s -f "$endpoint" > /dev/null; then
        return 0
    else
        return 1
    fi
}

perform_failover() {
    log "Initiating failover from $PRIMARY_REGION to $SECONDARY_REGION"
    notify_slack "🚨 Initiating failover from $PRIMARY_REGION to $SECONDARY_REGION"

    # Check secondary region health before failover
    if ! check_health "$SECONDARY_REGION"; then
        log "ERROR: Secondary region is not healthy. Aborting failover."
        notify_slack "❌ Failover aborted: Secondary region unhealthy"
        exit 1
    }

    # Update Route53 DNS
    aws route53 change-resource-record-sets \
        --hosted-zone-id "$ROUTE53_ZONE_ID" \
        --change-batch '{
            "Changes": [{
                "Action": "UPSERT",
                "ResourceRecordSet": {
                    "Name": "'$DNS_NAME'",
                    "Type": "A",
                    "SetIdentifier": "failover",
                    "Region": "'$SECONDARY_REGION'",
                    "TTL": 60,
                    "ResourceRecords": [{"Value": "'$SECONDARY_REGION'"}]
                }
            }]
        }'

    # Wait for DNS propagation
    log "Waiting for DNS propagation (60s)..."
    sleep 60

    # Verify failover
    if check_health "$SECONDARY_REGION"; then
        log "Failover completed successfully"
        notify_slack "✅ Failover completed successfully to $SECONDARY_REGION"
    else
        log "ERROR: Failover verification failed"
        notify_slack "❌ Failover verification failed"
        exit 1
    fi
}

# Main execution
log "Starting failover health check"

if ! check_health "$PRIMARY_REGION"; then
    log "Primary region unhealthy, initiating failover"
    perform_failover
else
    log "Primary region healthy, no failover needed"
fi 