import { delay, HttpResponse, http } from "msw";
import type { CaddyAPIStatus } from "@/lib/api";

// Mock data
let mockCaddyAPIAvailable = true;
const mockCaddyfiles: Record<string, string> = {
	"example.caddy": `# Example configuration
app.example.com {
	reverse_proxy localhost:3000
	encode gzip
}

files.example.com {
	root * /var/www/files
	file_server browse
}`,
	Caddyfile: `:80 {
	root * /app/dist
	file_server
	encode gzip
}`,
};

// Helper to toggle API availability (for testing)
export const setMockCaddyAPIAvailable = (available: boolean) => {
	mockCaddyAPIAvailable = available;
};

export const setMockCaddyfile = (filename: string, content: string) => {
	mockCaddyfiles[filename] = content;
};

export const getMockCaddyfile = (filename: string) => {
	return mockCaddyfiles[filename];
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

	// List Caddyfiles
	http.get("http://localhost:8080/api/caddyfiles", async () => {
		await delay(100);

		const files = Object.keys(mockCaddyfiles).map((name) => ({
			name,
			path: `/caddyfiles/${name}`,
			stats: {
				siteBlocks: 2,
				directives: 4,
			},
		}));

		return HttpResponse.json(files);
	}),

	// Get specific Caddyfile
	http.get(
		"http://localhost:8080/api/caddyfiles/:filename",
		async ({ params }) => {
			await delay(100);
			const { filename } = params;

			const content = mockCaddyfiles[filename as string];

			if (!content) {
				return HttpResponse.json({ error: "File not found" }, { status: 404 });
			}

			return HttpResponse.text(content);
		},
	),

	// Save Caddyfile
	http.put(
		"http://localhost:8080/api/caddyfiles/:filename",
		async ({ params, request }) => {
			await delay(200);
			const { filename } = params;
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
			const invalidDirectives = [
				"INVALID",
				"invalid_directive",
				"bad_directive",
			];
			for (const invalid of invalidDirectives) {
				if (content.includes(invalid)) {
					return HttpResponse.json(
						{ error: `Invalid directive: ${invalid}` },
						{ status: 400 },
					);
				}
			}

			mockCaddyfiles[filename as string] = content;

			return HttpResponse.json({
				message: "File saved successfully",
			});
		},
	),

	// Apply configuration to Caddy (Live Mode)
	http.post(
		"http://localhost:8080/api/caddyfiles/:filename/apply",
		async ({ params }) => {
			await delay(300);
			const { filename } = params;

			if (!mockCaddyAPIAvailable) {
				return HttpResponse.json(
					{
						error: "Caddy API not available",
						details: "Admin API is not reachable",
					},
					{ status: 503 },
				);
			}

			const content = mockCaddyfiles[filename as string];

			if (!content) {
				return HttpResponse.json({ error: "File not found" }, { status: 404 });
			}

			// Simulate validation
			if (content.includes("INVALID")) {
				return HttpResponse.json(
					{
						error: "Caddy rejected the configuration",
						details: "Invalid syntax: unknown directive 'INVALID'",
					},
					{ status: 400 },
				);
			}

			return HttpResponse.json({
				success: true,
				message: "Configuration applied successfully",
			});
		},
	),

	// Validate configuration
	http.post(
		"http://localhost:8080/api/caddyfiles/:filename/validate",
		async ({ params }) => {
			await delay(200);
			const { filename } = params;

			const content = mockCaddyfiles[filename as string];

			if (!content) {
				return HttpResponse.json({ error: "File not found" }, { status: 404 });
			}

			// Basic validation
			if (content.includes("INVALID")) {
				return HttpResponse.json({
					valid: false,
					errors: ["Invalid syntax: unknown directive 'INVALID'"],
					source: "caddyfile_parser",
				});
			}

			if (!mockCaddyAPIAvailable) {
				return HttpResponse.json({
					valid: true,
					warnings: ["Caddy API not available, only syntax checked"],
					source: "caddyfile_parser",
				});
			}

			return HttpResponse.json({
				valid: true,
				source: "caddy_api",
			});
		},
	),

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
];
