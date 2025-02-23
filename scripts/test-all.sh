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

# Create results directory
mkdir -p reports/performance

echo "🚀 Starting comprehensive test suite..."

# 1. Run concurrent connections test
echo "📊 Running concurrent connections test..."
./scripts/test-concurrent.sh
if [ $? -ne 0 ]; then
    echo "❌ Concurrent connections test failed!"
    exit 1
fi

# Wait between tests
sleep 5

# 2. Run message throughput test
echo "📨 Running message throughput test..."
./scripts/test-throughput.sh
if [ $? -ne 0 ]; then
    echo "❌ Message throughput test failed!"
    exit 1
fi

# Wait between tests
sleep 5

# 3. Run recovery test
echo "🔄 Running recovery test..."
./scripts/test-recovery.sh
if [ $? -ne 0 ]; then
    echo "❌ Recovery test failed!"
    exit 1
fi

# Wait between tests
sleep 5

# 4. Run final QA tests
echo "🔍 Running final QA tests..."
npm run test:qa
if [ $? -ne 0 ]; then
    echo "❌ Final QA tests failed!"
    exit 1
fi

# Generate consolidated report
echo "📝 Generating test report..."
node scripts/generate-test-report.js

echo "✅ All tests completed successfully!"
echo "Reports available in reports/performance/" 