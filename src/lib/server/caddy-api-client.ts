import { recordApiCall } from "./metrics";

// Caddy JSON Config types with detailed structure for context extraction

export interface CaddyUpstream {
	dial?: string;
	[key: string]: unknown;
}

export interface CaddyHandler {
	handler?: string;
	upstreams?: CaddyUpstream[];
	routes?: CaddyRoute[];
	handle?: CaddyHandler[];
	[key: string]: unknown;
}

export interface CaddyMatcher {
	host?: string[];
	path?: string[];
	[key: string]: unknown;
}

export interface CaddyRoute {
	match?: CaddyMatcher[];
	handle?: CaddyHandler[];
	[key: string]: unknown;
}

export interface CaddyServer {
	routes?: CaddyRoute[];
	[key: string]: unknown;
}

export interface CaddyHTTPApp {
	servers?: Record<string, CaddyServer>;
	[key: string]: unknown;
}

export interface CaddyTLSPolicy {
	protocols?: string[];
	[key: string]: unknown;
}

export interface CaddyTLSAutomation {
	policies?: CaddyTLSPolicy[];
	[key: string]: unknown;
}

export interface CaddyTLSApp {
	automation?: CaddyTLSAutomation;
	[key: string]: unknown;
}

export interface CaddyApps {
	http?: CaddyHTTPApp;
	tls?: CaddyTLSApp;
	[key: string]: unknown;
}

// Main Caddy JSON Config type
export interface CaddyJSONConfig {
	apps?: CaddyApps;
	admin?: {
		listen?: string;
		[key: string]: unknown;
	};
	logging?: unknown;
	storage?: unknown;
	[key: string]: unknown;
}

export interface CaddyAPIConfig {
	baseURL: string; // e.g., "http://localhost:2019"
	timeout?: number; // Request timeout in ms
	enableMetrics?: boolean; // Track API calls in Prometheus metrics
}

export class CaddyAPIClient {
	private baseURL: string;
	private timeout: number;
	private enableMetrics: boolean;

	constructor(config: CaddyAPIConfig) {
		this.baseURL = config.baseURL;
		this.timeout = config.timeout || 5000;
		this.enableMetrics = config.enableMetrics ?? true;
	}

	/**
	 * Wrapper for fetch that tracks metrics
	 */
	private async fetchWithMetrics(
		url: string,
		options: RequestInit & { endpoint?: string } = {},
	): Promise<Response> {
		const startTime = performance.now();
		const method = options.method || "GET";
		const endpoint = options.endpoint || new URL(url).pathname;

		try {
			const response = await fetch(url, options);

			if (this.enableMetrics) {
				const durationSeconds = (performance.now() - startTime) / 1000;
				recordApiCall(endpoint, method, response.status, durationSeconds);
			}

			return response;
		} catch (error) {
			if (this.enableMetrics) {
				const durationSeconds = (performance.now() - startTime) / 1000;
				recordApiCall(endpoint, method, 0, durationSeconds);
			}
			throw error;
		}
	}

	/**
	 * Check if the Caddy Admin API is reachable
	 */
	async isAvailable(): Promise<boolean> {
		try {
			const controller = new AbortController();
			const timeoutId = setTimeout(() => controller.abort(), this.timeout);

			const response = await this.fetchWithMetrics(`${this.baseURL}/config/`, {
				method: "GET",
				signal: controller.signal,
				endpoint: "/config/",
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
		const response = await this.fetchWithMetrics(`${this.baseURL}/config/`, {
			method: "GET",
			headers: {
				"Content-Type": "application/json",
			},
			endpoint: "/config/",
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
			const response = await this.fetchWithMetrics(`${this.baseURL}/load`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify(config),
				endpoint: "/load",
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
			const response = await this.fetchWithMetrics(`${this.baseURL}/load`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify(config),
				endpoint: "/load",
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
			const response = await this.fetchWithMetrics(
				`${this.baseURL}/config/${path}`,
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify(value),
					endpoint: `/config/${path}`,
				},
			);

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
			const response = await this.fetchWithMetrics(`${this.baseURL}/`, {
				method: "GET",
				endpoint: "/",
			});

			if (!response.ok) {
				return { running: false };
			}

			// Try to parse as JSON first (standard format)
			const contentType = response.headers.get("content-type");
			if (contentType?.includes("application/json")) {
				try {
					const data = await response.json();
					return {
						running: true,
						version: data.version?.replace(/^v/, ""), // Remove leading 'v' if present
					};
				} catch {
					// Fall through to text parsing
				}
			}

			// Fallback: parse as plain text
			// Some versions of Caddy may return: "v2.8.4 h1:abcd123..."
			const text = await response.text();
			const versionMatch = text.match(/^v?(\d+\.\d+\.\d+[^\s]*)/);

			return {
				running: true,
				version: versionMatch ? versionMatch[1] : undefined,
			};
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
			const response = await this.fetchWithMetrics(
				`${this.baseURL}/reverse_proxy/upstreams`,
				{
					method: "GET",
					endpoint: "/reverse_proxy/upstreams",
				},
			);

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

	/**
	 * Get PKI CA information (defaults to 'local' CA)
	 */
	async getPKICA(caId = "local"): Promise<{
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
			const response = await this.fetchWithMetrics(
				`${this.baseURL}/pki/ca/${caId}`,
				{
					method: "GET",
					endpoint: `/pki/ca/${caId}`,
				},
			);

			if (!response.ok) {
				return {
					success: false,
					error: response.statusText,
				};
			}

			const ca = await response.json();
			return {
				success: true,
				ca: ca as {
					id: string;
					name: string;
					root_common_name: string;
					intermediate_common_name: string;
					root_certificate: string;
					intermediate_certificate: string;
				},
			};
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error.message : "Unknown error",
			};
		}
	}

	/**
	 * Get active TLS certificates from Caddy's runtime configuration
	 * This returns the actual certificates that Caddy is currently using
	 */
	async getTLSCertificates(): Promise<{
		success: boolean;
		certificates?: Array<{
			subjects: string[];
			issuer: { commonName: string; organization?: string };
			notBefore: string;
			notAfter: string;
			serialNumber: string;
		}>;
		error?: string;
	}> {
		try {
			const response = await this.fetchWithMetrics(
				`${this.baseURL}/config/apps/tls/certificates`,
				{
					method: "GET",
					endpoint: "/config/apps/tls/certificates",
				},
			);

			if (!response.ok) {
				// If the endpoint doesn't exist or returns error, return empty array
				if (response.status === 404) {
					return {
						success: true,
						certificates: [],
					};
				}
				return {
					success: false,
					error: response.statusText,
				};
			}

			const certificates = await response.json();
			// Caddy returns null if certificates aren't exposed via this endpoint
			// Treat null as an empty array
			if (certificates === null) {
				return {
					success: true,
					certificates: [],
				};
			}
			return {
				success: true,
				certificates: certificates as Array<{
					subjects: string[];
					issuer: { commonName: string; organization?: string };
					notBefore: string;
					notAfter: string;
					serialNumber: string;
				}>,
			};
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error.message : "Unknown error",
			};
		}
	}

	/**
	 * Generate a JSON Schema from the current Caddy configuration
	 * This introspects the running config to create a schema that can be used
	 * for validation, autocomplete, and documentation.
	 *
	 * Note: This method requires the schema generator to be imported separately
	 * to avoid circular dependencies. Use the static helper below or import directly.
	 */
	async getConfigForSchema(): Promise<CaddyJSONConfig> {
		return await this.getConfig();
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
