# ♣ Clubs

**A modern, container-native Caddyfile management system**

Clubs is a web-based management tool for editing and managing Caddy server Caddyfiles. Built to run in Docker with direct file system access to your Caddyfiles, it provides a clean, intuitive interface for visualizing and modifying your Caddy configuration.

## Features

- **Direct File Management**: Works directly with mounted Caddyfile volumes - no uploads needed
- **Visual Editor**: Parse and visualize Caddyfile configurations in a clean UI
- **Live Editing**: Modify directives, add/remove rules, and manage site blocks
- **Real-time Saves**: Changes are written directly to your mounted Caddyfile directory
- **Container-First**: Designed to run as a Docker container alongside your Caddy server

## Tech Stack

- **Frontend**: React 19 + TypeScript + Vite
- **Styling**: Tailwind CSS v4 + shadcn/ui components
- **Backend**: Fastify (Node.js) for file operations
- **Web Server**: Caddy (of course!)
- **Linting**: Biome

## Quick Start with Docker

```bash
# Clone the repository
git clone <repo-url>
cd clubs

# Build and run with docker-compose
docker-compose up --build
```

The application will be available at `http://localhost:3000`

## Docker Configuration

The `docker-compose.yml` maps your Caddyfiles directory into the container:

```yaml
volumes:
  - ./caddyfiles:/caddyfiles:rw
```

**To use your own Caddyfiles directory:**

```yaml
volumes:
  - /path/to/your/caddyfiles:/caddyfiles:rw
```

Clubs will automatically detect all files named `Caddyfile` or ending in `.caddy` in the mounted directory.

## Development

### Prerequisites

- Node.js 22+
- pnpm (recommended)

### Install Dependencies

```bash
pnpm install
```

### Run Development Server

```bash
pnpm dev
```

The app will be available at `http://localhost:5174`

In development mode, the file browser will show mock data and save operations will download files locally.

### Linting and Formatting

```bash
# Check for issues
pnpm lint

# Fix issues automatically
pnpm lint:fix

# Format code
pnpm format
```

### Build for Production

```bash
pnpm build
```

## Architecture

Clubs runs two services in a single container:

1. **Fastify API Server** (port 8080): Handles file operations (list, read, write)
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
3. **View Structure**: See all site blocks and their directives in a hierarchical view
4. **Edit Directives**: Click the pencil icon to modify directive names and arguments
5. **Add/Remove**: Use the + button to add new directives or site blocks
6. **Save Changes**: Click "Save" to write changes back to the file
7. **Close**: Return to the file browser to select another Caddyfile

## Project Structure

```
clubs/
├── src/                    # React frontend
│   ├── components/         # UI components
│   │   ├── ui/            # shadcn/ui components
│   │   ├── CaddyfileBrowser.tsx
│   │   ├── SiteBlockCard.tsx
│   │   ├── DirectiveItem.tsx
│   │   └── *Dialog.tsx    # Edit/Add dialogs
│   ├── lib/
│   │   ├── parser/        # Caddyfile parser
│   │   └── utils.ts
│   ├── types/             # TypeScript definitions
│   └── App.tsx
├── server/                 # Fastify API
│   ├── index.js           # API server
│   └── package.json
├── caddyfiles/            # Example Caddyfiles (for testing)
├── Caddyfile              # Caddy configuration for the app
├── Dockerfile             # Multi-stage build
└── docker-compose.yml     # Docker Compose config
```

## Caddyfile Parser

The application includes a custom Caddyfile parser that:
- Parses site blocks and directives
- Handles nested directive blocks
- Supports comments and quoted strings
- Serializes back to valid Caddyfile format
- Maintains formatting and structure

## Security

- Directory traversal protection on all file operations
- Read-only by default in the container (use `:rw` for write access)
- No file deletion capability (edit/add only)
- API server validates all file paths

## Contributing

Contributions welcome! This is a tool for the Caddy community.

## License

MIT

---

**Why "Clubs"?** It's a play on Caddy + the clubs suit (♣) from playing cards. Simple, memorable, and fun!
