# Build stage
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

# Production stage
FROM node:22-alpine

# Disable Next.js telemetry
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# Install Caddy (cache this layer)
RUN apk add --no-cache caddy

WORKDIR /app

# Copy standalone build from builder
# Next.js standalone output includes everything needed to run
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Copy startup script (copy before chmod for better caching)
COPY start.sh /start.sh
RUN chmod +x /start.sh

# Copy Caddyfile
COPY Caddyfile /etc/caddy/Caddyfile

# Create directory for user Caddyfiles
RUN mkdir -p /config

# Expose ports:
# 80 - HTTP
# 443 - HTTPS
# 2019 - Caddy Admin API (for live mode)
EXPOSE 80 443 2019

CMD ["/start.sh"]
