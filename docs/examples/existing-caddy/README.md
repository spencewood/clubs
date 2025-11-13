# Add Clubs to Existing Caddy

This example shows how to add Clubs when you already have Caddy running.

## Prerequisites

- Existing Caddy installation (Docker or docker-compose)
- Caddy Admin API enabled (default on port 2019)

## Setup

### Step 1: Find Your Caddy's Network

```bash
# List all networks your Caddy container is on
docker inspect <caddy-container-name> | grep NetworkMode
```

### Step 2: Find Your Caddyfile Location

```bash
# Check where Caddy mounts its config
docker inspect <caddy-container-name> | grep -A 5 Mounts
```

Look for the mount that maps to `/etc/caddy` inside the container.

### Step 3: Update docker-compose.yml

Edit `docker-compose.yml` and update:

1. **Volume path** - line 12:
```yaml
volumes:
  - /your/actual/path/to/caddy/config:/config
```

2. **Network name** - line 22:
```yaml
networks:
  - your_actual_caddy_network_name
```

3. **Caddy API URL** - line 18 (if using different container name):
```yaml
- CADDY_API_URL=http://your-caddy-container:2019
```

4. **Network config** - line 25:
```yaml
networks:
  your_actual_caddy_network_name:
    external: true
```

### Step 4: Ensure Caddy Admin API is Accessible

Add to your existing Caddy configuration:

```bash
# If using docker-compose, add this to Caddy service:
environment:
  - CADDY_ADMIN=0.0.0.0:2019
```

Or in your Caddyfile (global options):

```caddy
{
    admin 0.0.0.0:2019
}
```

### Step 5: Start Clubs

```bash
docker-compose up -d
```

### Step 6: Verify Connection

1. Open http://localhost:8080
2. Check the status indicator:
   - 🟢 **Live Mode** = Connected successfully
   - ⚫ **File Mode** = Not connected (check network/API settings)

## Troubleshooting

### Shows "File Mode" instead of "Live Mode"

**Check network connectivity:**
```bash
docker exec clubs ping caddy
```

If this fails, Clubs can't reach Caddy. Verify they're on the same network.

**Check Admin API:**
```bash
docker exec clubs curl http://caddy:2019/config/
```

Should return Caddy's JSON config. If not, ensure `CADDY_ADMIN=0.0.0.0:2019`.

### "Apply to Caddy" fails

Check Caddy logs for errors:
```bash
docker logs caddy
```

The error message usually indicates what's wrong with the configuration.

## Example: Complete Integration

If your existing Caddy setup looks like this:

```yaml
# your-existing-compose.yml
version: '3.8'
services:
  caddy:
    image: caddy:latest
    volumes:
      - ./caddy-config:/etc/caddy
    networks:
      - web
networks:
  web:
```

Then your Clubs config should be:

```yaml
services:
  clubs:
    image: spencewood/clubs:latest
    ports:
      - "8080:3000"
    volumes:
      - ./caddy-config:/config  # Same host path
    environment:
      - CADDYFILE_PATH=/config/Caddyfile
      - CADDY_API_URL=http://caddy:2019
    networks:
      - web  # Same network name
networks:
  web:
    external: true  # Network already exists
```
