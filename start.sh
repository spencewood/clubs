#!/bin/sh
# Start Next.js standalone server in background
# Listen on all interfaces (0.0.0.0) so Caddy can connect
HOSTNAME=0.0.0.0 PORT=3000 node server.js &

# Start Caddy in foreground (keeps container alive)
# Enable Admin API on all interfaces (required for Docker networking)
caddy run --config /etc/caddy/Caddyfile --adapter caddyfile --resume
