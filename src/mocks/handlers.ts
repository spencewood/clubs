// @ts-nocheck - MSW types are complex, disable for mock handlers
import { delay, HttpResponse, http } from "msw";
import type { CaddyAPIStatus } from "@/lib/api";

// Mock data - single Caddyfile
// This is synchronized with the actual Caddyfile on disk
let mockCaddyAPIAvailable = true;
let mockCaddyfile = `# Example Caddyfile for development
# This file is used by Clubs for local development and demonstrates various Caddy features

# Global options
{
	# Admin API endpoint
	admin localhost:2019

	# Email for Let's Encrypt (production use)
	# email admin@example.com

	# Default SNI
	# default_sni example.com
}

# Simple reverse proxy with compression
app.example.com {
	reverse_proxy localhost:3000
	encode gzip
	log {
		output file /var/log/caddy/app.log
	}
}

# API with rate limiting and CORS
api.example.com {
	# Named matcher for API routes
	@api path /api/*

	handle @api {
		# CORS headers
		header {
			Access-Control-Allow-Origin *
			Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS"
			Access-Control-Allow-Headers "Content-Type, Authorization"
		}

		# Rate limiting (requires rate_limit plugin)
		# rate_limit {
		#     zone api_zone
		#     events 100
		#     window 1m
		# }

		reverse_proxy localhost:8080
	}

	# Handle everything else
	handle {
		respond "API endpoint not found" 404
	}
}

# Static site with file server
static.example.com {
	root * /var/www/html
	file_server browse
	encode zstd gzip

	# Try files, fallback to index.html (SPA support)
	try_files {path} {path}/ /index.html
}

# Backend with multiple upstreams and health checks
backend.example.com {
	# Named matcher for websocket upgrades
	@websocket {
		header Connection *Upgrade*
		header Upgrade websocket
	}

	# Handle websockets separately
	handle @websocket {
		reverse_proxy offline-server:9000 offline-server:9001 {
			lb_policy least_conn
		}
	}

	# Regular HTTP traffic
	handle {
		reverse_proxy offline-server:9000 offline-server:9001 {
			lb_policy round_robin
			lb_try_duration 5s

			health_uri /health
			health_interval 30s
			health_timeout 5s

			fail_duration 30s
			max_fails 3
		}
	}
}

# Path-based routing with matchers
monitor.example.com {
	# Named matchers
	@metrics path /metrics*
	@api path /api/*
	@web path /*

	# Metrics endpoint (internal only)
	handle @metrics {
		# Restrict to internal IPs
		@internal remote_ip 127.0.0.1 192.168.0.0/16 172.16.0.0/12

		handle @internal {
			reverse_proxy localhost:9090
		}

		handle {
			respond "Forbidden" 403
		}
	}

	# API routes
	handle @api {
		reverse_proxy api.backend.com:443 {
			transport http {
				tls
				tls_server_name api.backend.com
			}
		}
	}

	# Web UI
	handle @web {
		reverse_proxy 192.168.1.100:8000
	}
}

# Redirect and rewrite examples
redirect.example.com {
	# Redirect HTTP to HTTPS
	redir https://app.example.com{uri} permanent
}

# Authentication example (requires caddy-security plugin)
secure.example.com {
	# Basic auth (requires hash)
	# basicauth {
	#     admin JDJhJDE0JEVCNmdaNEg2Ti5iejRMYkF3MFZhZ3VtV3E1SzBWZEZ5Q3VWc0tzOEJwZE9TaFlZdEVkZDhX
	# }

	reverse_proxy localhost:3000
}

# Multiple domains, one config
example.com, www.example.com {
	# Redirect www to non-www
	@www host www.example.com
	handle @www {
		redir https://example.com{uri} permanent
	}

	root * /var/www/example
	file_server
	encode gzip
}

# Custom error pages
errors.example.com {
	handle_errors {
		@404 expression {http.error.status_code} == 404
		@5xx expression {http.error.status_code} >= 500 && {http.error.status_code} < 600

		handle @404 {
			rewrite * /404.html
			file_server {
				root /var/www/errors
			}
		}

		handle @5xx {
			rewrite * /500.html
			file_server {
				root /var/www/errors
			}
		}
	}

	reverse_proxy localhost:3000
}

# TLS configuration example
tls.example.com {
	tls {
		protocols tls1.2 tls1.3
		ciphers TLS_ECDHE_ECDSA_WITH_AES_256_GCM_SHA384 TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384
	}

	reverse_proxy localhost:3000
}

# PHP-FPM example
php.example.com {
	root * /var/www/php
	php_fastcgi localhost:9000
	file_server
}

# Load balancing with multiple strategies
loadbalanced.example.com {
	reverse_proxy localhost:3001 localhost:3002 localhost:3003 {
		lb_policy ip_hash
		lb_try_duration 5s
		lb_try_interval 250ms

		header_up X-Real-IP {remote_host}
		header_up X-Forwarded-For {remote_host}
		header_up X-Forwarded-Proto {scheme}
	}
}`;

