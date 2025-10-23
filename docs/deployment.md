# Deployment Guide

Clubs is a web-based Caddyfile editor that works with a single Caddyfile. This guide covers different deployment scenarios.

## Table of Contents

- [Quick Start](#quick-start)
- [Deployment Scenarios](#deployment-scenarios)
  - [Scenario 1: New Setup (Clubs + Caddy)](#scenario-1-new-setup-clubs--caddy)
  - [Scenario 2: Add to Existing Caddy](#scenario-2-add-to-existing-caddy)
  - [Scenario 3: Standalone (File Mode Only)](#scenario-3-standalone-file-mode-only)
  - [Scenario 4: Custom Caddy Build](#scenario-4-custom-caddy-build-cloudflare-dns-etc)
- [Configuration](#configuration)
- [Live Mode vs File Mode](#live-mode-vs-file-mode)

---

## Quick Start

The simplest way to get started:

```bash
# Option 1: Use docker-compose (recommended)
curl -O https://raw.githubusercontent.com/spencewood/clubs/main/docker-compose.yml
docker-compose up -d

# Option 2: Run standalone
docker run -d \
  -p 8080:80 \
  -v ./config:/config \
  -e CADDYFILE_PATH=/config/Caddyfile \
  spencewood/clubs:latest

# Access Clubs at http://localhost:8080
```

This starts both Caddy and Clubs with a shared `./config/Caddyfile`.

---

## Deployment Scenarios

### Scenario 1: New Setup (Clubs + Caddy)

**Use case:** You want to run both Caddy and Clubs together from scratch.

**Setup:**

The included `docker-compose.yml` does this out of the box:

```yaml
version: '3.8'

services:
  caddy:
    image: caddy:latest
    ports:
      - "80:80"
      - "443:443"
      - "2019:2019"   # Admin API
    volumes:
      - ./config:/etc/caddy
      - caddy_data:/data
    environment:
      - CADDY_ADMIN=0.0.0.0:2019

  clubs:
    image: spencewood/clubs:latest
    ports:
      - "8080:80"
    volumes:
      - ./config:/config
    environment:
      - CADDYFILE_PATH=/config/Caddyfile
      - CADDY_API_URL=http://caddy:2019
```

**Usage:**

```bash
docker-compose up -d
```

- **Caddy:** Serves your sites (ports 80/443)
- **Clubs:** Web editor (port 8080)
- **Live Mode:** Enabled - changes apply instantly via Admin API

---

### Scenario 2: Add to Existing Caddy

**Use case:** You already have Caddy running and want to add Clubs to manage it.

#### Option A: Same Docker Compose

Add Clubs to your existing `docker-compose.yml`:

```yaml
services:
  # Your existing Caddy service
  caddy:
    image: caddy:latest
    # ... your existing config ...
    environment:
      - CADDY_ADMIN=0.0.0.0:2019  # Add this if not present
    networks:
      - your_network

  # Add Clubs
  clubs:
    image: your-dockerhub-username/clubs:latest
    ports:
      - "8080:8080"
    volumes:
      # Point to wherever your Caddyfile lives
      - /path/to/your/caddy/config:/config
    environment:
      - CADDYFILE_PATH=/config/Caddyfile
      - CADDY_API_URL=http://caddy:2019
    networks:
      - your_network  # Same network as Caddy
```

**Important:**
- Use the **same network** so Clubs can reach Caddy's Admin API
- Mount the **same config directory** that Caddy uses
- Ensure Caddy's Admin API is enabled and accessible

#### Option B: Separate Docker Compose

If Caddy is in a different compose file or running externally:

```yaml
# clubs-docker-compose.yml
version: '3.8'

services:
  clubs:
    image: your-dockerhub-username/clubs:latest
    ports:
      - "8080:8080"
    volumes:
      - /path/to/your/existing/caddy/config:/config
    environment:
      - CADDYFILE_PATH=/config/Caddyfile
      - CADDY_API_URL=http://your-caddy-host:2019
    networks:
      - existing_caddy_network  # Join Caddy's network

networks:
  existing_caddy_network:
    external: true
```

Start with:

```bash
docker-compose -f clubs-docker-compose.yml up -d
```

---

### Scenario 3: Standalone (File Mode Only)

**Use case:** You want to edit Caddyfiles without connecting to a running Caddy instance.

This is useful for:
- Preparing configurations before deployment
- Editing Caddyfiles that you'll manually copy to servers
- Development/testing

```yaml
version: '3.8'

services:
  clubs:
    image: your-dockerhub-username/clubs:latest
    ports:
      - "8080:8080"
    volumes:
      - ./config:/config
    environment:
      - CADDYFILE_PATH=/config/Caddyfile
      # No CADDY_API_URL - runs in File Mode only
```

**Limitations:**
- No "Apply to Caddy" button (File Mode only)
- Changes require manual Caddy restart/reload
- No live validation against Caddy

---

### Scenario 4: Custom Caddy Build (Cloudflare DNS, etc.)

**Use case:** You need a custom Caddy build with specific modules (DNS providers, etc.)

#### Option 1: Use Custom Caddy Image

Replace the Caddy image in docker-compose.yml:

```yaml
services:
  caddy:
    # Use a custom build with Cloudflare DNS
    image: caddy:latest-builder
    build:
      context: ./caddy-custom
      dockerfile: Dockerfile
    # ... rest of config ...
```

Example custom Caddy Dockerfile:

```dockerfile
# caddy-custom/Dockerfile
FROM caddy:builder AS builder

RUN xcaddy build \
    --with github.com/caddy-dns/cloudflare

FROM caddy:latest

COPY --from=builder /usr/bin/caddy /usr/bin/caddy
```

#### Option 2: Use Pre-built Custom Image

```yaml
services:
  caddy:
    image: your-dockerhub-username/caddy-cloudflare:latest
    # ... rest of config ...
```

**Note:** Clubs works with any Caddy build as long as the Admin API is enabled.

---

## Configuration

### Environment Variables

#### Clubs Container

| Variable | Default | Description |
|----------|---------|-------------|
| `CADDYFILE_PATH` | `./config/Caddyfile` | Path to the Caddyfile to edit |
| `CADDY_API_URL` | `http://localhost:2019` | Caddy Admin API URL |
| `API_PORT` | `8080` | Port for Clubs web UI |
| `NODE_ENV` | `development` | Set to `production` in Docker |

#### Caddy Container

| Variable | Default | Description |
|----------|---------|-------------|
| `CADDY_ADMIN` | `localhost:2019` | Admin API listen address. Use `0.0.0.0:2019` to allow Clubs access |

### Volume Mounts

The key to Clubs working is **sharing the same Caddyfile** between Caddy and Clubs:

```yaml
# Caddy mounts config to /etc/caddy
caddy:
  volumes:
    - ./config:/etc/caddy

# Clubs mounts the SAME directory to /config
clubs:
  volumes:
    - ./config:/config
  environment:
    - CADDYFILE_PATH=/config/Caddyfile
```

**Important:** Both containers must see the same file. Use the same host directory.

---

## Live Mode vs File Mode

### Live Mode (Recommended)

**When it works:**
- Clubs can reach Caddy's Admin API
- `CADDY_API_URL` is set correctly
- Caddy Admin API is enabled (`CADDY_ADMIN=0.0.0.0:2019`)

**Features:**
- "Apply to Caddy" button reloads config instantly
- See Caddy API status indicator
- No manual restart needed

**Status indicator:**
- 🟢 **Live Mode** - Connected to Caddy Admin API

### File Mode

**When it happens:**
- Caddy Admin API is not reachable
- `CADDY_API_URL` is not set or incorrect
- Running Clubs standalone

**Features:**
- Edit and save Caddyfiles
- Changes written to disk
- Manual Caddy reload required: `docker-compose restart caddy`

**Status indicator:**
- ⚫ **File Mode** - Editing files only

---

## Troubleshooting

### Clubs shows "File Mode" but Caddy is running

**Problem:** Clubs can't reach Caddy Admin API

**Solutions:**
1. Check they're on the same Docker network
2. Verify `CADDY_API_URL=http://caddy:2019` (use container name, not localhost)
3. Ensure Caddy has `CADDY_ADMIN=0.0.0.0:2019` set
4. Check Caddy logs: `docker-compose logs caddy`

### Changes don't appear in Caddy

**Problem:** Caddy and Clubs aren't sharing the same file

**Solutions:**
1. Verify volume mounts point to same host directory
2. Check `CADDYFILE_PATH` matches where Caddy reads from
3. Restart both: `docker-compose restart`

### "Apply to Caddy" fails

**Problem:** Caddy rejected the configuration

**Solutions:**
1. Check the error message - Caddy will say what's wrong
2. Verify Caddyfile syntax in "Raw" tab
3. Check Caddy logs: `docker-compose logs caddy`

---

## Security Considerations

### Admin API Access

The Caddy Admin API is **powerful** - it can reload configs, view certificates, etc.

**For local development:**
```yaml
CADDY_ADMIN=0.0.0.0:2019  # OK for localhost
```

**For production:**

1. **Don't expose port 2019 externally**:
```yaml
# Remove this from Caddy service:
ports:
  - "2019:2019"  # DON'T expose externally
```

2. **Use Docker networks** - let Clubs reach Caddy internally only

3. **Protect Clubs UI** - add authentication in your Caddyfile:
```caddy
clubs.example.com {
    reverse_proxy clubs:8080
    basicauth {
        admin $2a$14$hashed_password
    }
}
```

### File Permissions

Ensure both Caddy and Clubs can read/write the Caddyfile:

```bash
chmod 644 ./config/Caddyfile
```

---

## Examples

See the `examples/` directory for complete docker-compose setups:
- `examples/basic/` - Simple Caddy + Clubs
- `examples/cloudflare/` - Custom Caddy with Cloudflare DNS
- `examples/existing-caddy/` - Add Clubs to existing setup
- `examples/standalone/` - File mode only

---

## Getting Help

- **Issues:** https://github.com/your-username/clubs/issues
- **Discussions:** https://github.com/your-username/clubs/discussions
- **Caddy Docs:** https://caddyserver.com/docs/
