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
CONTAINER_ID=$(docker run -d --name clubs-test -p 3001:3000 -p 2020:2019 clubs:test)

# Wait for services to be ready
echo "⏳ Waiting for services to start..."
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

# Test 2: Caddy API is available
echo "✓ Testing Caddy API responds..."
CADDY_STATUS=$(curl -s http://localhost:3001/api/caddy/status | jq -r '.available')
if [ "$CADDY_STATUS" != "true" ]; then
    echo "❌ FAILED: Caddy API not available"
    docker logs clubs-test
    docker stop clubs-test && docker rm clubs-test
    exit 1
fi

# Test 3: Upstreams endpoint works
echo "✓ Testing upstreams endpoint..."
UPSTREAMS=$(curl -s http://localhost:3001/api/caddy/upstreams)
if [ -z "$UPSTREAMS" ] || [ "$UPSTREAMS" = "null" ]; then
    echo "❌ FAILED: Upstreams endpoint not working"
    docker logs clubs-test
    docker stop clubs-test && docker rm clubs-test
    exit 1
fi

# Test 4: Can format Caddyfile (tests Caddy adapt API)
echo "✓ Testing Caddyfile format endpoint..."
FORMAT_RESULT=$(curl -s -X POST http://localhost:3001/api/caddyfile/format \
    -H "Content-Type: application/json" \
    -d '{"caddyfile":"example.com {\n reverse_proxy localhost:8080\n}"}' \
    | jq -r '.formatted')
if [ -z "$FORMAT_RESULT" ]; then
    echo "❌ FAILED: Format endpoint not working"
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
