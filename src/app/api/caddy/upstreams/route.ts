import { NextResponse } from "next/server";
import { createCaddyAPIClient } from "@/lib/server/caddy-api-client";

const CADDY_API_URL = process.env.CADDY_API_URL || "http://localhost:2019";

// Force dynamic rendering to avoid caching issues during hot reloads
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
	try {
		// Create a fresh client for each request to avoid stale connections during hot reloads
		const caddyAPI = createCaddyAPIClient(CADDY_API_URL);
		const result = await caddyAPI.getUpstreams();

		if (!result.success) {
			return NextResponse.json(
				{
					error: "Failed to fetch upstreams",
					details: result.error,
				},
				{ status: 500 },
			);
		}

		return NextResponse.json(result.upstreams || []);
	} catch (error) {
		console.error("Failed to fetch upstreams:", error);
		return NextResponse.json(
			{
				error: "Failed to fetch upstreams",
				details: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 500 },
		);
	}
}
