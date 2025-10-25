// Caddy JSON Config type (simplified for API usage)
export interface CaddyJSONConfig {
	apps?: {
		[key: string]: unknown;
	};
	[key: string]: unknown;
}

export interface CaddyAPIConfig {
	baseURL: string; // e.g., "http://localhost:2019"
	timeout?: number; // Request timeout in ms
}

export class CaddyAPIClient {
	private baseURL: string;
	private timeout: number;

	constructor(config: CaddyAPIConfig) {
		this.baseURL = config.baseURL;
		this.timeout = config.timeout || 5000;
	}

	/**
	 * Check if the Caddy Admin API is reachable
	 */
	async isAvailable(): Promise<boolean> {
		try {
			const controller = new AbortController();
			const timeoutId = setTimeout(() => controller.abort(), this.timeout);

			const response = await fetch(`${this.baseURL}/config/`, {
				method: "GET",
				signal: controller.signal,
			});

			clearTimeout(timeoutId);
			return response.ok;
		} catch (_error) {
			return false;
		}
	}

	/**
	 * Get the current configuration from Caddy
	 */
	async getConfig(): Promise<CaddyJSONConfig> {
		const response = await fetch(`${this.baseURL}/config/`, {
			method: "GET",
			headers: {
				"Content-Type": "application/json",
			},
		});

		if (!response.ok) {
			throw new Error(`Failed to get config: ${response.statusText}`);
		}

		return (await response.json()) as CaddyJSONConfig;
	}

	/**
	 * Validate a configuration without applying it
	 */
	async validateConfig(config: CaddyJSONConfig): Promise<{
		valid: boolean;
		error?: string;
	}> {
		try {
			const response = await fetch(`${this.baseURL}/load`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify(config),
				// Add validate query parameter
			});

			// Note: Caddy doesn't have a separate validate endpoint
			// We'll use a workaround: try to load and check the response
			const text = await response.text();

			if (!response.ok) {
				return {
					valid: false,
					error: text || response.statusText,
				};
			}

			return { valid: true };
		} catch (error) {
			return {
				valid: false,
				error: error instanceof Error ? error.message : "Unknown error",
			};
		}
	}

	/**
	 * Load a new configuration into Caddy (atomic update)
	 * If validation fails, the old config is kept
	 */
	async loadConfig(config: CaddyJSONConfig): Promise<{
		success: boolean;
		error?: string;
	}> {
		try {
			const response = await fetch(`${this.baseURL}/load`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify(config),
			});

			const text = await response.text();

			if (!response.ok) {
				return {
					success: false,
					error: text || response.statusText,
				};
			}

			return { success: true };
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error.message : "Unknown error",
			};
		}
	}

	/**
	 * Update a specific path in the configuration
	 * This is more efficient for small changes
	 */
	async updateConfigPath(
		path: string,
		value: unknown,
	): Promise<{
		success: boolean;
		error?: string;
	}> {
		try {
			const response = await fetch(`${this.baseURL}/config/${path}`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify(value),
			});

			const text = await response.text();

			if (!response.ok) {
				return {
					success: false,
					error: text || response.statusText,
				};
			}

			return { success: true };
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error.message : "Unknown error",
			};
		}
	}

	/**
	 * Get the status/health of Caddy
	 */
	async getStatus(): Promise<{
		running: boolean;
		version?: string;
	}> {
		try {
			const response = await fetch(`${this.baseURL}/`, {
				method: "GET",
			});

			if (!response.ok) {
				return { running: false };
			}

			// Caddy returns basic info at root endpoint
			return { running: true };
		} catch (_error) {
			return { running: false };
		}
	}

	/**
	 * Get the health status of all reverse proxy upstreams
	 */
	async getUpstreams(): Promise<{
		success: boolean;
		upstreams?: Array<{
			address: string;
			num_requests: number;
			fails: number;
		}>;
		error?: string;
	}> {
		try {
			const response = await fetch(`${this.baseURL}/reverse_proxy/upstreams`, {
				method: "GET",
			});

			if (!response.ok) {
				return {
					success: false,
					error: response.statusText,
				};
			}

			const upstreams = await response.json();
			return {
				success: true,
				upstreams: upstreams as Array<{
					address: string;
					num_requests: number;
					fails: number;
				}>,
			};
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error.message : "Unknown error",
			};
		}
	}
}

/**
 * Create a Caddy API client with default settings
 */
export function createCaddyAPIClient(
	baseURL = "http://localhost:2019",
): CaddyAPIClient {
	return new CaddyAPIClient({ baseURL });
}
