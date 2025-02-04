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

echo "Running performance tests..."

# Run basic message load test
echo "Running message load test..."
k6 run --out json=message-load.json tests/performance/messaging.k6.js --scenario message_load

# Run real-time messaging stress test
echo "Running real-time messaging stress test..."
k6 run --out json=realtime-stress.json tests/performance/messaging.k6.js --scenario realtime_stress

# Run connection handling test
echo "Running connection stress test..."
k6 run --out json=connection-stress.json tests/performance/messaging.k6.js --scenario connection_stress

echo "Performance tests completed. Results saved to JSON files."

# Generate report
echo "Generating performance report..."
node scripts/generate-performance-report.js

echo "Done! Check the performance-report.html file for detailed results." 