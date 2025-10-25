import fs from "node:fs/promises";
import { NextResponse } from "next/server";
import { validateCaddyfile } from "@/lib/server/validator";

const CADDYFILE_PATH = process.env.CADDYFILE_PATH || "./config/Caddyfile";
const CADDY_API_URL = process.env.CADDY_API_URL || "http://localhost:2019";

export async function POST() {
	try {
		const content = await fs.readFile(CADDYFILE_PATH, "utf-8");

		// Validate the Caddyfile first
		const validation = validateCaddyfile(content);
		if (!validation.valid) {
			return NextResponse.json(
				{
					error: "Invalid Caddyfile",
					details: validation.errors.join(", "),
				},
				{ status: 400 },
			);
		}

		// First, convert Caddyfile to JSON using Caddy's adapter API
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
					error: "Failed to apply configuration",
					details: errorText || "Caddy rejected the configuration",
				},
				{ status: 500 },
			);
		}

		return NextResponse.json({ message: "Configuration applied successfully" });
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code === "ENOENT") {
			return NextResponse.json(
				{ error: "Caddyfile not found" },
				{ status: 404 },
			);
		}

		console.error("Failed to apply Caddyfile:", error);
		return NextResponse.json(
			{
				error: "Failed to apply Caddyfile",
				details: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 500 },
		);
	}
}
