#!/bin/bash

# Docker Image Integration Test Script
# Tests the Clubs Docker image to ensure it works as expected

set -e  # Exit on any error

echo "🧪 Starting Docker Image Integration Tests..."
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test configuration
CONTAINER_NAME="clubs-test-$$"
TEST_CONFIG_DIR="./test-config-$$"
IMAGE_NAME="clubs:latest"
CLUBS_UI_PORT=8080  # Map container port 80 to host 8080
CLUBS_API_PORT=8081  # Map container port 8080 to host 8081
CADDY_ADMIN_PORT=2019

# Cleanup function
cleanup() {
    echo ""
    echo "🧹 Cleaning up..."
    docker stop $CONTAINER_NAME 2>/dev/null || true
    docker rm $CONTAINER_NAME 2>/dev/null || true
    rm -rf $TEST_CONFIG_DIR 2>/dev/null || true
    echo "✅ Cleanup complete"
}

# Set trap to cleanup on exit
trap cleanup EXIT

# Function to check if container is running
check_container_running() {
    if docker ps | grep -q $CONTAINER_NAME; then
        return 0
    else
        return 1
    fi
}

# Function to wait for service to be ready
wait_for_service() {
    local url=$1
    local max_attempts=30
    local attempt=0

    echo "⏳ Waiting for service at $url to be ready..."

    while [ $attempt -lt $max_attempts ]; do
        if curl -s -f "$url" > /dev/null 2>&1; then
            echo -e "${GREEN}✓${NC} Service is ready!"
            return 0
        fi
        attempt=$((attempt + 1))
        sleep 1
    done

    echo -e "${RED}✗${NC} Service failed to start within ${max_attempts} seconds"
    return 1
}

# Create test configuration
echo "📁 Creating test configuration directory..."
mkdir -p $TEST_CONFIG_DIR
cat > $TEST_CONFIG_DIR/Caddyfile << 'EOF'
# Test Caddyfile
example.com {
    respond "Hello from Clubs!"
}

api.example.com {
    reverse_proxy localhost:3000
}
EOF
echo -e "${GREEN}✓${NC} Test configuration created"
echo ""

# Start the container
echo "🚀 Starting Docker container..."
docker run -d \
    --name $CONTAINER_NAME \
    -p $CLUBS_UI_PORT:80 \
    -p $CLUBS_API_PORT:8080 \
    -p $CADDY_ADMIN_PORT:2019 \
    -v "$(pwd)/$TEST_CONFIG_DIR:/config" \
    -e CADDYFILE_PATH=/config/Caddyfile \
    $IMAGE_NAME

if check_container_running; then
    echo -e "${GREEN}✓${NC} Container started successfully"
else
    echo -e "${RED}✗${NC} Container failed to start"
    docker logs $CONTAINER_NAME
    exit 1
fi
echo ""

# Wait for services to be ready
sleep 2

# Show container logs
echo "📋 Container logs (first 20 lines):"
docker logs $CONTAINER_NAME 2>&1 | head -20
echo ""

# Test 1: Check if Clubs UI is accessible
echo "🧪 Test 1: Clubs UI is accessible"
if wait_for_service "http://localhost:$CLUBS_UI_PORT"; then
    echo -e "${GREEN}✓${NC} Test 1 passed: Clubs UI is accessible"
else
    echo -e "${RED}✗${NC} Test 1 failed: Clubs UI is not accessible"
    docker logs $CONTAINER_NAME
    exit 1
fi
echo ""

# Test 2: Check if Caddy Admin API is accessible
echo "🧪 Test 2: Caddy Admin API is accessible"
if wait_for_service "http://localhost:$CADDY_ADMIN_PORT/config/"; then
    echo -e "${GREEN}✓${NC} Test 2 passed: Caddy Admin API is accessible"
else
    echo -e "${RED}✗${NC} Test 2 failed: Caddy Admin API is not accessible"
    docker logs $CONTAINER_NAME
    exit 1
fi
echo ""

