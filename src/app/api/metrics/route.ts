import { type NextRequest, NextResponse } from "next/server";
import { CaddyAPIClient } from "@/lib/server/caddy-api-client";
import {
	register,
	updateCaddyAvailability,
	updateCaddyfileStats,
	updateUpstreamMetrics,
} from "@/lib/server/metrics";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * GET /api/metrics
 * Prometheus metrics endpoint
 *
 * Collects and exposes metrics in Prometheus format:
 * - Caddy upstream health and request metrics
 * - Caddyfile configuration stats
 * - Caddy API availability
 */
export async function GET(request: NextRequest) {
	try {
		const client = new CaddyAPIClient({
			baseURL: process.env.CADDY_API_URL || "http://localhost:2019",
		});

		// Check if Caddy API is available
		const isAvailable = await client.isAvailable();
		updateCaddyAvailability(isAvailable);

		if (isAvailable) {
			// Fetch and update upstream metrics
			try {
				const result = await client.getUpstreams();
				if (result.success && result.upstreams && result.upstreams.length > 0) {
					updateUpstreamMetrics(result.upstreams);
				}
			} catch (error) {
				console.error("Failed to fetch upstream metrics:", error);
			}

			// Fetch and update Caddyfile stats
			// We'll make a request to our own stats endpoint
			try {
				const statsUrl = new URL("/api/caddyfile/stats", request.url);
				const statsResponse = await fetch(statsUrl.toString());
				if (statsResponse.ok) {
					const stats = await statsResponse.json();
					updateCaddyfileStats(stats);
				}
			} catch (error) {
				console.error("Failed to fetch Caddyfile stats:", error);
			}
		}

		// Return Prometheus metrics
		const metrics = await register.metrics();
		return new NextResponse(metrics, {
			headers: {
				"Content-Type": register.contentType,
				"Cache-Control": "no-store, no-cache, must-revalidate",
			},
		});
	} catch (error) {
		console.error("Error generating metrics:", error);

		// Even on error, return whatever metrics we have
		const metrics = await register.metrics();
		return new NextResponse(metrics, {
			status: 500,
			headers: {
				"Content-Type": register.contentType,
			},
		});
	}
}
