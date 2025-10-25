# Docker Testing Guide

This guide explains how to test Clubs in Docker containers before shipping.

## Quality Gates Before Release

Run all quality checks before pushing to Docker Hub:

```bash
# Run all checks (lint, typecheck, unit tests, Docker integration tests)
pnpm prerelease
```

This will run:
1. **Linting** - `pnpm lint` - Code quality checks
2. **Type checking** - `pnpm typecheck` - TypeScript validation
3. **Unit tests** - `pnpm test --run` - 87 unit tests
4. **Docker integration tests** - `pnpm test:docker` - App builds and runs correctly

All checks must pass before the release is ready.

## Docker Integration Tests

The Docker integration test script validates the production build:

```bash
# Run Docker tests directly
./test-docker.sh
# or
pnpm test:docker
```

This script will:
1. Build the production Docker image
2. Start a test container
3. Verify Next.js responds correctly
4. Verify app renders properly
5. Verify API routes work (file mode)
6. Clean up test container

If all tests pass, you'll see: `✅ All integration tests passed! Docker image is ready to ship.`

## Architecture

The Clubs Docker image contains **only the Next.js application**. It's designed to run behind an external reverse proxy (like Caddy) that provides:

- TLS/HTTPS termination
- Access to Caddy Admin API (port 2019)
- Routing to the Clubs container

### Deployment Requirements

Your docker-compose.yml should:
1. **External Caddy** - Manages TLS, routing, and provides Admin API
2. **Clubs App** - Runs on port 3000, connects to Caddy API

Example:
```yaml
services:
  caddy:
    image: caddy:latest
    ports:
      - "80:80"
      - "443:443"
    environment:
      - CADDY_ADMIN=0.0.0.0:2019
    volumes:
      - ./config:/etc/caddy
    networks:
      - clubs-network

  clubs:
    image: spencewood/clubs:latest
    ports:
      - "8080:3000"  # Map host:8080 -> container:3000
    environment:
      - CADDY_API_URL=http://caddy:2019  # Connect to external Caddy
      - CADDYFILE_PATH=/config/Caddyfile
    volumes:
      - ./config:/config  # Shared with Caddy
    networks:
      - clubs-network
```

### Key Points

- Clubs app runs on **port 3000** inside the container
- External Caddy should proxy to `http://clubs:3000` (not port 8080!)
- Clubs connects to Caddy Admin API at `http://caddy:2019`
- Both containers share the `/config` volume for Caddyfile access

## Manual Testing

### Test with docker-compose

```bash
# Build and start both services
docker-compose up --build

# Access Clubs UI
open http://localhost:8080
```

### What to Test

✅ **Live Mode** - Should show "Live Mode" indicator
- App connects to Caddy Admin API
- Can view upstreams, certificates
- Can apply configuration changes
- Changes reflect in Caddy immediately

✅ **File Operations** - Caddyfile editing works
- Can edit Caddyfile in the UI
- Changes save to shared `/config` volume
- Format and validation work

## Troubleshooting

### Connection Refused Errors

If you see `dial tcp: connect: connection refused` in Caddy logs:

**Problem**: External Caddy is trying to connect to wrong port

**Solution**: Make sure your Caddy reverse_proxy points to port **3000** (not 8080):
```caddyfile
clubs.example.com {
    reverse_proxy clubs:3000  # Use port 3000!
}
```

### App Shows "File Mode" Instead of "Live Mode"

**Problem**: Clubs can't connect to Caddy Admin API

**Check**:
1. Is `CADDY_API_URL` set correctly? Should be `http://caddy:2019`
2. Is Caddy Admin API enabled? Check `CADDY_ADMIN=0.0.0.0:2019`
3. Are both containers on the same Docker network?
4. Can you curl the API from inside the clubs container?
   ```bash
   docker exec clubs curl http://caddy:2019/
   ```

### No Certificates Showing

**Problem**: Either Caddy hasn't issued certs yet, or API connection is broken

**Solution**:
1. Check Live Mode is working (green indicator)
2. Visit your site via HTTPS to trigger cert issuance
3. Check Caddy logs: `docker logs caddy`

## Next Steps

After all tests pass:

```bash
# Run full quality gate
pnpm prerelease

# Tag and push to Docker Hub
docker tag clubs:test spencewood/clubs:latest
docker tag clubs:test spencewood/clubs:0.5.0
docker push spencewood/clubs:latest
docker push spencewood/clubs:0.5.0
```

Then deploy on your server:
```bash
# Pull latest image
docker pull spencewood/clubs:latest

# Restart services
docker-compose up -d
```
