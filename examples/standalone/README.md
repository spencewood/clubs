# Standalone Clubs (File Mode)

This example runs Clubs without connecting to a Caddy instance. Useful for preparing configurations, learning, or offline editing.

## Use Cases

- **Preparing configs** before deploying to a server
- **Learning Caddyfile syntax** with validation
- **Offline editing** when Caddy isn't available
- **Config templates** that you'll copy to multiple servers

## Setup

```bash
docker-compose up -d
```

Access at: http://localhost:8080

## Features in File Mode

✅ Available:
- Edit Caddyfile with syntax highlighting
- Visual site block editor
- Add/edit/delete site blocks
- Raw Caddyfile editing
- Validation warnings
- Save changes to disk

❌ Not Available:
- "Apply to Caddy" button (no Caddy to apply to)
- Live Mode indicator
- Instant config reload
- Validation against running Caddy

## Workflow

1. Edit your Caddyfile in Clubs
2. Save changes (writes to `./config/Caddyfile`)
3. Manually copy to your server:
   ```bash
   scp ./config/Caddyfile user@server:/etc/caddy/Caddyfile
   ```
4. Reload Caddy on the server:
   ```bash
   ssh user@server "systemctl reload caddy"
   # or
   ssh user@server "docker exec caddy caddy reload --config /etc/caddy/Caddyfile"
   ```

## Tips

- Keep your `./config` directory in version control
- Use this for preparing configs that work across multiple environments
- Test syntax before deploying to production

## Upgrading to Live Mode

To connect to a running Caddy later, add the environment variable:

```yaml
environment:
  - CADDYFILE_PATH=/config/Caddyfile
  - CADDY_API_URL=http://your-caddy-host:2019  # Add this
```

And ensure Clubs can reach the Caddy Admin API (same network, firewall rules, etc.)
