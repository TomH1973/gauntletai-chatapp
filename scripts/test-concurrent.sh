#!/bin/bash

# Set environment variables
export NODE_ENV=test
export WS_URL=${WS_URL:-"ws://localhost:3002"}

# Ensure k6 is installed
if ! command -v k6 &> /dev/null; then
    echo "k6 is not installed. Please install it first:"
    echo "Windows (PowerShell): choco install k6"
    echo "Linux: snap install k6"
    echo "macOS: brew install k6"
    exit 1
fi

# Check system limits
if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    # Increase system limits for the test
    sudo sysctl -w net.ipv4.ip_local_port_range="1024 65535"
    sudo sysctl -w net.ipv4.tcp_fin_timeout=30
    sudo sysctl -w net.core.somaxconn=65535
    sudo sysctl -w net.ipv4.tcp_max_syn_backlog=65535
    ulimit -n 65535
fi

# Start the WebSocket server in test mode
echo "Starting WebSocket server in test mode..."
NODE_ENV=test node server.js &
SERVER_PID=$!

# Wait for server to be ready
sleep 5

# Run sustained load test
echo "Running sustained load test..."
k6 run --tag testType=sustained tests/performance/concurrent-connections.k6.js -e SCENARIO=sustained_load

# Wait between tests
sleep 10

# Run burst test
echo "Running burst test..."
k6 run --tag testType=burst tests/performance/concurrent-connections.k6.js -e SCENARIO=burst_test

# Cleanup
echo "Cleaning up..."
kill $SERVER_PID

# Check test results
if [ $? -eq 0 ]; then
    echo "Concurrent connection tests passed successfully!"
    exit 0
else
    echo "Concurrent connection tests failed!"
    exit 1
fi 