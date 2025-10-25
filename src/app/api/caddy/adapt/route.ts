import { type NextRequest, NextResponse } from "next/server";

const CADDY_API_URL = process.env.CADDY_API_URL || "http://localhost:2019";

export async function POST(request: NextRequest) {
	try {
		const content = await request.text();

		// Use Caddy's /adapt endpoint to convert Caddyfile to JSON
		const adaptResponse = await fetch(`${CADDY_API_URL}/adapt`, {
			method: "POST",
			headers: {
				"Content-Type": "text/caddyfile",
			},
			body: content,
		});

		if (!adaptResponse.ok) {
			const errorText = await adaptResponse.text();
			return NextResponse.json(
				{
					error: "Failed to adapt Caddyfile",
					details: errorText,
				},
				{ status: adaptResponse.status },
			);
		}

		const adaptResult = (await adaptResponse.json()) as Record<string, unknown>;

		// Caddy's /adapt endpoint may return { warnings, result } or just the config
		// Extract the actual config
		const config =
			(adaptResult.result as Record<string, unknown>) || adaptResult;

		// Extract just the HTTP app's server configuration for this site
		// This is more focused than returning the entire config
		const apps = config?.apps as Record<string, unknown> | undefined;
		const http = apps?.http as Record<string, unknown> | undefined;
		const servers = http?.servers as Record<string, unknown> | undefined;

		if (servers) {
			const serverKeys = Object.keys(servers);

			// If there's only one server, return its routes
			if (serverKeys.length === 1) {
				return NextResponse.json({
					server: serverKeys[0],
					config: servers[serverKeys[0]],
				});
			}
		}

		// Fallback: return the entire config if we can't extract cleanly
		return NextResponse.json(config);
	} catch (error) {
		console.error("Failed to adapt Caddyfile:", error);
		return NextResponse.json(
			{
				error: "Failed to adapt Caddyfile",
				details: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 500 },
		);
	}
}
