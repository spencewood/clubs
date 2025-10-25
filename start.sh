#!/bin/sh
# Start Next.js standalone server in background
node server.js &

# Start Caddy in foreground (keeps container alive)
# Enable Admin API on all interfaces (required for Docker networking)
caddy run --config /etc/caddy/Caddyfile --adapter caddyfile --resume