// Helper to toggle API availability (for testing)
export const setMockCaddyAPIAvailable = (available: boolean) => {
	mockCaddyAPIAvailable = available;
};

export const setMockCaddyfile = (content: string) => {
	mockCaddyfile = content;
};

export const getMockCaddyfile = () => {
	return mockCaddyfile;
};

export const handlers = [
	// Mock Caddy Admin API endpoints (port 2019)
	// These are called by our API routes via the caddy-api-client

	// Root endpoint - Returns Caddy version info (used for health checks)
	http.get("http://localhost:2019/", async () => {
		await delay(50);
		if (!mockCaddyAPIAvailable) {
			return new HttpResponse(null, { status: 503 });
		}
		return HttpResponse.json({
			version: "v2.7.6",
		});
	}),

	http.get("http://localhost:2019/config/", async ({ request }) => {
		await delay(100);

		// Check Accept header to determine response format
		const acceptHeader = request.headers.get("accept");
		if (acceptHeader?.includes("text/caddyfile")) {
			// Return Caddyfile format
			return HttpResponse.text(mockCaddyfile);
		}

		// Default: Return JSON format
		return HttpResponse.json({
			apps: {
				http: {
					servers: {
						srv0: {
							listen: [":80", ":443"],
							routes: [],
						},
					},
				},
			},
		});
	}),

	http.get("http://localhost:2019/reverse_proxy/upstreams", async () => {
		await delay(100);

		// Simulate increasing request counts over time for realistic metrics
		const timeSinceStart = Date.now() % 60000; // Reset every minute
		const requestMultiplier = 1 + (timeSinceStart / 60000) * 0.5;

		return HttpResponse.json([
			// Healthy examples (0 fails or very low failure rate < 1%)
			{
				address: "localhost:3000",
				num_requests: Math.floor(142 * requestMultiplier),
				fails: 0,
			},
			{
				address: "localhost:3001",
				num_requests: Math.floor(89 * requestMultiplier),
				fails: 0,
			},
			{
				address: "localhost:3002",
				num_requests: Math.floor(500 * requestMultiplier),
				fails: Math.floor(2 * requestMultiplier), // ~0.4% failure rate - healthy
			},
			{
				address: "localhost:3003",
				num_requests: Math.floor(91 * requestMultiplier),
				fails: 0,
			},
			// Degraded example (failure rate between 1-10%)
			{
				address: "localhost:8080",
				num_requests: Math.floor(300 * requestMultiplier),
				fails: Math.floor(8 * requestMultiplier), // ~2.67% failure rate - degraded
			},
			// More healthy examples
			{
				address: "localhost:9000",
				num_requests: Math.floor(1250 * requestMultiplier),
				fails: Math.floor(3 * requestMultiplier), // ~0.24% - healthy
			},
			{
				address: "localhost:9090",
				num_requests: Math.floor(856 * requestMultiplier),
				fails: Math.floor(1 * requestMultiplier), // ~0.12% - healthy
			},
			// offline-server:9000 and offline-server:9001 are NOT included
			// In real Caddy API, unhealthy/offline upstreams don't appear in /reverse_proxy/upstreams
			// They're configured in the Caddyfile but have no stats, so consolidateUpstreamsWithConfig marks them offline
			{
				address: "api.backend.com:443",
				num_requests: Math.floor(10485 * requestMultiplier),
				fails: Math.floor(31 * requestMultiplier), // ~0.3% failure rate - healthy
			},
			// Unhealthy example (failure rate > 10%)
			{
				address: "192.168.1.100:8000",
				num_requests: Math.floor(100 * requestMultiplier),
				fails: Math.floor(25 * requestMultiplier), // 25% failure rate - unhealthy
			},
		]);
	}),

	http.get("http://localhost:2019/pki/ca/:caId", async ({ params }) => {
		await delay(100);
		const caId = (params.caId as string) || "local";
		return HttpResponse.json({
			id: caId,
			name: caId === "local" ? "Caddy Local Authority" : caId,
			root_common_name: `Caddy Local Authority - ${new Date().getFullYear()}`,
			intermediate_common_name: `Caddy Local Authority - ${new Date().getFullYear()} Intermediate`,
			root_certificate:
				"-----BEGIN CERTIFICATE-----\nMOCK_ROOT_CERT\n-----END CERTIFICATE-----",
			intermediate_certificate:
				"-----BEGIN CERTIFICATE-----\nMOCK_INTERMEDIATE_CERT\n-----END CERTIFICATE-----",
		});
	}),

	// Our API routes
	// Check Caddy API status
	http.get("/api/caddy/status", async () => {
		await delay(100); // Simulate network delay

		const status: CaddyAPIStatus = {
			available: mockCaddyAPIAvailable,
			running: mockCaddyAPIAvailable,
			url: "http://localhost:2019",
			version: mockCaddyAPIAvailable ? "v2.7.6" : undefined,
		};

		return HttpResponse.json(status);
	}),

	// Get Caddyfile - always returns file content (no live mode)
	http.get("/api/caddyfile", async () => {
		await delay(100);

		// Always return file content (we changed the backend to not read from live Caddy)
		return HttpResponse.text(mockCaddyfile);
	}),

	// Caddy Admin API - Load/Apply configuration
	http.post("http://localhost:2019/load", async ({ request }) => {
		await delay(200);
		const caddyfileContent = await request.text();

		// Simulate validation
		if (caddyfileContent.includes("INVALID")) {
			return new HttpResponse(
				"adapting config using caddyfile: parsing caddyfile tokens for 'INVALID': unknown directive 'INVALID'",
				{
					status: 400,
					headers: { "Content-Type": "text/plain" },
				},
			);
		}

		// Check for basic syntax issues
		const openBraces = (caddyfileContent.match(/{/g) || []).length;
		const closeBraces = (caddyfileContent.match(/}/g) || []).length;
		if (openBraces !== closeBraces) {
			return new HttpResponse(
				"adapting config using caddyfile: mismatched braces",
				{
					status: 400,
					headers: { "Content-Type": "text/plain" },
				},
			);
		}

		// Successfully applied - return 200 with no body (like real Caddy API)
		return new HttpResponse(null, { status: 200 });
	}),

	// Save Caddyfile
	http.put("/api/caddyfile", async ({ request }) => {
		await delay(200);
		const content = await request.text();

		// Basic Caddyfile validation
		if (!content || content.trim().length === 0) {
			return HttpResponse.json(
				{ error: "Caddyfile cannot be empty" },
				{ status: 400 },
			);
		}

		// Check for obvious syntax errors
		const lines = content.split("\n");
		let openBraces = 0;
		let closeBraces = 0;

		for (const line of lines) {
			const trimmed = line.trim();
			if (trimmed.includes("{"))
				openBraces += (trimmed.match(/{/g) || []).length;
			if (trimmed.includes("}"))
				closeBraces += (trimmed.match(/}/g) || []).length;
		}

		if (openBraces !== closeBraces) {
			return HttpResponse.json(
				{ error: "Mismatched braces in Caddyfile" },
				{ status: 400 },
			);
		}

		// Check for invalid directives (common typos)
		const invalidDirectives = ["INVALID", "invalid_directive", "bad_directive"];
		for (const invalid of invalidDirectives) {
			if (content.includes(invalid)) {
				return HttpResponse.json(
					{ error: `Invalid directive: ${invalid}` },
					{ status: 400 },
				);
			}
		}

		mockCaddyfile = content;

		return HttpResponse.json({
			message: "Caddyfile saved successfully",
		});
	}),

	// Apply configuration to Caddy (Live Mode)
	http.post("/api/caddyfile/apply", async () => {
		await delay(300);

		if (!mockCaddyAPIAvailable) {
			return HttpResponse.json(
				{
					error: "Failed to apply configuration",
					details: "Caddy Admin API is not reachable",
				},
				{ status: 503 },
			);
		}

		// Simulate validation
		if (mockCaddyfile.includes("INVALID")) {
			return HttpResponse.json(
				{
					error: "Failed to apply configuration",
					details:
						"Caddy rejected the configuration: Invalid syntax: unknown directive 'INVALID'",
				},
				{ status: 400 },
			);
		}

		return HttpResponse.json({
			message: "Configuration applied successfully",
		});
	}),

	// Get current live configuration from Caddy (via Next.js API route)
	// This route proxies to http://localhost:2019/config/ which is mocked below
	http.get("/api/caddy/config", async () => {
		await delay(150);

		if (!mockCaddyAPIAvailable) {
			return HttpResponse.json(
				{ error: "Caddy API not available" },
				{ status: 503 },
			);
		}

		// Return the same shape as the Caddy Admin API /config/ endpoint
		// The Next.js API route just passes this through
		return HttpResponse.json({
			apps: {
				http: {
					servers: {
						srv0: {
							listen: [":443", ":80"],
							routes: [
								{
									match: [{ host: ["app.example.com"] }],
									handle: [
										{
											handler: "reverse_proxy",
											upstreams: [{ dial: "localhost:3000" }],
										},
									],
								},
							],
						},
					},
				},
				tls: {
					automation: {
						policies: [
							{
								subjects: ["*.example.com"],
								issuers: [{ module: "acme" }],
							},
						],
					},
				},
			},
			admin: {
				listen: "localhost:2019",
			},
		});
	}),

	// Format Caddyfile - now just validates and returns original (matching new backend behavior)
	http.post("/api/caddyfile/format", async ({ request }) => {
		await delay(200);
		const content = await request.text();

		// Validate content
		if (!content || content.trim().length === 0) {
			return HttpResponse.json(
				{ error: "Cannot format empty Caddyfile" },
				{ status: 400 },
			);
		}

		// Check for invalid directives
		if (content.includes("INVALID")) {
			return HttpResponse.json(
				{
					error: "Invalid Caddyfile",
					details: "Caddy could not parse the configuration",
				},
				{ status: 400 },
			);
		}

		// Return JSON response matching new backend format
		return HttpResponse.json({
			formatted: false,
			content: content,
			warning:
				"Caddy fmt not available in mock mode - returning unformatted content",
		});
	}),

	// Get upstream health status (for tests that call getCaddyUpstreams from @/lib/api.ts)
	// In production/SSR, this Next.js API route would proxy to the Caddy Admin API
	// But in tests, we mock this route directly to avoid the indirection
	http.get("/api/caddy/upstreams", async () => {
		await delay(100);

		if (!mockCaddyAPIAvailable) {
			return HttpResponse.json(
				{ error: "Caddy API not available" },
				{ status: 503 },
			);
		}

		// Return same data as Caddy Admin API mock (with dynamic metrics)
		const timeSinceStart = Date.now() % 60000;
		const requestMultiplier = 1 + (timeSinceStart / 60000) * 0.5;

		return HttpResponse.json([
			{
				address: "localhost:3000",
				num_requests: Math.floor(142 * requestMultiplier),
				fails: 0,
			},
			{
				address: "localhost:3001",
				num_requests: Math.floor(89 * requestMultiplier),
				fails: 0,
			},
			{
				address: "localhost:3002",
				num_requests: Math.floor(500 * requestMultiplier),
				fails: Math.floor(2 * requestMultiplier),
			},
			{
				address: "localhost:3003",
				num_requests: Math.floor(91 * requestMultiplier),
				fails: 0,
			},
			{
				address: "localhost:8080",
				num_requests: Math.floor(300 * requestMultiplier),
				fails: Math.floor(8 * requestMultiplier),
			},
			{
				address: "localhost:9000",
				num_requests: Math.floor(1250 * requestMultiplier),
				fails: Math.floor(3 * requestMultiplier),
			},
			{
				address: "localhost:9090",
				num_requests: Math.floor(856 * requestMultiplier),
				fails: Math.floor(1 * requestMultiplier),
			},
			{
				address: "api.backend.com:443",
				num_requests: Math.floor(10485 * requestMultiplier),
				fails: Math.floor(31 * requestMultiplier),
			},
			{
				address: "192.168.1.100:8000",
				num_requests: Math.floor(100 * requestMultiplier),
				fails: Math.floor(25 * requestMultiplier),
			},
		]);
	}),

	// Get PKI CA certificate information
	http.get("/api/caddy/pki/ca/:caId?", async ({ params }) => {
		await delay(150);

		if (!mockCaddyAPIAvailable) {
			return HttpResponse.json(
				{ error: "Caddy API not available" },
				{ status: 503 },
			);
		}

		const { caId = "local" } = params;

		// Mock PKI CA data
		return HttpResponse.json({
			id: caId,
			name: "Caddy Local Authority",
			root_common_name: `Caddy Local Authority - ${new Date().getFullYear()} ECC Root`,
			intermediate_common_name: `Caddy Local Authority - ECC Intermediate`,
			root_certificate: `-----BEGIN CERTIFICATE-----
MIIBtjCCAVygAwIBAgIRAMp8rgWvpYmqKrFKSwEHyuswCgYIKoZIzj0EAwIwOjE4
MDYGA1UEAxMvQ2FkZHkgTG9jYWwgQXV0aG9yaXR5IC0gMjAyNCBFQ0MgUm9vdDAe
Fw0yNDAxMDEwMDAwMDBaFw0zNDEyMzEyMzU5NTlaMDoxODA2BgNVBAMTL0NhZGR5
IExvY2FsIEF1dGhvcml0eSAtIDIwMjQgRUNDIFJvb3QwWTATBgcqhkjOPQIBBggq
hkjOPQMBBwNCAATXVqfYe7pCPv1xP6wZLcJXvf5WNHPjpzV3MZYbq7d8XGJ0dLc8
-----END CERTIFICATE-----`,
			intermediate_certificate: `-----BEGIN CERTIFICATE-----
MIICFDCCAbqgAwIBAgIQPZNK7tGKHu7QLWwI8fKHCTAKBggqhkjOPQQDAjA6MTgw
NgYDVQQDEy9DYWRkeSBMb2NhbCBBdXRob3JpdHkgLSAyMDI0IEVDQyBSb290MB4X
DTI0MDEwMTAwMDAwMFoXDTM0MTIzMTIzNTk1OVowPDE6MDgGA1UEAxMxQ2FkZHkg
TG9jYWwgQXV0aG9yaXR5IC0gRUNDIEludGVybWVkaWF0ZTBZMBMGByqGSM49AgEG
CCqGSM49AwEHA0IABM8rHGvL0P/7nQ7S3F0RxGi3cT8xNjcxW9pYcMKxZ2k1Wqcz
-----END CERTIFICATE-----`,
		});
	}),

	// Get active TLS certificates from Caddy API
	// This returns the actual certificates Caddy is currently using
	http.get("http://localhost:2019/config/apps/tls/certificates", async () => {
		await delay(100);

		if (!mockCaddyAPIAvailable) {
			return new HttpResponse(null, { status: 503 });
		}

		// Mock active TLS certificates (what Caddy is actually serving)
		// These dates should be VALID (future expiry)
		const now = new Date();
		const futureDate60 = new Date(now);
		futureDate60.setDate(futureDate60.getDate() + 60);

		const futureDate90 = new Date(now);
		futureDate90.setDate(futureDate90.getDate() + 90);

		const futureDate120 = new Date(now);
		futureDate120.setDate(futureDate120.getDate() + 120);

		return HttpResponse.json([
			{
				subjects: ["*.spencewood.com", "spencewood.com"],
				issuer: {
					commonName: "R3",
					organization: "Let's Encrypt",
				},
				notBefore: now.toISOString(),
				notAfter: futureDate60.toISOString(),
				serialNumber: "03:AB:CD:EF:12:34:56:78:90",
			},
			{
				subjects: ["example.com", "www.example.com"],
				issuer: {
					commonName: "R3",
					organization: "Let's Encrypt",
				},
				notBefore: now.toISOString(),
				notAfter: futureDate90.toISOString(),
				serialNumber: "04:12:34:56:78:90:AB:CD:EF",
			},
			{
				subjects: ["secure.example.com"],
				issuer: {
					commonName: "ZeroSSL RSA Domain Secure Site CA",
					organization: "ZeroSSL",
				},
				notBefore: now.toISOString(),
				notAfter: futureDate120.toISOString(),
				serialNumber: "06:11:22:33:44:55:66:77:88",
			},
		]);
	}),

	// Get ACME certificates - now proxies to Caddy API for active certificates
	http.get("/api/certificates", async () => {
		await delay(100);

		if (!mockCaddyAPIAvailable) {
			// Return empty when API unavailable
			return HttpResponse.json({
				success: true,
				certificates: [],
				certificatesByType: {
					letsencrypt: [],
					zerossl: [],
					custom: [],
					local: [],
				},
				source: "none",
				error: "Caddy API not available",
			});
		}

		// Calculate dynamic expiry days
		const now = new Date();
		const futureDate60 = new Date(now);
		futureDate60.setDate(futureDate60.getDate() + 60);

		const futureDate90 = new Date(now);
		futureDate90.setDate(futureDate90.getDate() + 90);

		const futureDate120 = new Date(now);
		futureDate120.setDate(futureDate120.getDate() + 120);

		const mockCerts = [
			{
				domain: "*.spencewood.com",
				certPath: "N/A (from Caddy API)",
				hasPrivateKey: true,
				type: "letsencrypt" as const,
				provider: "Let's Encrypt",
				certificate: {
					subject: "CN=*.spencewood.com",
					issuer: "O=Let's Encrypt, CN=R3",
					validFrom: now.toISOString(),
					validTo: futureDate60.toISOString(),
					daysUntilExpiry: 60,
					serialNumber: "03:AB:CD:EF:12:34:56:78:90",
					fingerprint: "N/A",
					subjectAltNames: ["*.spencewood.com", "spencewood.com"],
					keyAlgorithm: "N/A",
					signatureAlgorithm: "RSA-SHA256",
				},
			},
			{
				domain: "example.com",
				certPath: "N/A (from Caddy API)",
				hasPrivateKey: true,
				type: "letsencrypt" as const,
				provider: "Let's Encrypt",
				certificate: {
					subject: "CN=example.com",
					issuer: "O=Let's Encrypt, CN=R3",
					validFrom: now.toISOString(),
					validTo: futureDate90.toISOString(),
					daysUntilExpiry: 90,
					serialNumber: "04:12:34:56:78:90:AB:CD:EF",
					fingerprint: "N/A",
					subjectAltNames: ["example.com", "www.example.com"],
					keyAlgorithm: "N/A",
					signatureAlgorithm: "RSA-SHA256",
				},
			},
			{
				domain: "secure.example.com",
				certPath: "N/A (from Caddy API)",
				hasPrivateKey: true,
				type: "zerossl" as const,
				provider: "ZeroSSL",
				certificate: {
					subject: "CN=secure.example.com",
					issuer: "O=ZeroSSL, CN=ZeroSSL RSA Domain Secure Site CA",
					validFrom: now.toISOString(),
					validTo: futureDate120.toISOString(),
					daysUntilExpiry: 120,
					serialNumber: "06:11:22:33:44:55:66:77:88",
					fingerprint: "N/A",
					subjectAltNames: ["secure.example.com"],
					keyAlgorithm: "N/A",
					signatureAlgorithm: "RSA-SHA256",
				},
			},
		];

		// Group by type
		const grouped = {
			letsencrypt: mockCerts.filter((c) => c.type === "letsencrypt"),
			zerossl: mockCerts.filter((c) => c.type === "zerossl"),
			custom: mockCerts.filter((c) => c.type === "custom"),
			local: mockCerts.filter((c) => c.type === "local"),
		};

		// Return mock ACME certificates from API with source indicator
		return HttpResponse.json({
			success: true,
			certificates: mockCerts,
			certificatesByType: grouped,
			source: "api",
			mock: false,
		});
	}),
];
