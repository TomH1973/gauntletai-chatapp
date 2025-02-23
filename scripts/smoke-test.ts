import { Socket } from 'socket.io-client';
import { connect } from 'socket.io-client';
import fetch from 'node-fetch';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:4000';
const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:4001';

async function runSmokeTests() {
  console.log('🔥 Running smoke tests...');
  
  try {
    // Test 1: API Health Check
    console.log('\n📡 Testing API health...');
    const healthResponse = await fetch(`${APP_URL}/api/health`);
    if (!healthResponse.ok) {
      const body = await healthResponse.text();
      throw new Error(`Health check failed: ${healthResponse.status} - ${body}`);
    }
    console.log('✅ API health check passed');

    // Test 2: WebSocket Connection
    console.log('\n🔌 Testing WebSocket connection...');
    const socket = connect(SOCKET_URL, {
      transports: ['websocket'],
      timeout: 5000,
      auth: {
        userId: 'smoke-test-user'
      }
    });

    await new Promise((resolve, reject) => {
      socket.on('connect', resolve);
      socket.on('connect_error', (error) => reject(new Error(`WebSocket connection error: ${error.message}`)));
      setTimeout(() => reject(new Error('WebSocket connection timeout')), 5000);
    });
    console.log('✅ WebSocket connection successful');
    socket.disconnect();

    // Test 3: Redis Connection
    console.log('\n📦 Testing Redis connection...');
    const redisResponse = await fetch(`${APP_URL}/api/health/redis`);
    if (!redisResponse.ok) {
      const body = await redisResponse.text();
      throw new Error(`Redis check failed: ${redisResponse.status} - ${body}`);
    }
    console.log('✅ Redis connection successful');

    // Test 4: Database Connection
    console.log('\n🗄️ Testing Database connection...');
    const dbResponse = await fetch(`${APP_URL}/api/health/db`);
    if (!dbResponse.ok) {
      const body = await dbResponse.text();
      throw new Error(`Database check failed: ${dbResponse.status} - ${body}`);
    }
    console.log('✅ Database connection successful');

    // Test 5: Rate Limiter
    console.log('\n🚦 Testing Rate Limiter...');
    const rateLimitResponse = await fetch(`${APP_URL}/api/test/rate-limit`);
    if (!rateLimitResponse.ok) {
      const body = await rateLimitResponse.text();
      throw new Error(`Rate limiter check failed: ${rateLimitResponse.status} - ${body}`);
    }
    console.log('✅ Rate limiter working correctly');

    // Test 6: Metrics
    console.log('\n📊 Testing Metrics endpoint...');
    const metricsResponse = await fetch('http://localhost:9090/-/healthy');
    if (!metricsResponse.ok) {
      const body = await metricsResponse.text();
      throw new Error(`Metrics check failed: ${metricsResponse.status} - ${body}`);
    }
    console.log('✅ Metrics endpoint responding');

    console.log('\n🎉 All smoke tests passed!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Smoke tests failed:', error.message);
    process.exit(1);
  }
}

runSmokeTests(); 