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
	http.get("http://localhost:8080/api/caddy/status", async () => {
		await delay(100); // Simulate network delay

		const status: CaddyAPIStatus = {
			available: mockCaddyAPIAvailable,
			running: mockCaddyAPIAvailable,
			url: "http://localhost:2019",
			version: mockCaddyAPIAvailable ? "v2.7.6" : undefined,
		};

		return HttpResponse.json(status);
	}),

	// Get Caddyfile
	http.get("http://localhost:8080/api/caddyfile", async ({ request }) => {
		await delay(100);

		const url = new URL(request.url);
		const source = url.searchParams.get("source");

		// If requesting live source but API not available, return 404
		if (source === "live" && !mockCaddyAPIAvailable) {
			return HttpResponse.json(
				{ error: "Caddyfile not found" },
				{ status: 404 },
			);
		}

		// If requesting live source and API is available, return live config
		if (source === "live" && mockCaddyAPIAvailable) {
			// Simulate reading from live Caddy
			return HttpResponse.text(mockCaddyfile);
		}

		// Default: return file content
		return HttpResponse.text(mockCaddyfile);
	}),

	// Save Caddyfile
	http.put("http://localhost:8080/api/caddyfile", async ({ request }) => {
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
	http.post("http://localhost:8080/api/caddyfile/apply", async () => {
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
	http.get("http://localhost:8080/api/caddy/config", async () => {
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

	// Format Caddyfile
	http.post(
		"http://localhost:8080/api/caddyfile/format",
		async ({ request }) => {
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
					{ error: "Invalid Caddyfile syntax" },
					{ status: 400 },
				);
			}

			// Simple formatting: normalize spacing and indentation
			const lines = content.split("\n");
			const formatted: string[] = [];
			let indentLevel = 0;

			for (const line of lines) {
				const trimmed = line.trim();
				if (!trimmed) continue;

				// Decrease indent before closing brace
				if (trimmed === "}") {
					indentLevel = Math.max(0, indentLevel - 1);
				}

				// Add line with proper indentation
				formatted.push("\t".repeat(indentLevel) + trimmed);

				// Increase indent after opening brace
				if (trimmed.endsWith("{")) {
					indentLevel++;
				}
			}

			return HttpResponse.text(formatted.join("\n"));
		},
	),
];
