# Build stage
FROM node:22-alpine AS builder

WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm@10.10.0
RUN pnpm install --frozen-lockfile
COPY . .

# Build frontend and server
RUN pnpm run build
RUN pnpm run build:server

# Production stage
FROM node:22-alpine

# Install Caddy
RUN apk add --no-cache caddy

WORKDIR /app

# Copy built frontend
COPY --from=builder /app/dist /app/dist

# Copy package files for production dependencies
COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm@10.10.0
RUN pnpm install --prod --frozen-lockfile

# Copy Caddyfile
COPY Caddyfile /etc/caddy/Caddyfile

# Create directory for user Caddyfiles
RUN mkdir -p /caddyfiles

# Create startup script
RUN printf '#!/bin/sh\nnode /app/dist/server/index.js &\ncaddy run --config /etc/caddy/Caddyfile --adapter caddyfile\n' > /start.sh && chmod +x /start.sh

EXPOSE 80

CMD ["/start.sh"]
