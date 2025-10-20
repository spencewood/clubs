const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8080";

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
 * Apply a Caddyfile configuration to Caddy via the API
 */
export async function applyCaddyfileConfig(
	filename: string,
): Promise<{ success: boolean; error?: string }> {
	try {
		const response = await fetch(
			`${API_BASE}/api/caddyfiles/${filename}/apply`,
			{
				method: "POST",
			},
		);

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
	filename: string,
	content: string,
): Promise<{ success: boolean; error?: string }> {
	try {
		const response = await fetch(`${API_BASE}/api/caddyfiles/${filename}`, {
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
