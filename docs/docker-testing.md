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
4. **Docker integration tests** - `pnpm test:docker` - Full production build validation

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
4. Verify Caddy API is available
5. Test upstreams endpoint
6. Test Caddyfile format endpoint (validates Caddy integration)
7. Clean up test container

If all tests pass, you'll see: `✅ All integration tests passed! Docker image is ready to ship.`

## Manual Testing

### Production Container

Test the full production build with Caddy.

### Build and Run

```bash
# Build production image
docker build -t clubs:latest .

# Run with docker-compose (includes Caddy)
docker-compose up

# Or run standalone
docker run -p 8080:80 \
  -v $(pwd)/config:/config \
  -e CADDYFILE_PATH=/config/Caddyfile \
  clubs:latest
```

### What to Test

✅ **Production Build**
- Access http://localhost:8080
- Should see "File Mode" (no Caddy API in standalone mode)
- Edit Caddyfile - changes should save to disk
- No MSW - app uses real file system

✅ **With Caddy Integration**
```bash
# Run full stack with docker-compose
docker-compose up
```
- Access http://localhost:8080
- Should see "Live Mode" (real Caddy API on port 2019)
- Test live config updates via "Save & Apply"

## Troubleshooting

### MSW Not Working in Dev Container

Check logs:
```bash
docker logs <container-id> | grep MSW
```

Should see: `🔶 MSW enabled for development`

If not:
- Verify NODE_ENV=development is set
- Check src/instrumentation.ts is being loaded
- Verify all dependencies are installed

### Container Won't Start

```bash
# View logs
docker logs <container-id>

# Check if port is in use
lsof -i :3000  # dev
lsof -i :8080  # production
```

### File Permissions

If you see permission errors with mounted volumes:
```bash
# Fix config directory permissions
chmod -R 755 config/
```

## Next Steps

After testing:
1. ✅ Dev container with MSW - All features work with mock data
2. ✅ Production build - Next.js builds successfully
3. ✅ Standalone mode - File editing works
4. ✅ With Caddy - Live mode works with real API

Once all tests pass, you're ready to ship! 🚀
