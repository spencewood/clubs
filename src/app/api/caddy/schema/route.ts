import { NextResponse } from "next/server";
import { createCaddyAPIClient } from "@/lib/server/caddy-api-client";
import {
	generateBaseSchema,
	generateComprehensiveSchema,
} from "@/lib/server/caddy-schema-generator";

const CADDY_API_URL = process.env.CADDY_API_URL || "http://localhost:2019";

/**
 * GET /api/caddy/schema
 *
 * Generates a JSON Schema for the Caddy configuration by introspecting
 * the current running Caddy instance. This schema can be used for:
 * - IDE autocomplete/intellisense
 * - Configuration validation
 * - Documentation generation
 *
 * Query parameters:
 * - mode: "comprehensive" (default) | "base"
 *   - comprehensive: Generates schema from actual running config (requires Caddy)
 *   - base: Returns minimal base schema (works without Caddy)
 */
export async function GET(request: Request) {
	try {
		const { searchParams } = new URL(request.url);
		const mode = searchParams.get("mode") || "comprehensive";

		// If base mode requested, return base schema immediately
		if (mode === "base") {
			const baseSchema = generateBaseSchema();
			return NextResponse.json({
				success: true,
				schema: baseSchema,
				mode: "base",
			});
		}

		// Comprehensive mode: introspect running Caddy
		const caddyAPI = createCaddyAPIClient(CADDY_API_URL);
		const isAvailable = await caddyAPI.isAvailable();

		if (!isAvailable) {
			// Fallback to base schema if Caddy is not available
			const baseSchema = generateBaseSchema();
			return NextResponse.json({
				success: true,
				schema: baseSchema,
				mode: "base",
				warning: "Caddy API not available, returning base schema",
			});
		}

		// Fetch current config and generate comprehensive schema
		const config = await caddyAPI.getConfig();
		const schema = generateComprehensiveSchema(config);

		return NextResponse.json({
			success: true,
			schema,
			mode: "comprehensive",
		});
	} catch (error) {
		console.error("Failed to generate Caddy schema:", error);

		// On error, return base schema as fallback
		const baseSchema = generateBaseSchema();
		return NextResponse.json(
			{
				success: false,
				schema: baseSchema,
				mode: "base",
				error: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 500 },
		);
	}
}
