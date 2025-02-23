# Performance Tuning Guide

## Performance Targets

### Critical Path (P0)
- Message Delivery: p95 < 150ms (current: 110ms)
- Search Response: p95 < 750ms (current: 600ms)
- Thread Load: p95 < 300ms (current: ~250ms)
- API Response: p95 < 100ms
- Error Rate: < 0.5% (current: 0.02%)

### Resource Thresholds (P1)
- CPU Usage: < 80% (current: 45%)
- Memory Usage: < 4GB (current: 2.8GB)
- Cache Miss Rate: < 30% (current: ~25%)
- Network Usage: < 70%
- Connection Drop Rate: < 1% (current: 0.01%)

## Optimization Areas

### 1. Message Pipeline
```typescript
// Optimize batch processing in WebSocketHandlers
const BATCH_SIZE = 100;  // Adjust based on message size
const BATCH_INTERVAL = 50; // Milliseconds

// Monitor queue length
metrics.messageQueueLength.set(batchQueues.size);
```

#### Tuning Parameters
- `BATCH_SIZE`: 50-200 messages (memory vs latency)
- `BATCH_INTERVAL`: 25-100ms (throughput vs latency)
- Redis operation batching threshold: 1000 ops/sec

### 2. Connection Management

⚠️ **Critical Issues**:
- Current default Socket.IO settings causing frequent reconnections
- No exponential backoff strategy
- Missing heartbeat monitoring
- Connection instability under load

```typescript
// Recommended Socket.IO configuration
const io = new Server(httpServer, {
  pingTimeout: 60000,        // Increased from 30s to handle network jitter
  pingInterval: 25000,       // Increased from 10s to reduce overhead
  upgradeTimeout: 10000,
  maxHttpBufferSize: 1e6,
  connectTimeout: 45000,     // Added to handle slow connections
  transports: ['websocket'], // Force WebSocket transport
  allowUpgrades: false,      // Prevent transport switching
  retries: 3,               // Maximum reconnection attempts
  reconnectionDelay: 1000,  // Start with 1s delay
  reconnectionDelayMax: 5000, // Max 5s delay
  reconnectionAttempts: 5,   // Give up after 5 attempts
});

// Add connection monitoring
io.on('connection', (socket) => {
  const startTime = Date.now();
  
  socket.conn.on('packet', (packet) => {
    if (packet.type === 'ping') {
      metrics.latency.observe(Date.now() - startTime);
    }
  });

  socket.conn.on('close', (reason) => {
    metrics.disconnections.inc({ reason });
  });
});
```

#### Tuning Parameters
- `pingTimeout`: 45-60s (stability vs resource usage)
- `pingInterval`: 20-30s (responsiveness vs overhead)
- `maxHttpBufferSize`: 1-5MB (memory vs message size)
- `reconnectionDelay`: 1-5s (client recovery vs server load)

#### Monitoring Recommendations
- Track connection duration distribution
- Monitor reconnection frequency
- Alert on abnormal disconnect rates
- Log connection drop reasons

### 3. Redis Optimization
```typescript
// Configure Redis client
const redis = new Redis({
  maxRetriesPerRequest: 3,
  enableReadyCheck: false,
  enableOfflineQueue: true,
  commandTimeout: 5000
});
```

#### Tuning Parameters
- Connection pool size: 10-50 per instance
- Command timeout: 2-10s
- Retry strategy: exponential backoff

### 4. Search Performance
```typescript
// Optimize search queries
const SEARCH_CACHE_TTL = 300; // 5 minutes
const MAX_SEARCH_RESULTS = 100;
const SEARCH_BATCH_SIZE = 20;
```

#### Tuning Parameters
- Cache TTL: 5-15 minutes
- Result limit: 50-200 items
- Index refresh interval: 30-60s

## Monitoring & Alerts

### Key Metrics
1. Message Flow
   - Delivery latency (p95)
   - Queue length
   - Batch size
   - Error rate

2. Resource Usage
   - CPU utilization
   - Memory consumption
   - Network I/O
   - Redis operations

3. Business Metrics
   - Active users
   - Messages per second
   - Thread activity
   - Search queries

### Alert Thresholds
```yaml
# In monitoring/prometheus/rules/performance.yml
groups:
  - name: performance
    rules:
      - alert: HighMessageLatency
        expr: histogram_quantile(0.95, rate(message_delivery_duration_seconds_bucket[5m])) > 0.150
        for: 5m
        labels:
          severity: warning
```

## Scaling Guidelines

### Horizontal Scaling
1. WebSocket Servers
   - Scale at 70% CPU or 10K connections
   - Add instances in pairs
   - Keep N+1 redundancy

2. Redis Cluster
   - Primary metrics: ops/sec, memory usage
   - Scale at 70% memory or 50K ops/sec
   - Maintain replica for each shard

### Vertical Scaling
1. Instance Sizing
   - Start: 2 vCPU, 4GB RAM
   - Medium: 4 vCPU, 8GB RAM
   - Large: 8 vCPU, 16GB RAM

2. Connection Limits
   - 5K connections per vCPU
   - 10MB RAM per 100 active connections
   - Scale up at 80% resource usage

## Troubleshooting

### High Latency
1. Check message queue length
2. Monitor batch processing time
3. Verify Redis operation latency
4. Inspect network metrics

### Memory Issues
1. Monitor WebSocket connection count
2. Check Redis memory usage
3. Verify message batch sizes
4. Inspect cache eviction rate

### High CPU Usage
1. Profile message processing
2. Check search query patterns
3. Monitor batch processing
4. Verify connection handling

## Performance Testing

### Prerequisites

#### Installing k6
k6 is required for running performance tests. Install it using one of the following methods:

##### Windows
```powershell
# Using Chocolatey
choco install k6

# Or download and install manually from:
# https://dl.k6.io/msi/k6-latest-amd64.msi
```

##### Linux
```bash
# Using apt
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt update
sudo apt install k6

# Using snap
sudo snap install k6
```

##### macOS
```bash
# Using Homebrew
brew install k6
```

### Running Tests
```bash
# Run throughput tests
./scripts/test-throughput.sh

# Run concurrent connection tests
./scripts/test-concurrent.sh

# Run recovery tests
./scripts/test-recovery.sh

# Or run individual k6 tests directly
k6 run tests/performance/message-throughput.k6.js
k6 run tests/performance/concurrent-connections.k6.js
k6 run tests/performance/recovery.k6.js
```

### Test Scenarios
1. Sustained Load
   - 1000 msg/s for 5m
   - 2000 concurrent users
   - < 150ms p95 latency

2. Burst Load
   - 5000 msg/s for 30s
   - 5000 concurrent users
   - < 250ms p95 latency

3. Recovery Testing
   - 1000 connections
   - Forced disconnects
   - < 2s recovery time 