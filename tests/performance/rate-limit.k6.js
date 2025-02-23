import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';
import ws from 'k6/ws';
import { randomString } from 'https://jslib.k6.io/k6-utils/1.2.0/index.js';

// Custom metrics
const rateLimitBlocks = new Rate('rate_limit_blocks');
const rateLimitLatency = new Trend('rate_limit_latency');
const burstLimitHits = new Counter('burst_limit_hits');
const anomalyDetections = new Counter('anomaly_detections');
const adaptiveLimitChanges = new Counter('adaptive_limit_changes');

// Test configuration
export const options = {
  scenarios: {
    normal_usage: {
      executor: 'ramping-vus',
      startVUs: 1,
      stages: [
        { duration: '1m', target: 20 },
        { duration: '3m', target: 20 },
        { duration: '1m', target: 0 }
      ],
    },
    burst_test: {
      executor: 'constant-arrival-rate',
      rate: 100,
      timeUnit: '1s',
      duration: '30s',
      preAllocatedVUs: 50,
      maxVUs: 100,
    },
    anomaly_simulation: {
      executor: 'per-vu-iterations',
      vus: 5,
      iterations: 100,
      startTime: '5m',
    }
  },
  thresholds: {
    'rate_limit_blocks': ['rate<0.1'],  // Less than 10% of requests blocked
    'rate_limit_latency': ['p95<50'],   // 95% of checks under 50ms
    'http_req_duration': ['p95<200'],   // 95% of requests under 200ms
  }
};

// Simulate different types of actions
const ACTIONS = {
  MESSAGE_SEND: 'message:send',
  REACTION_ADD: 'reaction:add',
  FILE_UPLOAD: 'file:upload',
  TYPING_UPDATE: 'typing:update'
};

// WebSocket connection setup
function setupWebSocket(userId) {
  return ws.connect('ws://localhost:3000/ws', {
    headers: { 'X-User-ID': userId },
  }, (socket) => {
    socket.on('open', () => {
      console.log('Connected');
    });
    
    socket.on('message', (data) => {
      const response = JSON.parse(data);
      if (response.type === 'rate_limit') {
        rateLimitBlocks.add(response.allowed ? 0 : 1);
      }
    });
  });
}

// Normal usage simulation
export function normalUsage() {
  const userId = `user_${__VU}`;
  const socket = setupWebSocket(userId);
  
  try {
    // Simulate normal message sending pattern
    for (let i = 0; i < 10; i++) {
      const start = new Date();
      socket.send(JSON.stringify({
        type: ACTIONS.MESSAGE_SEND,
        content: randomString(20)
      }));
      rateLimitLatency.add(new Date() - start);
      sleep(1);
    }
    
    // Simulate reactions
    for (let i = 0; i < 5; i++) {
      socket.send(JSON.stringify({
        type: ACTIONS.REACTION_ADD,
        messageId: `msg_${i}`,
        reaction: '👍'
      }));
      sleep(0.5);
    }
  } finally {
    socket.close();
  }
}

// Burst testing
export function burstTest() {
  const userId = `burst_${__VU}`;
  const socket = setupWebSocket(userId);
  
  try {
    // Rapid-fire messages to trigger burst protection
    for (let i = 0; i < 20; i++) {
      socket.send(JSON.stringify({
        type: ACTIONS.MESSAGE_SEND,
        content: randomString(10)
      }));
    }
    burstLimitHits.add(1);
  } finally {
    socket.close();
  }
}

// Anomaly simulation
export function anomalyTest() {
  const userId = `anomaly_${__VU}`;
  const socket = setupWebSocket(userId);
  
  try {
    // Simulate suspicious behavior
    for (let i = 0; i < 50; i++) {
      socket.send(JSON.stringify({
        type: ACTIONS.MESSAGE_SEND,
        content: randomString(5)
      }));
      
      if (i % 10 === 0) {
        socket.send(JSON.stringify({
          type: ACTIONS.FILE_UPLOAD,
          fileId: `file_${i}`
        }));
      }
      
      sleep(0.1);
    }
    anomalyDetections.add(1);
  } finally {
    socket.close();
  }
}

// Adaptive limit testing
export function adaptiveLimitTest() {
  const userId = `adaptive_${__VU}`;
  const socket = setupWebSocket(userId);
  
  try {
    // Build up normal behavior pattern
    for (let i = 0; i < 30; i++) {
      socket.send(JSON.stringify({
        type: ACTIONS.MESSAGE_SEND,
        content: randomString(15)
      }));
      sleep(1);
    }
    
    // Test adaptive limit adjustment
    for (let i = 0; i < 40; i++) {
      socket.send(JSON.stringify({
        type: ACTIONS.MESSAGE_SEND,
        content: randomString(15)
      }));
      sleep(0.5);
    }
    adaptiveLimitChanges.add(1);
  } finally {
    socket.close();
  }
}

// Default function
export default function() {
  const scenario = __ITER % 4;
  switch(scenario) {
    case 0:
      normalUsage();
      break;
    case 1:
      burstTest();
      break;
    case 2:
      anomalyTest();
      break;
    case 3:
      adaptiveLimitTest();
      break;
  }
}

// Setup function to prepare test data
export function setup() {
  // Create test users if needed
  const response = http.post(`${API_URL}/test/setup`, {
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      userCount: 100,
    }),
  });
  
  check(response, {
    'setup successful': (r) => r.status === 200,
  });
}

// Cleanup after tests
export function teardown(data) {
  http.post(`${API_URL}/test/cleanup`);
} 