import WebSocket from 'ws';
import { performance } from 'perf_hooks';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Test configuration
const config = {
  target: 'ws://localhost:3002/socket.io/?EIO=4&transport=websocket',
  phases: [
    { duration: 30, users: 10, rampUp: true },
    { duration: 60, users: 10 },
    { duration: 30, users: 20, rampUp: true },
    { duration: 60, users: 20 },
    { duration: 30, users: 0, rampDown: true }
  ],
  metrics: {
    connectionSuccess: { count: 0, total: 0 },
    connectionTime: { values: [], min: Infinity, max: 0, avg: 0 },
    messageDelivery: { count: 0, total: 0 },
    messageLatency: { values: [], min: Infinity, max: 0, avg: 0 },
    activeConnections: 0
  }
};

// Helper functions
async function generateUser() {
  const user = await prisma.user.create({
    data: {
      name: `Test User ${Math.floor(Math.random() * 1000000)}`,
      email: `test${Math.floor(Math.random() * 1000000)}@example.com`,
      isActive: true,
      lastSeen: new Date()
    }
  });
  return user;
}

async function generateThread(userId) {
  const thread = await prisma.thread.create({
    data: {
      name: `Test Thread ${Math.floor(Math.random() * 1000000)}`,
      participants: {
        create: [{
          userId
        }]
      }
    }
  });
  return thread;
}

function formatSocketIOMessage(event, data) {
  return `42["${event}",${JSON.stringify(data)}]`;
}

function parseSocketIOMessage(data) {
  if (typeof data !== 'string') return null;
  
  // Socket.IO v4 handshake response format
  if (data.startsWith('0')) {
    try {
      const handshake = JSON.parse(data.slice(1));
      return { type: 'socket.io:handshake', sid: handshake.sid };
    } catch (e) {
      console.error('Error parsing handshake:', e);
      return null;
    }
  }
  
  if (data.startsWith('40')) return { type: 'socket.io:connected' };
  if (data.startsWith('42')) {
    try {
      const [event, payload] = JSON.parse(data.slice(2));
      return { type: event, payload };
    } catch (e) {
      console.error('Error parsing message:', e);
      return null;
    }
  }
  return null;
}

// Test runner
async function runTest() {
  let activeUsers = 0;
  let startTime = performance.now();
  let testDuration = 0;

  // Calculate total test duration
  testDuration = config.phases.reduce((acc, phase) => acc + phase.duration, 0);

  // Start test phases
  for (const phase of config.phases) {
    console.log(`Starting phase: ${phase.rampUp ? 'Ramp Up' : phase.rampDown ? 'Ramp Down' : 'Steady'}`);
    
    const targetUsers = phase.users;
    const stepDuration = phase.duration * 1000 / Math.abs(targetUsers - activeUsers);
    const step = targetUsers > activeUsers ? 1 : -1;

    while (activeUsers !== targetUsers) {
      if (step > 0) {
        // Add user
        const user = await generateUser();
        const thread = await generateThread(user.id);
        createUser(user.id, thread.id);
        activeUsers++;
      } else {
        // Remove user
        activeUsers--;
      }

      await new Promise(resolve => setTimeout(resolve, stepDuration));
    }

    // Hold steady for phase duration
    await new Promise(resolve => setTimeout(resolve, phase.duration * 1000));
  }

  // Print results
  const results = {
    connectionSuccess: config.metrics.connectionSuccess.count / config.metrics.connectionSuccess.total,
    connectionTime: {
      min: config.metrics.connectionTime.min,
      max: config.metrics.connectionTime.max,
      avg: config.metrics.connectionTime.values.reduce((a, b) => a + b, 0) / config.metrics.connectionTime.values.length,
      p95: config.metrics.connectionTime.values.sort((a, b) => a - b)[Math.floor(config.metrics.connectionTime.values.length * 0.95)]
    },
    messageDelivery: config.metrics.messageDelivery.count / config.metrics.messageDelivery.total,
    messageLatency: {
      min: config.metrics.messageLatency.min,
      max: config.metrics.messageLatency.max,
      avg: config.metrics.messageLatency.values.reduce((a, b) => a + b, 0) / config.metrics.messageLatency.values.length,
      p95: config.metrics.messageLatency.values.sort((a, b) => a - b)[Math.floor(config.metrics.messageLatency.values.length * 0.95)]
    }
  };

  console.log('Test Results:', JSON.stringify(results, null, 2));

  // Clean up
  await prisma.$disconnect();
}

function createUser(userId, threadId) {
  const connectStart = performance.now();
  config.metrics.connectionSuccess.total++;

  const ws = new WebSocket(config.target, {
    headers: {
      'Cookie': `userId=${userId}`
    }
  });

  let messageReceived = false;
  let messageSentTime;

  ws.on('open', () => {
    config.metrics.connectionSuccess.count++;
    const connectTime = performance.now() - connectStart;
    config.metrics.connectionTime.values.push(connectTime);
    config.metrics.connectionTime.min = Math.min(config.metrics.connectionTime.min, connectTime);
    config.metrics.connectionTime.max = Math.max(config.metrics.connectionTime.max, connectTime);
  });

  ws.on('message', (data) => {
    const msg = parseSocketIOMessage(data.toString());
    if (!msg) return;

    if (msg.type === 'socket.io:handshake') {
      // Complete Socket.IO v4 handshake with auth
      ws.send(`40{"sid":"${msg.sid}","auth":{"userId":"${userId}"}}`);
      
      // Join thread
      setTimeout(() => {
        ws.send(formatSocketIOMessage('presence:join', threadId));
        
        // Send test message after joining
        setTimeout(() => {
          messageSentTime = performance.now();
          config.metrics.messageDelivery.total++;
          ws.send(formatSocketIOMessage('message:send', {
            content: `Test message from ${userId}`,
            threadId,
            tempId: `msg_${userId}_${Date.now()}`
          }));
        }, 1000);
      }, 100);
    } else if (msg.type === 'message:new' && msg.payload?.sender?.id === userId) {
      config.metrics.messageDelivery.count++;
      const latency = performance.now() - messageSentTime;
      config.metrics.messageLatency.values.push(latency);
      config.metrics.messageLatency.min = Math.min(config.metrics.messageLatency.min, latency);
      config.metrics.messageLatency.max = Math.max(config.metrics.messageLatency.max, latency);
      messageReceived = true;
    } else if (msg.type === 'error') {
      console.error('Server error:', msg.payload);
    }
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });

  return ws;
}

// Run the test
runTest().catch(console.error); 