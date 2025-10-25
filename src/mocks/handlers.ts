import { delay, HttpResponse, http } from "msw";
import type { CaddyAPIStatus } from "@/lib/api";

// Mock data - single Caddyfile
let mockCaddyAPIAvailable = true;
let mockCaddyfile = `# Example configuration
app.example.com {
	reverse_proxy localhost:3000
	encode gzip
}

api.example.com {
	reverse_proxy localhost:8080
}

backend.example.com {
	# This upstream is offline - configured but not reporting stats
	reverse_proxy offline-server:9000
	reverse_proxy offline-server:9001
}

monitor.example.com {
	reverse_proxy api.backend.com:443
	reverse_proxy 192.168.1.100:8000
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

	// Get current live configuration from Caddy
	http.get("/api/caddy/config", async () => {
		await delay(150);

		if (!mockCaddyAPIAvailable) {
			return HttpResponse.json(
				{ error: "Caddy API not available" },
				{ status: 503 },
			);
		}

		return HttpResponse.json({
			json: {
				apps: {
					http: {
						servers: {
							clubs: {
								listen: [":443", ":80"],
								routes: [],
							},
						},
					},
				},
			},
			caddyfile: ":80 {\n\troot * /app/dist\n\tfile_server\n}",
			config: {
				siteBlocks: [],
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

	// Get upstream health status
	http.get("/api/caddy/upstreams", async () => {
		await delay(150);

		if (!mockCaddyAPIAvailable) {
			return HttpResponse.json(
				{ error: "Caddy API not available" },
				{ status: 503 },
			);
		}

		// Mock upstream data with varying health statuses
		return HttpResponse.json([
			{
				address: "localhost:3000",
				num_requests: 12,
				fails: 0,
			},
			{
				address: "localhost:8080",
				num_requests: 45,
				fails: 3,
			},
			{
				address: "api.backend.com:443",
				num_requests: 125,
				fails: 2,
			},
			{
				address: "192.168.1.100:8000",
				num_requests: 8,
				fails: 15,
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
];
