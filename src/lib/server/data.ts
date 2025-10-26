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
 */
async function checkCaddyAPI(): Promise<{
	available: boolean;
	version?: string;
}> {
	try {
		const response = await fetch(CADDY_API_URL, {
			method: "GET",
			headers: { "Content-Type": "application/json" },
			cache: "no-store",
		});

		if (response.ok) {
			const data = await response.json();
			return {
				available: true,
				version: data.version,
			};
		}
		return { available: false };
	} catch {
		return { available: false };
	}
}

/**
 * Load Caddyfile from Caddy API (Live Mode)
 */
async function loadFromCaddyAPI(): Promise<string | null> {
	try {
		const response = await fetch(`${CADDY_API_URL}/config/`, {
			method: "GET",
			headers: { Accept: "application/json" },
			cache: "no-store",
		});

		if (response.ok) {
			const config = await response.json();
			// Convert JSON config back to Caddyfile format
			// For now, we'll use the adapter endpoint
			const adaptResponse = await fetch(`${CADDY_API_URL}/adapt`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(config),
				cache: "no-store",
			});

			if (adaptResponse.ok) {
				return await adaptResponse.text();
			}
		}
		return null;
	} catch {
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
 * Fetch upstreams from Caddy API with timeout
 */
async function fetchUpstreams(): Promise<CaddyUpstream[]> {
	try {
		const caddyAPI = createCaddyAPIClient(CADDY_API_URL);

		// Add timeout to prevent hanging during SSR
		const timeoutPromise = new Promise<{ success: false }>((resolve) => {
			setTimeout(() => resolve({ success: false }), 5000); // 5 second timeout
		});

		const result = await Promise.race([
			caddyAPI.getUpstreams(),
			timeoutPromise,
		]);

		if (result.success && "upstreams" in result && result.upstreams) {
			console.log(
				`[fetchUpstreams] Successfully fetched ${result.upstreams.length} upstreams`,
			);
			return result.upstreams;
		}

		console.warn("[fetchUpstreams] Failed to fetch upstreams or timed out");
		return [];
	} catch (error) {
		console.error("[fetchUpstreams] Error fetching upstreams:", error);
		return [];
	}
}

/**
 * Fetch certificates from Caddy API with timeout
 */
async function fetchCertificates(): Promise<CaddyPKICA | null> {
	try {
		const caddyAPI = createCaddyAPIClient(CADDY_API_URL);

		// Add timeout to prevent hanging during SSR
		const timeoutPromise = new Promise<{ success: false }>((resolve) => {
			setTimeout(() => resolve({ success: false }), 5000); // 5 second timeout
		});

		const result = await Promise.race([
			caddyAPI.getPKICA("local"),
			timeoutPromise,
		]);

		if (result.success && "ca" in result && result.ca) {
			console.log("[fetchCertificates] Successfully fetched PKI CA");
			return result.ca;
		}

		console.warn("[fetchCertificates] Failed to fetch PKI CA or timed out");
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
