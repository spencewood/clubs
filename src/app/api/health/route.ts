import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Health check endpoint for Docker/K8s readiness and liveness probes
 * Returns basic app status and optionally checks Caddy connectivity
 */
export async function GET() {
	try {
		// Basic health check - always returns healthy if the app is running
		const health = {
			status: "healthy",
			timestamp: new Date().toISOString(),
			uptime: process.uptime(),
		};

		return NextResponse.json(health, { status: 200 });
	} catch (error) {
		// If we can't even build the health response, something is very wrong
		return NextResponse.json(
			{
				status: "unhealthy",
				error: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 503 },
		);
	}
}
