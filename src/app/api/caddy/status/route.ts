import { NextResponse } from "next/server";
import { createCaddyAPIClient } from "@/lib/server/caddy-api-client";

const CADDY_API_URL = process.env.CADDY_API_URL || "http://localhost:2019";
const caddyAPI = createCaddyAPIClient(CADDY_API_URL);

export async function GET() {
	try {
		const isAvailable = await caddyAPI.isAvailable();
		const status = isAvailable
			? await caddyAPI.getStatus()
			: { running: false };

		return NextResponse.json({
			available: isAvailable,
			...status,
			url: CADDY_API_URL,
		});
	} catch (error) {
		console.error("Failed to check Caddy API status:", error);
		return NextResponse.json({
			available: false,
			running: false,
			url: CADDY_API_URL,
		});
	}
}
