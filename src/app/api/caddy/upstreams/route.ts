import { NextResponse } from "next/server";
import { createCaddyAPIClient } from "@/lib/server/caddy-api-client";

const CADDY_API_URL = process.env.CADDY_API_URL || "http://localhost:2019";
const caddyAPI = createCaddyAPIClient(CADDY_API_URL);

export async function GET() {
	try {
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
