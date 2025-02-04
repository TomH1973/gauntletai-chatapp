import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';
import ws from 'k6/ws';

// Custom metrics
const messageDeliveryRate = new Rate('message_delivery_rate');
const socketConnectionRate = new Rate('socket_connection_rate');
const messageProcessingTime = new Rate('message_processing_time');

// Test configuration
export const options = {
  scenarios: {
    // Basic message sending load test
    message_load: {
      executor: 'ramping-vus',
      startVUs: 1,
      stages: [
        { duration: '1m', target: 50 },  // Ramp up to 50 users
        { duration: '3m', target: 50 },  // Stay at 50 users
        { duration: '1m', target: 0 },   // Ramp down to 0
      ],
      gracefulRampDown: '30s',
    },
    // Real-time messaging stress test
    realtime_stress: {
      executor: 'constant-vus',
      vus: 100,
      duration: '5m',
    },
    // Connection handling test
    connection_stress: {
      executor: 'ramping-vus',
      startVUs: 10,
      stages: [
        { duration: '30s', target: 100 }, // Quick ramp-up
        { duration: '1m', target: 100 },  // Hold
        { duration: '30s', target: 10 },  // Quick ramp-down
      ],
    },
  },
  thresholds: {
    message_delivery_rate: ['p95<500'], // 95% of messages delivered in under 500ms
    socket_connection_rate: ['p95<1000'], // 95% of socket connections in under 1s
    message_processing_time: ['p95<200'], // 95% of messages processed in under 200ms
    http_req_duration: ['p95<1000'], // 95% of requests under 1s
  },
};

// Simulated user behavior
export default function () {
  // 1. User Authentication
  const loginRes = http.post(`${__ENV.API_URL}/auth/signin`, {
    email: `test${__VU}@example.com`,
    password: 'testpassword',
  });

  check(loginRes, {
    'login successful': (r) => r.status === 200,
  });

  const authToken = loginRes.json('token');

  // 2. WebSocket Connection
  const wsStart = Date.now();
  const ws_url = `${__ENV.WS_URL}?token=${authToken}`;
  
  const socket = ws.connect(ws_url, {}, function (socket) {
    socketConnectionRate.add(Date.now() - wsStart);

    socket.on('open', () => {
      console.log('Connected to WebSocket');
    });

    socket.on('message', (data) => {
      const message = JSON.parse(data);
      if (message.type === 'message:new') {
        messageDeliveryRate.add(Date.now() - message.timestamp);
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
      `${__ENV.API_URL}/api/threads/${threadId}/messages`,
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
    `${__ENV.API_URL}/api/threads`,
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
  const setupRes = http.post(`${__ENV.API_URL}/test/setup`, {
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
    const cleanupRes = http.post(`${__ENV.API_URL}/test/cleanup`);
    check(cleanupRes, {
      'test data cleanup successful': (r) => r.status === 200,
    });
  }
} 