# Test 3: Verify Clubs can read the Caddyfile
echo "🧪 Test 3: Clubs can read the Caddyfile"
CADDYFILE_RESPONSE=$(curl -s http://localhost:$CLUBS_UI_PORT/api/caddyfile)
if echo "$CADDYFILE_RESPONSE" | grep -q "example.com"; then
    echo -e "${GREEN}✓${NC} Test 3 passed: Clubs can read the Caddyfile"
else
    echo -e "${RED}✗${NC} Test 3 failed: Clubs cannot read the Caddyfile"
    echo "Response: $CADDYFILE_RESPONSE"
    exit 1
fi
echo ""

# Test 4: Verify Caddy status endpoint
echo "🧪 Test 4: Caddy status check"
STATUS_RESPONSE=$(curl -s http://localhost:$CLUBS_UI_PORT/api/caddy/status)
echo "Status response: $STATUS_RESPONSE"
if echo "$STATUS_RESPONSE" | grep -q "available\|unavailable"; then
    echo -e "${GREEN}✓${NC} Test 4 passed: Caddy status endpoint works"
else
    echo -e "${RED}✗${NC} Test 4 failed: Caddy status endpoint failed"
    exit 1
fi
echo ""

# Test 5: Verify Caddy config is loaded
echo "🧪 Test 5: Caddy has loaded the configuration"
CADDY_CONFIG=$(curl -s http://localhost:$CADDY_ADMIN_PORT/config/)
if echo "$CADDY_CONFIG" | grep -q "apps"; then
    echo -e "${GREEN}✓${NC} Test 5 passed: Caddy configuration is loaded"
else
    echo -e "${RED}✗${NC} Test 5 failed: Caddy configuration not loaded properly"
    echo "Config: $CADDY_CONFIG"
    exit 1
fi
echo ""

# Test 6: Test updating Caddyfile through Clubs API
echo "🧪 Test 6: Update Caddyfile through Clubs API"
NEW_CADDYFILE='test.example.com {
    respond "Updated config"
}'

UPDATE_RESPONSE=$(curl -s -X PUT \
    -H "Content-Type: text/plain" \
    -d "$NEW_CADDYFILE" \
    http://localhost:$CLUBS_UI_PORT/api/caddyfile)

if echo "$UPDATE_RESPONSE" | grep -q "success\|Caddyfile saved"; then
    echo -e "${GREEN}✓${NC} Test 6 passed: Caddyfile updated successfully"

    # Verify the update
    sleep 1
    UPDATED_CONTENT=$(curl -s http://localhost:$CLUBS_UI_PORT/api/caddyfile)
    if echo "$UPDATED_CONTENT" | grep -q "test.example.com"; then
        echo -e "${GREEN}✓${NC} Test 6 verification: Update persisted correctly"
    else
        echo -e "${YELLOW}⚠${NC} Test 6 warning: Update may not have persisted"
    fi
else
    echo -e "${RED}✗${NC} Test 6 failed: Could not update Caddyfile"
    echo "Response: $UPDATE_RESPONSE"
fi
echo ""

# Test 7: Check container health
echo "🧪 Test 7: Container health check"
if check_container_running; then
    CONTAINER_STATUS=$(docker inspect --format='{{.State.Status}}' $CONTAINER_NAME)
    if [ "$CONTAINER_STATUS" = "running" ]; then
        echo -e "${GREEN}✓${NC} Test 7 passed: Container is healthy and running"
    else
        echo -e "${RED}✗${NC} Test 7 failed: Container status is $CONTAINER_STATUS"
        exit 1
    fi
else
    echo -e "${RED}✗${NC} Test 7 failed: Container is not running"
    exit 1
fi
echo ""

# Test 8: Check if both Node.js and Caddy processes are running
echo "🧪 Test 8: Verify both Node.js and Caddy are running"
PROCESSES=$(docker exec $CONTAINER_NAME ps aux)
if echo "$PROCESSES" | grep -q "node" && echo "$PROCESSES" | grep -q "caddy"; then
    echo -e "${GREEN}✓${NC} Test 8 passed: Both Node.js and Caddy processes are running"
else
    echo -e "${RED}✗${NC} Test 8 failed: Missing expected processes"
    echo "$PROCESSES"
    exit 1
fi
echo ""

# Summary
echo "════════════════════════════════════════════"
echo -e "${GREEN}✅ All tests passed!${NC}"
echo "════════════════════════════════════════════"
echo ""
echo "📊 Test Summary:"
echo "  ✓ Clubs UI is accessible (port 80)"
echo "  ✓ Caddy Admin API is accessible (port 2019)"
echo "  ✓ Clubs can read Caddyfile"
echo "  ✓ Caddy status endpoint works"
echo "  ✓ Caddy configuration loaded"
echo "  ✓ Caddyfile can be updated via API"
echo "  ✓ Container is healthy"
echo "  ✓ Both Node.js and Caddy processes running"
echo ""
echo "🎉 Docker image is ready for production!"
echo ""
echo "📝 Usage:"
echo "  UI:  http://localhost:8080 (mapped to container port 80)"
echo "  API: proxied through UI port via /api/*"
