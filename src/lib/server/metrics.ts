import { Registry, Gauge, Counter, Histogram } from 'prom-client';

// Create a custom registry
export const register = new Registry();

// Add default labels to all metrics
register.setDefaultLabels({
  app: 'clubs',
  environment: process.env.NODE_ENV || 'development',
});

// === Caddy Upstream Metrics ===

// Gauge for upstream health status (0 = offline, 1 = unhealthy, 2 = degraded, 3 = healthy)
export const upstreamHealthGauge = new Gauge({
  name: 'caddy_upstream_health_status',
  help: 'Health status of Caddy reverse proxy upstreams (0=offline, 1=unhealthy, 2=degraded, 3=healthy)',
  labelNames: ['address', 'hostname'],
  registers: [register],
});

// Gauge for total requests per upstream
export const upstreamRequestsGauge = new Gauge({
  name: 'caddy_upstream_requests_total',
  help: 'Total number of requests handled by upstream server',
  labelNames: ['address', 'hostname'],
  registers: [register],
});

// Gauge for upstream failures
export const upstreamFailsGauge = new Gauge({
  name: 'caddy_upstream_fails_total',
  help: 'Total number of failures from upstream server',
  labelNames: ['address', 'hostname'],
  registers: [register],
});

// Gauge for upstream failure rate (percentage)
export const upstreamFailureRateGauge = new Gauge({
  name: 'caddy_upstream_failure_rate',
  help: 'Failure rate of upstream server as a percentage (0-100)',
  labelNames: ['address', 'hostname'],
  registers: [register],
});

// === Caddy API Client Metrics ===

// Counter for API calls to Caddy Admin API
export const caddyApiCallsCounter = new Counter({
  name: 'caddy_api_calls_total',
  help: 'Total number of calls to Caddy Admin API',
  labelNames: ['endpoint', 'method', 'status'],
  registers: [register],
});

// Histogram for API call duration
export const caddyApiDurationHistogram = new Histogram({
  name: 'caddy_api_duration_seconds',
  help: 'Duration of Caddy Admin API calls in seconds',
  labelNames: ['endpoint', 'method'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 5],
  registers: [register],
});

// === Caddyfile Stats Metrics ===

// Gauge for Caddyfile site blocks
export const caddyfileSiteBlocksGauge = new Gauge({
  name: 'caddyfile_site_blocks_total',
  help: 'Number of site blocks in the Caddyfile',
  registers: [register],
});

// Gauge for Caddyfile directives
export const caddyfileDirectivesGauge = new Gauge({
  name: 'caddyfile_directives_total',
  help: 'Total number of directives in the Caddyfile',
  registers: [register],
});

// Gauge for Caddyfile services
export const caddyfileServicesGauge = new Gauge({
  name: 'caddyfile_services_total',
  help: 'Number of services configured in the Caddyfile',
  registers: [register],
});

// === System Metrics ===

// Gauge for Caddy availability
export const caddyAvailabilityGauge = new Gauge({
  name: 'caddy_api_available',
  help: 'Whether the Caddy Admin API is available (1=available, 0=unavailable)',
  registers: [register],
});

// === Helper Functions ===

/**
 * Calculate health status numeric value for Prometheus
 * Based on the health calculation logic from UpstreamsView.tsx
 */
export function calculateHealthStatus(
  numRequests: number,
  fails: number
): number {
  if (numRequests === 0 && fails === 0) {
    return 0; // offline
  }

  const failureRate = numRequests > 0 ? (fails / numRequests) * 100 : 0;

  if (failureRate > 10 || fails > 20) {
    return 1; // unhealthy
  } else if (failureRate > 1) {
    return 2; // degraded
  } else {
    return 3; // healthy
  }
}

/**
 * Update upstream metrics from Caddy API data
 */
export function updateUpstreamMetrics(upstreams: Array<{
  address: string;
  num_requests?: number;
  fails?: number;
}>) {
  // Reset all upstream metrics before updating
  upstreamHealthGauge.reset();
  upstreamRequestsGauge.reset();
  upstreamFailsGauge.reset();
  upstreamFailureRateGauge.reset();

  for (const upstream of upstreams) {
    const address = upstream.address;
    const numRequests = upstream.num_requests || 0;
    const fails = upstream.fails || 0;
    const failureRate = numRequests > 0 ? (fails / numRequests) * 100 : 0;
    const healthStatus = calculateHealthStatus(numRequests, fails);

    // Extract hostname from address (e.g., "localhost:3000" -> "localhost")
    const hostname = address.split(':')[0] || address;

    // Update gauges
    upstreamHealthGauge.set({ address, hostname }, healthStatus);
    upstreamRequestsGauge.set({ address, hostname }, numRequests);
    upstreamFailsGauge.set({ address, hostname }, fails);
    upstreamFailureRateGauge.set({ address, hostname }, failureRate);
  }
}

/**
 * Update Caddyfile stats metrics
 */
export function updateCaddyfileStats(stats: {
  siteBlocks?: number;
  directives?: number;
  services?: number;
}) {
  if (stats.siteBlocks !== undefined) {
    caddyfileSiteBlocksGauge.set(stats.siteBlocks);
  }
  if (stats.directives !== undefined) {
    caddyfileDirectivesGauge.set(stats.directives);
  }
  if (stats.services !== undefined) {
    caddyfileServicesGauge.set(stats.services);
  }
}

/**
 * Record API call metrics
 */
export function recordApiCall(
  endpoint: string,
  method: string,
  status: number,
  durationSeconds: number
) {
  caddyApiCallsCounter.inc({ endpoint, method, status: status.toString() });
  caddyApiDurationHistogram.observe({ endpoint, method }, durationSeconds);
}

/**
 * Update Caddy availability status
 */
export function updateCaddyAvailability(isAvailable: boolean) {
  caddyAvailabilityGauge.set(isAvailable ? 1 : 0);
}
