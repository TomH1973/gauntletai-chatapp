#!/bin/bash

# Environment variables for the tests
export API_URL="http://localhost:3000"
export WS_URL="ws://localhost:3002"

# Ensure k6 is installed
if ! command -v k6 &> /dev/null; then
    echo "k6 is not installed. Installing..."
    if [[ "$OSTYPE" == "darwin"* ]]; then
        brew install k6
    else
        sudo apt-key adv --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
        echo "deb https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
        sudo apt-get update
        sudo apt-get install k6
    fi
fi

# Create results directory if it doesn't exist
mkdir -p reports/performance

echo "Starting performance test suite..."

# Run concurrent connections test first (most critical)
echo "Running concurrent connections test..."
k6 run \
  --out json=reports/performance/concurrent-connections.json \
  --out csv=reports/performance/concurrent-connections.csv \
  tests/performance/concurrent-connections.k6.js

# Only continue with other tests if concurrent test passes
if [ $? -eq 0 ]; then
    echo "Concurrent connections test passed, continuing with other tests..."
    
    # Run basic message load test
    echo "Running message load test..."
    k6 run --out json=reports/performance/message-load.json tests/performance/messaging.k6.js --scenario message_load

    # Run real-time messaging stress test
    echo "Running real-time messaging stress test..."
    k6 run --out json=reports/performance/realtime-stress.json tests/performance/messaging.k6.js --scenario realtime_stress

    # Run connection handling test
    echo "Running connection stress test..."
    k6 run --out json=reports/performance/connection-stress.json tests/performance/messaging.k6.js --scenario connection_stress
else
    echo "❌ Concurrent connections test failed! Stopping test suite."
    exit 1
fi

# Generate consolidated report
echo "Generating test report..."
node scripts/generate-performance-report.js

echo "✅ Performance test suite complete!"
echo "Reports available in reports/performance/" 