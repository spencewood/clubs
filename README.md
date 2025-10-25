# ♣ Clubs

[![CI](https://github.com/spencewood/clubs/actions/workflows/ci.yml/badge.svg)](https://github.com/spencewood/clubs/actions/workflows/ci.yml)
[![Docker Hub](https://img.shields.io/docker/v/spencewood/clubs?label=Docker%20Hub&logo=docker)](https://hub.docker.com/r/spencewood/clubs)
[![Docker Pulls](https://img.shields.io/docker/pulls/spencewood/clubs)](https://hub.docker.com/r/spencewood/clubs)

**A modern Caddyfile management tool with zero-downtime updates**

Clubs is a web-based tool for editing and managing Caddy server configurations. It provides a clean, intuitive interface for visualizing and modifying your Caddyfiles with instant, zero-downtime updates via the Caddy Admin API.

## Features

- **Live Mode** - Apply configuration changes instantly without restarts or reloads
- **Hybrid Mode** - Automatically uses Live Mode when Caddy Admin API is available, falls back to File Mode otherwise
- **Visual Editor** - Parse and visualize Caddyfile configurations in a clean UI
- **Domain Grouping** - Automatically groups subdomains (app.example.com, api.example.com → example.com)
- **Feature-Based Editing** - Smart forms for common patterns (reverse proxy, static files, headers, etc.)
- **Safe Updates** - Caddy validates configurations before applying; invalid configs are rejected
- **Direct File Management** - Works directly with mounted Caddyfile volumes
- **Container-First** - Designed to run as a Docker container alongside your Caddy server

## Tech Stack

- **Framework**: Next.js 16 with React 19 + TypeScript
- **Styling**: Tailwind CSS v4 + shadcn/ui components
- **API Routes**: Next.js API Routes (replaces separate backend)
- **Testing**: Vitest + MSW (Mock Service Worker)
- **Linting**: Biome
- **Web Server** (Production): Caddy

## Quick Start with Docker

```bash
# Run standalone (simplest)
docker run -d \
  -p 8080:80 \
  -v ./config:/config \
  -e CADDYFILE_PATH=/config/Caddyfile \
  spencewood/clubs:latest

# Or use docker-compose for full stack (Caddy + Clubs)
curl -O https://raw.githubusercontent.com/spencewood/clubs/main/docker-compose.yml
docker-compose up -d
```

**Access:**
- **Clubs UI**: http://localhost:8080
- **Caddy**: Ports 80/443

**Ports:**
- **80/443**: Caddy web server (your sites)
- **2019**: Caddy Admin API (internal - for live reload)
- **8080**: Clubs web UI (container port 80 mapped to host 8080)

## Deployment Options

See **[docs/deployment.md](docs/deployment.md)** for detailed deployment scenarios:

- **New Setup** - Start fresh with Caddy + Clubs together
- **Existing Caddy** - Add Clubs to your current Caddy installation
- **Standalone** - Use Clubs without Caddy (file editing only)
- **Custom Caddy** - Use custom builds (Cloudflare DNS, etc.)

### Quick Examples

**Use your existing Caddyfile:**

```yaml
# docker-compose.yml
volumes:
  - /path/to/your/existing/config:/etc/caddy  # Caddy reads from here
  - /path/to/your/existing/config:/config     # Clubs edits the same file
```

**Cloudflare DNS + Clubs:**

See [examples/cloudflare/](examples/cloudflare/) for complete setup.

**Add to existing Caddy:**

See [examples/existing-caddy/](examples/existing-caddy/) for integration guide.

## Development

### Prerequisites

- Node.js 22+
- pnpm

### Install Dependencies

```bash
pnpm install
```

### Setup Environment

```bash
# Copy the example environment file
cp .env.example .env.local

# Edit .env.local if needed (defaults work for local development)
```

The `.env.local` file contains:
- `CADDYFILE_PATH` - Path to Caddyfile (default: `./config/Caddyfile`)
- `CADDY_API_URL` - Caddy Admin API URL (default: `http://localhost:2019`)

### Run Development Server

```bash
# Start Next.js dev server (with MSW mocking enabled by default)
pnpm dev

# The app will be available at http://localhost:3000
# MSW automatically mocks Caddy API responses for development
# A sample Caddyfile is provided in config/Caddyfile for testing
```

**Note**: MSW is enabled by default in development, so you don't need Caddy running to develop!

**Optional**: To test Live Mode integration, run Caddy in a separate terminal:
```bash
caddy run --config Caddyfile --adapter caddyfile
```

### Run Tests

```bash
pnpm test           # Run tests
pnpm test:ui        # Run tests with UI
pnpm test:coverage  # Run tests with coverage
```

### Linting and Formatting

```bash
pnpm lint           # Check for issues
pnpm lint:fix       # Fix issues automatically
pnpm format         # Format code
```

## How It Works

### Architecture

Clubs manages a **single Caddyfile** shared between two containers:

```
┌──────────────────┐         ┌──────────────────┐
│  Caddy Container │         │ Clubs Container  │
│                  │         │                  │
│  Reads/Serves    │         │  Edits/Manages   │
│  Caddyfile       │         │  Caddyfile       │
│                  │         │                  │
│  Admin API ◀─────┼─────────┼─ Fastify API     │
│  (Port 2019)     │         │  (Port 8080)     │
└────────┬─────────┘         └────────┬─────────┘
         │                            │
         │    ┌──────────────────┐    │
         └────▶  config/         ◀────┘
              │  Caddyfile       │
              │  (shared volume) │
              └──────────────────┘
```

**Live Mode Flow:**
1. Edit configuration in the UI
2. Click "Apply to Caddy"
3. Clubs sends Caddyfile to Caddy Admin API (`POST /load`)
4. Caddy validates the configuration
5. If valid: applied instantly (zero downtime)
6. If invalid: rejected, error shown in toast

**File Mode Flow:**
1. Edit configuration in the UI
2. Click "Save"
3. Changes written to Caddyfile on disk
4. Manual Caddy reload required: `docker-compose restart caddy`

## Usage

1. **Auto-Load**: Caddyfile loads automatically on startup
2. **View Structure**: See all site blocks and their directives in visual editor
3. **Edit Blocks**: Click edit icons to modify configurations
4. **Raw Mode**: Switch to "Raw" tab for direct Caddyfile editing
5. **Apply (Live Mode)**: Click "Apply to Caddy" for instant updates
6. **Save (File Mode)**: Click "Save" to write changes to disk

**Mode Indicator:**
- 🟢 **Live Mode** - Connected to Caddy, instant updates available
- ⚫ **File Mode** - File editing only, manual reload required

## Security

- Directory traversal protection on all file operations
- Read-only by default in the container (use `:rw` for write access)
- No file deletion capability (edit/add only)
- API server validates all file paths
- Caddy validates all configurations before applying

## Contributing

Contributions welcome! This is a tool for the Caddy community.

## License

MIT
