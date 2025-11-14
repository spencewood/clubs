# App-only build - no Caddy included
# Use this when deploying behind an external reverse proxy
FROM node:24-alpine AS builder

WORKDIR /app

# Disable Next.js telemetry
ENV NEXT_TELEMETRY_DISABLED=1

# Enable corepack and install pnpm (cache this layer)
RUN corepack enable && corepack prepare pnpm@10.10.0 --activate

# Copy only package files first for better caching
COPY package.json pnpm-lock.yaml ./

# Install dependencies (this layer will be cached unless package files change)
RUN pnpm install --frozen-lockfile

# Copy source files
COPY . .

# Build Next.js application
RUN pnpm run build

# Production stage - app + Caddy CLI (for caddy fmt)
FROM node:24-alpine

# Disable Next.js telemetry
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# Install Caddy (for CLI commands like 'caddy fmt')
RUN apk add --no-cache caddy

WORKDIR /app

# Copy standalone build from builder
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Create directories for config and persistent data
RUN mkdir -p /config /app/data

# Expose port 3000 for Next.js
EXPOSE 3000

# Volume for persistent data (SQLite database, auto-generated secrets, etc.)
VOLUME /app/data

# Health check for Docker/K8s orchestration using Node.js (no extra deps needed)
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://localhost:3000/api/health').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))" || exit 1

# Start Next.js on all interfaces
# Note: We only run Next.js, not Caddy as a server
CMD ["sh", "-c", "HOSTNAME=0.0.0.0 PORT=3000 node server.js"]
