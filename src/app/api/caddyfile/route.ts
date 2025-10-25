import fs from "node:fs/promises";
import { type NextRequest, NextResponse } from "next/server";

const CADDYFILE_PATH = process.env.CADDYFILE_PATH || "./config/Caddyfile";
const CADDY_API_URL = process.env.CADDY_API_URL || "http://localhost:2019";

export async function GET(_request: NextRequest) {
	try {
		// Future: support source query parameter for live/file selection
		// const searchParams = request.nextUrl.searchParams;
		// const source = searchParams.get("source");

		// Always read from file - Caddy's Admin API returns JSON, not Caddyfile format
		const content = await fs.readFile(CADDYFILE_PATH, "utf-8");
		return new NextResponse(content, {
			headers: { "Content-Type": "text/plain" },
		});
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code === "ENOENT") {
			// If file doesn't exist, try to read from live Caddy
			try {
				const response = await fetch(`${CADDY_API_URL}/config/`, {
					headers: {
						Accept: "text/caddyfile",
					},
				});

				if (response.ok) {
					const content = await response.text();
					return new NextResponse(content, {
						headers: { "Content-Type": "text/plain" },
					});
				}
			} catch (liveError) {
				console.error("Failed to read from live Caddy:", liveError);
			}

			return NextResponse.json(
				{ error: "Caddyfile not found" },
				{ status: 404 },
			);
		}

		console.error("Failed to read Caddyfile:", error);
		return NextResponse.json(
			{ error: "Failed to read Caddyfile" },
			{ status: 500 },
		);
	}
}

export async function PUT(request: NextRequest) {
	try {
		const content = await request.text();
		await fs.writeFile(CADDYFILE_PATH, content, "utf-8");
		return NextResponse.json({ message: "Caddyfile saved successfully" });
	} catch (error) {
		console.error("Failed to save Caddyfile:", error);
		return NextResponse.json(
			{ error: "Failed to save Caddyfile" },
			{ status: 500 },
		);
	}
}
