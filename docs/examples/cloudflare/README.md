# Cloudflare DNS Example

This example shows how to run Clubs with a custom Caddy build that includes the Cloudflare DNS module for automatic HTTPS with DNS challenges.

## Prerequisites

- Docker and Docker Compose
- Cloudflare account with API token

## Setup

1. **Create Cloudflare API Token**
   - Go to https://dash.cloudflare.com/profile/api-tokens
   - Create token with `Zone:DNS:Edit` permissions
   - Copy the token

2. **Create `.env` file**:
```bash
CLOUDFLARE_API_TOKEN=your_token_here
```

3. **Create your Caddyfile** in `./config/Caddyfile`:
```caddy
example.com {
    tls {
        dns cloudflare {env.CLOUDFLARE_API_TOKEN}
    }
    respond "Hello from Clubs!"
}
```

4. **Start the stack**:
```bash
docker-compose up -d
```

5. **Access Clubs**:
   - Open http://localhost:8080
   - Edit your Caddyfile
   - Click "Apply to Caddy" to reload instantly

## How It Works

- **Custom Caddy Build**: The `caddy-build/Dockerfile` uses `xcaddy` to build Caddy with the Cloudflare DNS module
- **DNS Challenges**: Caddy uses Cloudflare API to prove domain ownership for Let's Encrypt
- **Shared Config**: Both Caddy and Clubs mount `./config` directory
- **Live Mode**: Clubs connects to Caddy Admin API for instant reloads

## Security Notes

- **Don't commit `.env`** - add it to `.gitignore`
- **Don't expose port 2019** externally in production
- **Protect Clubs UI** - add authentication via Caddyfile or firewall rules
