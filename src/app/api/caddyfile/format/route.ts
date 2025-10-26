import { exec } from "node:child_process";
import fs from "node:fs/promises";
import { promisify } from "node:util";
import { type NextRequest, NextResponse } from "next/server";

const execAsync = promisify(exec);

export async function POST(request: NextRequest) {
	try {
		const content = await request.text();

		// Use caddy fmt CLI command to format the Caddyfile
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
	} catch (error) {
		console.error("Failed to format Caddyfile:", error);
		return NextResponse.json(
			{ error: "Failed to format Caddyfile" },
			{ status: 500 },
		);
	}
}
