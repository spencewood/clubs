# Build stage
FROM node:22-alpine AS builder

WORKDIR /app

# Install pnpm first (cache this layer)
RUN npm install -g pnpm@10.10.0

# Copy only package files first for better caching
COPY package.json pnpm-lock.yaml ./

# Install dependencies (this layer will be cached unless package files change)
RUN pnpm install --frozen-lockfile

# Copy source files
COPY . .

# Build Next.js application
# Next.js will build both the frontend and API routes
RUN pnpm run build

# Production stage
FROM node:22-alpine

# Install Caddy (cache this layer)
RUN apk add --no-cache caddy

# Install pnpm (cache this layer)
RUN npm install -g pnpm@10.10.0

WORKDIR /app

# Copy package files for production dependencies first
COPY package.json pnpm-lock.yaml ./

# Install production dependencies (this layer will be cached unless package files change)
RUN pnpm install --prod --frozen-lockfile

# Copy built Next.js app (.next folder contains everything)
COPY --from=builder /app/.next /app/.next
COPY --from=builder /app/public /app/public
COPY --from=builder /app/next.config.ts /app/next.config.ts

# Copy Caddyfile
COPY Caddyfile /etc/caddy/Caddyfile

# Create directory for user Caddyfiles
RUN mkdir -p /caddyfiles

# Create startup script
# Next.js runs on port 3000 by default
# Enable Caddy Admin API on all interfaces (required for Docker networking)
RUN printf '#!/bin/sh\npnpm start &\ncaddy run --config /etc/caddy/Caddyfile --adapter caddyfile --resume\n' > /start.sh && chmod +x /start.sh

# Expose ports:
# 80 - HTTP
# 443 - HTTPS
# 2019 - Caddy Admin API (for live mode)
# 3000 - Next.js server (proxied by Caddy)
EXPOSE 80 443 2019 3000

CMD ["/start.sh"]
