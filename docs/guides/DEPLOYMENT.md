# Deployment Guide

## Prerequisites

### Infrastructure Requirements
- Kubernetes cluster (v1.24+)
- Redis cluster (v7.0+)
- PostgreSQL (v15+)
- Node.js (v18+)
- Prometheus & Grafana

### Resource Requirements
- Minimum 2 vCPU, 4GB RAM per WebSocket node
- 10GB storage per node
- Network bandwidth: 100Mbps minimum

## Environment Setup

### 1. Configuration Files
```bash
# Create configuration namespace
kubectl create namespace chat-app

# Create secrets
kubectl create secret generic chat-app-secrets \
  --from-literal=POSTGRES_URL="postgresql://user:pass@host:5432/db" \
  --from-literal=REDIS_URL="redis://host:6379" \
  --from-literal=JWT_SECRET="your-secret" \
  --namespace chat-app

# Create configmap
kubectl create configmap chat-app-config \
  --from-file=config/production.json \
  --namespace chat-app
```

### 2. Database Setup
```sql
-- Run migrations
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
\i migrations/001_initial_schema.sql
\i migrations/002_indexes.sql
\i migrations/003_functions.sql

-- Verify
SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'public';
```

### 3. Redis Setup
```bash
# Configure Redis cluster
redis-cli --cluster create \
  redis-0:6379 redis-1:6379 redis-2:6379 \
  --cluster-replicas 1

# Verify cluster health
redis-cli -h redis-0 cluster info
```

## Deployment Steps

### 1. Base Infrastructure
```yaml
# monitoring/prometheus/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: prometheus
spec:
  replicas: 1
  template:
    spec:
      containers:
      - name: prometheus
        image: prom/prometheus:v2.45.0
        ports:
        - containerPort: 9090
```

### 2. WebSocket Servers
```yaml
# kubernetes/websocket.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: websocket
spec:
  replicas: 3
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  template:
    spec:
      containers:
      - name: websocket
        image: chat-app/websocket:latest
        resources:
          requests:
            cpu: "1"
            memory: "2Gi"
          limits:
            cpu: "2"
            memory: "4Gi"
        readinessProbe:
          httpGet:
            path: /health
            port: 3002
          initialDelaySeconds: 5
          periodSeconds: 10
        livenessProbe:
          httpGet:
            path: /health
            port: 3002
          initialDelaySeconds: 15
          periodSeconds: 20
```

### 3. Load Balancer
```yaml
# kubernetes/ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: chat-app-ingress
  annotations:
    nginx.ingress.kubernetes.io/websocket-services: "websocket"
spec:
  rules:
  - host: ws.chat-app.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: websocket
            port:
              number: 3002
```

## Monitoring Setup

### 1. Prometheus
```yaml
# monitoring/prometheus/config.yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

rule_files:
  - /etc/prometheus/rules/*.yml

scrape_configs:
  - job_name: 'websocket'
    kubernetes_sd_configs:
      - role: pod
```

### 2. Grafana
```yaml
# monitoring/grafana/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: grafana
spec:
  replicas: 1
  template:
    spec:
      containers:
      - name: grafana
        image: grafana/grafana:9.5.0
        volumeMounts:
        - name: dashboards
          mountPath: /var/lib/grafana/dashboards
```

## Scaling Configuration

### 1. Horizontal Pod Autoscaling
```yaml
# kubernetes/hpa.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: websocket-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: websocket
  minReplicas: 3
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
```

### 2. Vertical Pod Autoscaling
```yaml
# kubernetes/vpa.yaml
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: websocket-vpa
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: websocket
  updatePolicy:
    updateMode: Auto
```

## Deployment Verification

### 1. Health Checks
```bash
# Check pod status
kubectl get pods -n chat-app

# Verify logs
kubectl logs -f deployment/websocket -n chat-app

# Check metrics
curl -s http://localhost:9090/metrics | grep websocket
```

### 2. Load Testing
```bash
# Run deployment tests
./scripts/test-deployment.sh

# Verify metrics in Grafana
http://grafana:3000/d/websocket-overview
```

## Rollback Procedures

### 1. Quick Rollback
```bash
# Rollback deployment
kubectl rollout undo deployment/websocket -n chat-app

# Verify rollback
kubectl rollout status deployment/websocket -n chat-app
```

### 2. Database Rollback
```bash
# Restore from backup
pg_restore -d chat_db backup.sql

# Verify data
SELECT COUNT(*) FROM messages WHERE created_at > NOW() - INTERVAL '1 hour';
```

## Maintenance Procedures

### 1. Updates
```bash
# Update application
kubectl set image deployment/websocket \
  websocket=chat-app/websocket:new-version -n chat-app

# Monitor rollout
kubectl rollout status deployment/websocket -n chat-app
```

### 2. Backups
```bash
# Database backup
pg_dump chat_db > backup_$(date +%Y%m%d).sql

# Redis backup
redis-cli save

# Verify backups
ls -lh backups/
```

## Emergency Procedures

### 1. High Load
```bash
# Scale up immediately
kubectl scale deployment websocket --replicas=10 -n chat-app

# Enable maintenance mode
kubectl patch configmap chat-app-config \
  --patch '{"data":{"MAINTENANCE_MODE":"true"}}'
```

### 2. Recovery
```bash
# Check system status
kubectl top pods -n chat-app
kubectl get events -n chat-app

# Restore service
kubectl patch configmap chat-app-config \
  --patch '{"data":{"MAINTENANCE_MODE":"false"}}'
``` 