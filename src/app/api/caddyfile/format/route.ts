import { exec } from "node:child_process";
import fs from "node:fs/promises";
import { promisify } from "node:util";
import { type NextRequest, NextResponse } from "next/server";

const execAsync = promisify(exec);
const CADDY_API_URL = process.env.CADDY_API_URL || "http://localhost:2019";

export async function POST(request: NextRequest) {
	try {
		const content = await request.text();

		// Try to use `caddy fmt` CLI command if available
		try {
			// Write content to temp file, format it, read it back
			const tmpFile = `/tmp/caddyfile-${Date.now()}`;
			await fs.writeFile(tmpFile, content, "utf-8");

			const { stderr } = await execAsync(`caddy fmt --overwrite ${tmpFile}`);

			if (stderr && !stderr.includes("Caddyfile formatted")) {
				console.warn("Caddy format warning:", stderr);
			}

			const formatted = await fs.readFile(tmpFile, "utf-8");
			await fs.unlink(tmpFile); // Clean up temp file

			return NextResponse.json({
				formatted: true,
				content: formatted,
			});
		} catch (cliError) {
			// If caddy fmt fails or is not available, validate and return original
			console.warn(
				"Caddy fmt not available, falling back to validation only:",
				cliError,
			);

			const adaptResponse = await fetch(`${CADDY_API_URL}/load`, {
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
						error: "Invalid Caddyfile",
						details: errorText || "Caddy could not parse the configuration",
					},
					{ status: 400 },
				);
			}

			// Validation passed but formatting not available - return original with warning
			return NextResponse.json({
				formatted: false,
				content: content,
				warning: "Caddy fmt not available - returning unformatted content",
			});
		}
	} catch (error) {
		console.error("Failed to format Caddyfile:", error);
		return NextResponse.json(
			{ error: "Failed to format Caddyfile" },
			{ status: 500 },
		);
	}
}
