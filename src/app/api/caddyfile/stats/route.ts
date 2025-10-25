import fs from "node:fs/promises";
import { NextResponse } from "next/server";
import { getEnhancedStats } from "@/lib/server/advanced-parser";

const CADDYFILE_PATH = process.env.CADDYFILE_PATH || "./config/Caddyfile";

export async function GET() {
	try {
		const content = await fs.readFile(CADDYFILE_PATH, "utf-8");
		const stats = getEnhancedStats(content);
		return NextResponse.json(stats);
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code === "ENOENT") {
			return NextResponse.json(
				{ error: "Caddyfile not found" },
				{ status: 404 },
			);
		}

		console.error("Failed to get Caddyfile stats:", error);
		return NextResponse.json(
			{ error: "Failed to get Caddyfile stats" },
			{ status: 500 },
		);
	}
}
