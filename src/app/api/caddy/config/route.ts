import { NextResponse } from "next/server";

const CADDY_API_URL = process.env.CADDY_API_URL || "http://localhost:2019";

export async function GET() {
	try {
		const response = await fetch(`${CADDY_API_URL}/config/`);

		if (!response.ok) {
			return NextResponse.json(
				{
					error: "Failed to fetch configuration",
					details: await response.text(),
				},
				{ status: response.status },
			);
		}

		const config = await response.json();
		return NextResponse.json(config);
	} catch (error) {
		console.error("Failed to fetch Caddy config:", error);
		return NextResponse.json(
			{
				error: "Failed to fetch configuration",
				details: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 500 },
		);
	}
}
