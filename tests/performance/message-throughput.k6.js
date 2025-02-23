import ws from 'k6/ws';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter, Gauge } from 'k6/metrics';
import { randomString } from 'https://jslib.k6.io/k6-utils/1.2.0/index.js';

// Custom metrics
const messageDeliverySuccess = new Rate('message_delivery_success');
const messageLatency = new Trend('message_latency');
const messageRate = new Rate('message_rate');
const messageSize = new Trend('message_size_bytes');
const threadThroughput = new Counter('thread_messages_total');
const deliveryErrors = new Counter('delivery_errors');
const messageQueueLength = new Gauge('message_queue_length');

// Test configuration
export const options = {
  scenarios: {
    high_throughput: {
      executor: 'constant-arrival-rate',
      rate: 1000,              // 1000 messages per second
      timeUnit: '1s',
      duration: '5m',
      preAllocatedVUs: 100,
      maxVUs: 200,
    },
    burst_throughput: {
      executor: 'ramping-arrival-rate',
      startRate: 100,
      timeUnit: '1s',
      preAllocatedVUs: 100,
      maxVUs: 500,
      stages: [
        { duration: '30s', target: 5000 },   // Burst to 5000 msg/s
        { duration: '1m', target: 5000 },    // Hold burst rate
        { duration: '30s', target: 100 }     // Return to normal
      ],
    },
    sustained_load: {
      executor: 'ramping-arrival-rate',
      startRate: 100,
      timeUnit: '1s',
      preAllocatedVUs: 200,
      maxVUs: 1000,
      stages: [
        { duration: '2m', target: 1000 },    // Ramp to 1000 msg/s
        { duration: '5m', target: 1000 },    // Hold at 1000 msg/s
        { duration: '2m', target: 2000 },    // Ramp to 2000 msg/s
        { duration: '5m', target: 2000 },    // Hold at 2000 msg/s
        { duration: '1m', target: 100 }      // Ramp down
      ],
    }
  },
  thresholds: {
    'message_delivery_success': ['rate>=0.99'],     // 99% delivery success
    'message_latency': ['p(95)<=150'],             // p95 under 150ms
    'message_rate': ['rate>=0.95'],                // 95% of target message rate
    'delivery_errors': ['count<100'],              // Under 100 total errors
    'message_queue_length': ['value<1000']         // Queue under 1000 messages
  }
};

// Main test function
export default function () {
  const vuId = `user_${__VU}`;
  const threadId = `thread_${Math.floor(__VU / 10)}`;
  let socket;
  let messageCount = 0;
  let pendingMessages = new Set();

  // Initial connection
  socket = ws.connect(`${__ENV.WS_URL || 'ws://localhost:3002'}`, {
    headers: { 'X-User-ID': vuId },
  }, function (socket) {
    // Join thread
    socket.send(JSON.stringify({
      type: 'thread:join',
      threadId: threadId
    }));

    // Listen for message delivery confirmations
    socket.on('message', (data) => {
      const msg = JSON.parse(data);
      if (msg.type === 'message:delivered' && pendingMessages.has(msg.id)) {
        const latency = Date.now() - msg.sentAt;
        messageLatency.add(latency);
        messageDeliverySuccess.add(1);
        pendingMessages.delete(msg.id);
        messageQueueLength.add(pendingMessages.size);
      } else if (msg.type === 'message:error') {
        deliveryErrors.add(1);
        pendingMessages.delete(msg.id);
      } else if (msg.type === 'thread:stats') {
        threadThroughput.add(msg.messageCount);
      }
    });

    return socket;
  });

  // Generate random message content
  const content = `Test message ${messageCount++} from ${vuId} with payload: ${randomString(200)}`;
  const messageId = `msg_${vuId}_${Date.now()}`;
  
  // Track message size
  messageSize.add(Buffer.from(content).length);

  // Send message
  const sentAt = Date.now();
  pendingMessages.add(messageId);
  messageQueueLength.add(pendingMessages.size);

  socket.send(JSON.stringify({
    type: 'message:send',
    threadId: threadId,
    content: content,
    id: messageId,
    sentAt: sentAt
  }));

  messageRate.add(1);

  // Wait for delivery or timeout
  let waitStart = Date.now();
  while (pendingMessages.has(messageId) && Date.now() - waitStart < 5000) {
    sleep(0.01);
  }

  // If message wasn't delivered, count as error
  if (pendingMessages.has(messageId)) {
    deliveryErrors.add(1);
    pendingMessages.delete(messageId);
  }

  // Get thread stats periodically
  if (Math.random() < 0.01) { // 1% chance per iteration
    socket.send(JSON.stringify({
      type: 'thread:stats',
      threadId: threadId
    }));
  }
}

// Test setup
export function setup() {
  // Create test threads
  const response = ws.connect(`${__ENV.WS_URL || 'ws://localhost:3002'}`, {
    headers: { 'X-User-ID': 'setup_user' },
  }, function (socket) {
    socket.on('open', () => {
      socket.send(JSON.stringify({
        type: 'setup:verify',
        data: { threadCount: Math.ceil(__VU / 10) }
      }));
    });
  });

  check(response, {
    'setup successful': (r) => r === true,
  });
}

// Test cleanup
export function teardown(data) {
  ws.connect(`${__ENV.WS_URL || 'ws://localhost:3002'}`, {
    headers: { 'X-User-ID': 'teardown_user' },
  }, function (socket) {
    socket.on('open', () => {
      socket.send(JSON.stringify({
        type: 'teardown:cleanup',
        data: { testId: __VU }
      }));
    });
  });
} 