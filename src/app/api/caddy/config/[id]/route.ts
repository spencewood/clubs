import { type NextRequest, NextResponse } from "next/server";

const CADDY_API_URL = process.env.CADDY_API_URL || "http://localhost:2019";

export async function GET(
	_request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		const { id } = await params;
		const response = await fetch(`${CADDY_API_URL}/id/${id}`);

		if (!response.ok) {
			if (response.status === 404) {
				return NextResponse.json(
					{
						error: "Configuration not found",
						details: `No configuration found with @id "${id}"`,
					},
					{ status: 404 },
				);
			}
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
		console.error("Failed to fetch Caddy config by ID:", error);
		return NextResponse.json(
			{
				error: "Failed to fetch configuration",
				details: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 500 },
		);
	}
}
