# ♣ Clubs

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

- **Frontend**: React 19 + TypeScript + Vite
- **Styling**: Tailwind CSS v4 + shadcn/ui components
- **Backend**: Fastify (Node.js) for file operations
- **Web Server**: Caddy
- **Linting**: Biome

## Quick Start with Docker

```bash
# Clone the repository
git clone <repo-url>
cd clubs

# Build and run with docker-compose
docker-compose up -d
```

The application will be available at `http://localhost`

**Ports:**
- **80**: Web UI
- **443**: HTTPS (if configured)
- **2019**: Caddy Admin API (for Live Mode)
- **8080**: Clubs API

## Configuration

### Using Your Own Caddyfiles

Edit `docker-compose.yml` to mount your Caddyfiles directory:

```yaml
volumes:
  - /path/to/your/caddyfiles:/caddyfiles:rw
```

Clubs will automatically detect all files named `Caddyfile` or ending in `.caddy` in the mounted directory.

### Enabling Live Mode

Live Mode requires access to the Caddy Admin API (port 2019). The included `docker-compose.yml` has this configured by default. If you're running Caddy separately:

1. Enable the Admin API in your Caddyfile:
```caddyfile
{
  admin 0.0.0.0:2019
}
```

2. Ensure Clubs can reach the API at `http://localhost:2019`

## Development

### Prerequisites

- Node.js 22+
- pnpm

### Install Dependencies

```bash
pnpm install
```

### Run Development Servers

```bash
# Terminal 1: Frontend
pnpm dev

# Terminal 2: Backend
pnpm dev:server

# Terminal 3: Caddy with Admin API (optional, for Live Mode)
caddy run --config Caddyfile --adapter caddyfile
```

**Dev Mode with MSW** (no backend needed):
```bash
pnpm dev:msw
```

The app will be available at `http://localhost:5173`

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

```
Browser UI ─→ Clubs API ─→ Caddy Admin API (port 2019)
                 ↓              ↓
            Caddyfile      Live Config
            (source)       (runtime)
```

**Live Mode Flow:**
1. Edit configuration in the UI
2. Click "Apply to Caddy"
3. Clubs converts Caddyfile → JSON
4. Caddy validates the configuration
5. If valid: applied instantly (zero downtime)
6. If invalid: rejected, error shown in toast

**File Mode Flow:**
1. Edit configuration in the UI
2. Click "Save"
3. Changes written to Caddyfile
4. Manual Caddy reload required

### Container Architecture

Clubs runs two services in a single container:

1. **Fastify API Server** (port 8080): Handles file operations and API communication
2. **Caddy Web Server** (port 80): Serves the React app and proxies API requests

```
┌─────────────────────────────────────┐
│          Docker Container            │
│                                      │
│  ┌────────────┐    ┌──────────────┐ │
│  │   Caddy    │───→│   Fastify    │ │
│  │  (Port 80) │    │  (Port 8080) │ │
│  └────────────┘    └──────────────┘ │
│         │                  │         │
│      Serves            Manages       │
│      React App         Files         │
│                          │           │
└──────────────────────────┼───────────┘
                           │
                     ┌─────▼──────┐
                     │ /caddyfiles│
                     │  (volume)  │
                     └────────────┘
```

## Usage

1. **Browse Caddyfiles**: The home screen shows all Caddyfiles in your mounted volume
2. **Select a File**: Click on any Caddyfile to load and parse it
3. **View Structure**: See all site blocks and their directives
4. **Edit**: Click edit icons to modify configurations using smart forms
5. **Apply (Live Mode)**: Click "Apply to Caddy" for instant updates
6. **Save (File Mode)**: Click "Save" to write changes to disk

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

---

**Why "Clubs"?** It's a play on Caddy + the clubs suit (♣) from playing cards. Simple, memorable, and fun!

Built with ❤️ for the homelab community
