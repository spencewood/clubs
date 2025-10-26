import { type NextRequest, NextResponse } from "next/server";
import { createCaddyAPIClient } from "@/lib/server/caddy-api-client";

const CADDY_API_URL = process.env.CADDY_API_URL || "http://localhost:2019";

export async function GET(
	_request: NextRequest,
	{ params }: { params: Promise<{ caId?: string[] }> },
) {
	try {
		// Create a fresh client for each request to avoid stale connections during hot reloads
		const caddyAPI = createCaddyAPIClient(CADDY_API_URL);
		const { caId } = await params;
		const id = caId?.[0] || "local";
		const result = await caddyAPI.getPKICA(id);

		if (!result.success) {
			return NextResponse.json(
				{
					error: "Failed to fetch PKI CA",
					details: result.error,
				},
				{ status: 500 },
			);
		}

		return NextResponse.json(result.ca);
	} catch (error) {
		console.error("Failed to fetch PKI CA:", error);
		return NextResponse.json(
			{
				error: "Failed to fetch PKI CA",
				details: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 500 },
		);
	}
}
