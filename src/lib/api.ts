const API_BASE = import.meta.env.VITE_API_URL || "";

export interface CaddyAPIStatus {
	available: boolean;
	running: boolean;
	url: string;
	version?: string;
}

/**
 * Check if the Caddy Admin API is available
 */
export async function getCaddyAPIStatus(): Promise<CaddyAPIStatus> {
	try {
		const response = await fetch(`${API_BASE}/api/caddy/status`);
		if (!response.ok) {
			throw new Error(`HTTP ${response.status}`);
		}
		return await response.json();
	} catch (error) {
		console.error("Failed to check Caddy API status:", error);
		return {
			available: false,
			running: false,
			url: "unknown",
		};
	}
}

/**
 * Apply the Caddyfile configuration to Caddy via the API
 */
export async function applyCaddyfileConfig(): Promise<{
	success: boolean;
	error?: string;
}> {
	try {
		const response = await fetch(`${API_BASE}/api/caddyfile/apply`, {
			method: "POST",
		});

		const data = await response.json();

		if (!response.ok) {
			return {
				success: false,
				error: data.error || data.details || "Unknown error",
			};
		}

		return { success: true };
	} catch (error) {
		return {
			success: false,
			error: error instanceof Error ? error.message : "Network error",
		};
	}
}

/**
 * Save Caddyfile content to the backend
 */
export async function saveCaddyfile(
	content: string,
): Promise<{ success: boolean; error?: string }> {
	try {
		const response = await fetch(`${API_BASE}/api/caddyfile`, {
			method: "PUT",
			headers: {
				"Content-Type": "text/plain",
			},
			body: content,
		});

		if (!response.ok) {
			const data = await response.json();
			return {
				success: false,
				error: data.error || "Failed to save",
			};
		}

		return { success: true };
	} catch (error) {
		return {
			success: false,
			error: error instanceof Error ? error.message : "Network error",
		};
	}
}

/**
 * Load Caddyfile content from the backend
 * @param preferLive - If true, try to read from live Caddy first (when available)
 */
export async function loadCaddyfile(preferLive = false): Promise<{
	success: boolean;
	content?: string;
	error?: string;
	source?: "file" | "live";
}> {
	try {
		const url = preferLive
			? `${API_BASE}/api/caddyfile?source=live`
			: `${API_BASE}/api/caddyfile`;

		const response = await fetch(url);

		if (!response.ok) {
			const data = await response.json();
			return {
				success: false,
				error: data.error || "Failed to load",
			};
		}

		const content = await response.text();
		return {
			success: true,
			content,
			source: preferLive ? "live" : "file",
		};
	} catch (error) {
		return {
			success: false,
			error: error instanceof Error ? error.message : "Network error",
		};
	}
}

/**
 * Format Caddyfile using Caddy's built-in formatter
 */
export async function formatCaddyfile(content: string): Promise<{
	success: boolean;
	formatted?: string;
	warning?: string;
	error?: string;
}> {
	try {
		const response = await fetch(`${API_BASE}/api/caddyfile/format`, {
			method: "POST",
			headers: {
				"Content-Type": "text/plain",
			},
			body: content,
		});

		if (!response.ok) {
			const data = await response.json();
			return {
				success: false,
				error: data.error || data.details || "Failed to format",
			};
		}

		const data = await response.json();
		return {
			success: true,
			formatted: data.content,
			warning: data.formatted ? undefined : data.warning,
		};
	} catch (error) {
		return {
			success: false,
			error: error instanceof Error ? error.message : "Network error",
		};
	}
}

/**
 * Get full Caddy JSON configuration
 */
export async function getCaddyConfig(): Promise<{
	success: boolean;
	config?: unknown;
	error?: string;
}> {
	try {
		const response = await fetch(`${API_BASE}/api/caddy/config`);

		if (!response.ok) {
			const data = await response.json();
			return {
				success: false,
				error: data.error || data.details || "Failed to fetch config",
			};
		}

		const config = await response.json();
		return {
			success: true,
			config,
		};
	} catch (error) {
		return {
			success: false,
			error: error instanceof Error ? error.message : "Network error",
		};
	}
}

/**
 * Get JSON configuration for a specific @id
 */
export async function getCaddyConfigById(id: string): Promise<{
	success: boolean;
	config?: unknown;
	error?: string;
}> {
	try {
		const response = await fetch(`${API_BASE}/api/caddy/config/${id}`);

		if (!response.ok) {
			const data = await response.json();
			return {
				success: false,
				error: data.error || data.details || "Failed to fetch config",
			};
		}

		const config = await response.json();
		return {
			success: true,
			config,
		};
	} catch (error) {
		return {
			success: false,
			error: error instanceof Error ? error.message : "Network error",
		};
	}
}

/**
 * Adapt a Caddyfile snippet to JSON
 */
export async function adaptCaddyfile(content: string): Promise<{
	success: boolean;
	config?: unknown;
	error?: string;
}> {
	try {
		const response = await fetch(`${API_BASE}/api/caddy/adapt`, {
			method: "POST",
			headers: {
				"Content-Type": "text/plain",
			},
			body: content,
		});

		if (!response.ok) {
			const data = await response.json();
			return {
				success: false,
				error: data.error || data.details || "Failed to adapt config",
			};
		}

		const config = await response.json();
		return {
			success: true,
			config,
		};
	} catch (error) {
		return {
			success: false,
			error: error instanceof Error ? error.message : "Network error",
		};
	}
}

/**
 * Get reverse proxy upstream health status
 */
export async function getCaddyUpstreams(): Promise<{
	success: boolean;
	upstreams?: Array<{
		address: string;
		num_requests: number;
		fails: number;
	}>;
	error?: string;
}> {
	try {
		const response = await fetch(`${API_BASE}/api/caddy/upstreams`);

		if (!response.ok) {
			const data = await response.json();
			return {
				success: false,
				error: data.error || data.details || "Failed to fetch upstreams",
			};
		}

		const upstreams = await response.json();
		return {
			success: true,
			upstreams,
		};
	} catch (error) {
		return {
			success: false,
			error: error instanceof Error ? error.message : "Network error",
		};
	}
}

/**
 * Get PKI CA certificate information
 */
export async function getCaddyPKICA(caId = "local"): Promise<{
	success: boolean;
	ca?: {
		id: string;
		name: string;
		root_common_name: string;
		intermediate_common_name: string;
		root_certificate: string;
		intermediate_certificate: string;
	};
	error?: string;
}> {
	try {
		const response = await fetch(`${API_BASE}/api/caddy/pki/ca/${caId}`);

		if (!response.ok) {
			const data = await response.json();
			return {
				success: false,
				error: data.error || data.details || "Failed to fetch PKI CA",
			};
		}

		const ca = await response.json();
		return {
			success: true,
			ca,
		};
	} catch (error) {
		return {
			success: false,
			error: error instanceof Error ? error.message : "Network error",
		};
	}
}
