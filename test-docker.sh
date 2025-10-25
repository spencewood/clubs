#!/bin/bash
set -e

echo "🐳 Docker Integration Test"
echo "=========================="
echo ""

# Cleanup
echo "🧹 Cleaning up old test containers..."
docker stop clubs-test 2>/dev/null || true
docker rm clubs-test 2>/dev/null || true

# Build
echo "🔨 Building Docker image..."
docker build -t clubs:test . -q

# Run
echo "🚀 Starting container..."
CONTAINER_ID=$(docker run -d --name clubs-test -p 3001:3000 clubs:test)

# Wait for Next.js to be ready
echo "⏳ Waiting for Next.js to start..."
sleep 5

# Test 1: Next.js is running
echo "✓ Testing Next.js responds..."
STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/)
if [ "$STATUS" != "200" ]; then
    echo "❌ FAILED: Next.js not responding (HTTP $STATUS)"
    docker logs clubs-test
    docker stop clubs-test && docker rm clubs-test
    exit 1
fi

# Test 2: App renders correctly
echo "✓ Testing app renders..."
CONTENT=$(curl -s http://localhost:3001/ | grep -c "Clubs - Caddy Configuration Manager" || echo "0")
if [ "$CONTENT" = "0" ]; then
    echo "❌ FAILED: App not rendering correctly"
    docker logs clubs-test
    docker stop clubs-test && docker rm clubs-test
    exit 1
fi

# Test 3: API routes work (file mode - no Caddy API)
echo "✓ Testing API routes..."
API_STATUS=$(curl -s http://localhost:3001/api/caddy/status | jq -r '.available')
if [ "$API_STATUS" != "false" ]; then
    echo "❌ FAILED: Expected file mode (available: false) but got: $API_STATUS"
    docker logs clubs-test
    docker stop clubs-test && docker rm clubs-test
    exit 1
fi

# Cleanup
echo "🧹 Cleaning up..."
docker stop clubs-test >/dev/null
docker rm clubs-test >/dev/null

echo ""
echo "✅ All integration tests passed!"
echo "Docker image is ready to ship."
echo ""
echo "Note: This tests the app in isolation. On your server, make sure:"
echo "  - External Caddy proxies to port 3000 (not 8080)"
echo "  - CADDY_API_URL=http://caddy:2019 is set"
