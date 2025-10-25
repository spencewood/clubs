# App-only build - no Caddy included
# Use this when deploying behind an external reverse proxy
FROM node:22-alpine AS builder

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

# Production stage - app only, no Caddy
FROM node:22-alpine

# Disable Next.js telemetry
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

WORKDIR /app

# Copy standalone build from builder
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Create directory for config (Caddyfile will be mounted here)
RUN mkdir -p /config

# Expose port 3000 for Next.js
EXPOSE 3000

# Start Next.js on all interfaces
CMD ["sh", "-c", "HOSTNAME=0.0.0.0 PORT=3000 node server.js"]
