/**
 * Server-side data fetching functions
 * These are used by Server Components to fetch data directly without going through API routes
 */

import fs from "node:fs/promises";
import { parseCaddyfile } from "@/lib/parser/caddyfile-parser";
import { createCaddyAPIClient } from "@/lib/server/caddy-api-client";
import { validateCaddyfile } from "@/lib/validator/caddyfile-validator";
import type { CaddyConfig, CaddyPKICA, CaddyUpstream } from "@/types/caddyfile";

const CADDYFILE_PATH = process.env.CADDYFILE_PATH || "./config/Caddyfile";
const CADDY_API_URL = process.env.CADDY_API_URL || "http://localhost:2019";

export interface InitialPageData {
	config: CaddyConfig;
	rawContent: string;
	isLiveMode: boolean;
	caddyStatus: {
		available: boolean;
		version?: string;
	};
	upstreams: CaddyUpstream[];
	certificates: CaddyPKICA | null;
	validationErrors?: string[];
}

/**
 * Check if Caddy API is available
 * Note: When Caddy is started with a config file, the root endpoint (/) returns 404.
 * We use /config/ instead which always returns 200 if the Admin API is accessible.
 */
async function checkCaddyAPI(): Promise<{
	available: boolean;
	version?: string;
}> {
	try {
		console.log(
			`[checkCaddyAPI] Checking Caddy API at ${CADDY_API_URL}/config/`,
		);
		const response = await fetch(`${CADDY_API_URL}/config/`, {
			method: "GET",
			headers: { "Content-Type": "application/json" },
			cache: "no-store",
		});

		if (response.ok) {
			console.log("[checkCaddyAPI] ✓ Caddy API available");
			return {
				available: true,
				version: undefined, // Version info not available from /config/ endpoint
			};
		}

		console.warn(
			`[checkCaddyAPI] ✗ Caddy API returned non-OK status: ${response.status} ${response.statusText}`,
		);
		return { available: false };
	} catch (error) {
		console.error(
			`[checkCaddyAPI] ✗ Failed to connect to Caddy API: ${error instanceof Error ? error.message : "Unknown error"}`,
		);
		return { available: false };
	}
}

/**
 * Load Caddyfile from Caddy API (Live Mode)
 * NOTE: Many Caddy installations don't support text/caddyfile format and only return JSON.
 * We try to request Caddyfile format, but if we get JSON back, we return null and fall back to file.
 */
async function loadFromCaddyAPI(): Promise<string | null> {
	try {
		const response = await fetch(`${CADDY_API_URL}/config/`, {
			method: "GET",
			headers: { Accept: "text/caddyfile" },
			cache: "no-store",
		});

		if (response.ok) {
			const content = await response.text();

			// Check if the response is JSON (starts with { or [)
			const trimmed = content.trim();
			if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
				console.warn(
					"[loadFromCaddyAPI] Caddy returned JSON instead of Caddyfile format - falling back to file",
				);
				return null;
			}

			console.log(
				"[loadFromCaddyAPI] Successfully loaded Caddyfile from Caddy API",
			);
			return content;
		}

		console.warn(
			`[loadFromCaddyAPI] Failed to load from Caddy API: ${response.status} ${response.statusText}`,
		);
		return null;
	} catch (error) {
		console.error(
			`[loadFromCaddyAPI] Error loading from Caddy API: ${error instanceof Error ? error.message : "Unknown error"}`,
		);
		return null;
	}
}

/**
 * Load Caddyfile from filesystem (File Mode)
 */
async function loadFromFile(): Promise<string | null> {
	try {
		const content = await fs.readFile(CADDYFILE_PATH, "utf-8");
		return content;
	} catch {
		return null;
	}
}

/**
 * Fetch upstreams from Caddy API
 */
async function fetchUpstreams(): Promise<CaddyUpstream[]> {
	try {
		const caddyAPI = createCaddyAPIClient(CADDY_API_URL);
		const result = await caddyAPI.getUpstreams();

		if (result.success && result.upstreams) {
			console.log(
				`[fetchUpstreams] Successfully fetched ${result.upstreams.length} upstreams`,
			);
			return result.upstreams;
		}

		console.warn("[fetchUpstreams] Failed to fetch upstreams from Caddy API");
		return [];
	} catch (error) {
		console.error("[fetchUpstreams] Error fetching upstreams:", error);
		return [];
	}
}

/**
 * Fetch certificates from Caddy API
 */
async function fetchCertificates(): Promise<CaddyPKICA | null> {
	try {
		const caddyAPI = createCaddyAPIClient(CADDY_API_URL);
		const result = await caddyAPI.getPKICA("local");

		if (result.success && result.ca) {
			console.log("[fetchCertificates] Successfully fetched PKI CA");
			return result.ca;
		}

		console.warn("[fetchCertificates] Failed to fetch PKI CA from Caddy API");
		return null;
	} catch (error) {
		console.error("[fetchCertificates] Error fetching certificates:", error);
		return null;
	}
}

/**
 * Get initial page data for Server Component rendering
 * This eliminates the loading screen by fetching all data on the server
 */
export async function getInitialPageData(): Promise<InitialPageData> {
	// Check if Caddy API is available
	const caddyStatus = await checkCaddyAPI();
	// In development with MSW, always try to fetch even if API check fails
	// MSW will mock the responses
	const isLiveMode =
		caddyStatus.available || process.env.NODE_ENV === "development";

	// Override caddyStatus.available to match isLiveMode in development
	// This ensures the UI shows "Live Mode" when using MSW mocks
	const effectiveCaddyStatus =
		process.env.NODE_ENV === "development"
			? { ...caddyStatus, available: isLiveMode }
			: caddyStatus;

	// Fetch upstreams and certificates in parallel (only if Caddy is available or in dev mode)
	const [upstreams, certificates] = isLiveMode
		? await Promise.all([fetchUpstreams(), fetchCertificates()])
		: [[], null];

	// Try to load from appropriate source
	let rawContent: string | null = null;

	if (isLiveMode) {
		rawContent = await loadFromCaddyAPI();
	}

	// Fallback to file if live mode failed or not available
	if (!rawContent) {
		rawContent = await loadFromFile();
	}

	// If still no content, start with empty config
	if (!rawContent) {
		return {
			config: { siteBlocks: [], globalOptions: [] },
			rawContent: "",
			isLiveMode,
			caddyStatus: effectiveCaddyStatus,
			upstreams,
			certificates,
		};
	}

	// Validate and parse
	const validation = validateCaddyfile(rawContent);
	const config = parseCaddyfile(rawContent);

	return {
		config,
		rawContent,
		isLiveMode,
		caddyStatus: effectiveCaddyStatus,
		upstreams,
		certificates,
		validationErrors: validation.valid ? undefined : validation.errors,
	};
}
