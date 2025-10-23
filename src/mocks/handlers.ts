import { delay, HttpResponse, http } from "msw";
import type { CaddyAPIStatus } from "@/lib/api";

// Mock data - single Caddyfile
let mockCaddyAPIAvailable = true;
let mockCaddyfile = `# Example configuration
app.example.com {
	reverse_proxy localhost:3000
	encode gzip
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

		// Return original content (matching new backend behavior - just validates, doesn't format)
		return HttpResponse.text(content);
	}),
];
