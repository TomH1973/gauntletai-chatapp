import ws from 'k6/ws';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';
import { randomString } from 'https://jslib.k6.io/k6-utils/1.2.0/index.js';

// Custom metrics
const stateVerificationSuccess = new Rate('state_verification_success');
const stateRestorationSuccess = new Rate('state_restoration_success');
const verificationTime = new Trend('state_verification_time');
const restorationTime = new Trend('state_restoration_time');
const stateSize = new Trend('state_size_bytes');
const recoveryAttempts = new Counter('recovery_attempts');
const recoveryErrors = new Counter('recovery_errors');

// Test configuration
export const options = {
  scenarios: {
    recovery_test: {
      executor: 'ramping-vus',
      startVUs: 10,
      stages: [
        { duration: '30s', target: 50 },    // Ramp up to 50 users
        { duration: '1m', target: 50 },     // Hold at 50 users
        { duration: '30s', target: 100 },   // Ramp up to 100 users
        { duration: '1m', target: 100 },    // Hold at 100 users
        { duration: '30s', target: 0 }      // Ramp down to 0
      ],
    }
  },
  thresholds: {
    'state_verification_success': ['rate>=0.95'],   // 95% verification success
    'state_restoration_success': ['rate>=0.95'],    // 95% restoration success
    'state_verification_time': ['p(95)<=1000'],     // 95% verify in under 1s
    'state_restoration_time': ['p(95)<=2000'],      // 95% restore in under 2s
    'state_size_bytes': ['p(95)<=50000'],          // 95% under 50KB
    'recovery_errors': ['count<10']                 // Less than 10 errors total
  }
};

// Main test function
export default function () {
  const vuId = `user_${__VU}`;
  const threadId = `thread_${Math.floor(__VU / 10)}`;
  let socket;
  let messageCount = 0;
  let stateVerified = false;

  // Initial connection
  socket = ws.connect(`${__ENV.WS_URL || 'ws://localhost:3002'}`, {
    headers: { 'X-User-ID': vuId },
  }, function (socket) {
    // Join thread
    socket.send(JSON.stringify({
      type: 'thread:join',
      threadId: threadId
    }));

    // Send some messages to build up state
    const interval = setInterval(() => {
      if (socket.readyState === 1) {
        socket.send(JSON.stringify({
          type: 'message:send',
          threadId: threadId,
          content: `Message ${messageCount++} from ${vuId}`,
          id: `msg_${vuId}_${messageCount}`
        }));
      }
    }, 1000);

    // Listen for events
    socket.on('message', (data) => {
      const msg = JSON.parse(data);
      
      if (msg.type === 'state:verified') {
        const verifyEnd = Date.now();
        verificationTime.add(verifyEnd - verifyStart);
        stateVerificationSuccess.add(1);
        stateVerified = true;
        if (msg.state) {
          stateSize.add(JSON.stringify(msg.state).length);
        }
      } else if (msg.type === 'state:restored') {
        const restoreEnd = Date.now();
        restorationTime.add(restoreEnd - restoreStart);
        stateRestorationSuccess.add(1);
        if (msg.state) {
          stateSize.add(JSON.stringify(msg.state).length);
        }
      } else if (msg.type === 'error') {
        recoveryErrors.add(1);
      }
    });

    return interval;
  });

  // Wait for some state to accumulate
  sleep(5);

  // Force disconnect and verify state
  let verifyStart = Date.now();
  socket.send(JSON.stringify({
    type: 'state:verify',
    threadId: threadId
  }));

  // Wait for state verification
  while (!stateVerified && Date.now() - verifyStart < 5000) {
    sleep(0.1);
  }

  // Force disconnect
  socket.close();
  sleep(1);

  // Attempt recovery
  recoveryAttempts.add(1);
  let restoreStart = Date.now();
  socket = ws.connect(`${__ENV.WS_URL || 'ws://localhost:3002'}`, {
    headers: {
      'X-User-ID': vuId,
      'X-Reconnect': 'true'
    },
  });

  // Run for the duration of the test
  sleep(1);
}

// Test setup
export function setup() {
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