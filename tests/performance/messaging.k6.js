import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';
import ws from 'k6/ws';

// Default environment variables if not provided
const API_URL = __ENV.API_URL || 'http://localhost:3000';
const WS_URL = __ENV.WS_URL || 'ws://localhost:3001';

// Custom metrics
const messageDeliveryRate = new Rate('message_delivery_rate');
const socketConnectionRate = new Rate('socket_connection_rate');
const messageProcessingTime = new Trend('message_processing_time');
const messageDeliveryTime = new Trend('message_delivery_time');

// Test configuration
export const options = {
  scenarios: {
    // Basic message sending load test
    message_load: {
      executor: 'ramping-vus',
      startVUs: 1,
      stages: [
        { duration: '30s', target: 25 },  // Ramp up to 25 users
        { duration: '1m', target: 25 },   // Stay at 25 users
        { duration: '30s', target: 0 },   // Ramp down to 0
      ],
      gracefulRampDown: '30s',
    },
    // Real-time messaging stress test
    realtime_stress: {
      executor: 'constant-vus',
      vus: 50,
      duration: '2m',
    },
    // Connection handling test
    connection_stress: {
      executor: 'ramping-vus',
      startVUs: 5,
      stages: [
        { duration: '30s', target: 50 },  // Quick ramp-up
        { duration: '1m', target: 50 },   // Hold
        { duration: '30s', target: 5 },   // Quick ramp-down
      ],
    },
  },
  thresholds: {
    'message_delivery_rate': ['rate>0.90'],     // 90% success rate
    'socket_connection_rate': ['rate>0.90'],     // 90% success rate
    'message_processing_time': ['p(95)<500'],    // 95% under 500ms
    'message_delivery_time': ['p(95)<1000'],     // 95% under 1s
    'http_req_duration': ['p(95)<2000'],         // 95% under 2s
  },
};

// Simulated user behavior
export default function () {
  // 1. User Authentication
  const loginRes = http.post(`${API_URL}/auth/signin`, {
    email: `test${__VU}@example.com`,
    password: 'testpassword',
  });

  check(loginRes, {
    'login successful': (r) => r.status === 200,
  });

  const authToken = loginRes.json('token');

  // 2. WebSocket Connection
  const wsStart = Date.now();
  const ws_url = `${WS_URL}?token=${authToken}`;
  
  const socket = ws.connect(ws_url, {}, function (socket) {
    socketConnectionRate.add(Date.now() - wsStart);

    socket.on('open', () => {
      console.log('Connected to WebSocket');
    });

    socket.on('message', (data) => {
      const message = JSON.parse(data);
      if (message.type === 'message:new') {
        messageDeliveryTime.add(Date.now() - message.timestamp);
        messageDeliveryRate.add(1); // Success
      }
    });

    socket.on('error', (e) => {
      console.error('WebSocket error: ', e);
    });
  });

  // 3. Message Sending Test
  for (let i = 0; i < 5; i++) {
    const threadId = `thread_${__VU % 10}`; // Distribute users across 10 threads
    const start = Date.now();

    // Send message
    const messageRes = http.post(
      `${API_URL}/api/threads/${threadId}/messages`,
      JSON.stringify({
        content: `Test message ${i} from VU ${__VU}`,
        timestamp: Date.now(),
      }),
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
      }
    );

    messageProcessingTime.add(Date.now() - start);

    check(messageRes, {
      'message sent successfully': (r) => r.status === 201,
    });

    sleep(1); // 1 second between messages
  }

  // 4. Thread Management Under Load
  const threadRes = http.post(
    `${API_URL}/api/threads`,
    JSON.stringify({
      name: `Load Test Thread ${__VU}`,
      participants: [`test${(__VU + 1) % 100}@example.com`],
    }),
    {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
    }
  );

  check(threadRes, {
    'thread created successfully': (r) => r.status === 201,
  });

  // 5. Real-time Features Test
  if (socket.connected) {
    socket.send(JSON.stringify({
      type: 'typing:start',
      threadId: `thread_${__VU % 10}`,
    }));

    sleep(0.5); // Simulate typing for 500ms

    socket.send(JSON.stringify({
      type: 'typing:stop',
      threadId: `thread_${__VU % 10}`,
    }));
  }

  // Cleanup
  socket.close();
}

// Helper functions for data generation
function generateMessage(vu, i) {
  return {
    content: `Performance test message ${i} from user ${vu}`,
    timestamp: Date.now(),
  };
}

// Test data setup (runs once before tests)
export function setup() {
  // Create test users if needed
  const setupRes = http.post(`${API_URL}/test/setup`, {
    userCount: 100,
    threadsPerUser: 2,
  });
  
  check(setupRes, {
    'test data setup successful': (r) => r.status === 200,
  });
  
  return { setupComplete: true };
}

// Cleanup after tests
export function teardown(data) {
  if (data.setupComplete) {
    const cleanupRes = http.post(`${API_URL}/test/cleanup`);
    check(cleanupRes, {
      'test data cleanup successful': (r) => r.status === 200,
    });
  }
} 