import type {
	CaddyConfig,
	CaddyDirective,
	CaddyUpstream,
} from "@/types/caddyfile";

export interface ConsolidatedServer {
	server: string; // hostname or IP without port
	ports: number[];
	totalRequests: number;
	totalFails: number;
	upstreams: CaddyUpstream[]; // All upstreams for this server
	isOffline?: boolean; // Configured but has no stats
}

export function parseAddress(address: string): {
	server: string;
	port: number | null;
} {
	try {
		// Handle IPv6 addresses like [::1]:8080
		const ipv6Match = address.match(/^\[([^\]]+)\]:(\d+)$/);
		if (ipv6Match) {
			return { server: ipv6Match[1], port: Number.parseInt(ipv6Match[2], 10) };
		}

		// Handle regular addresses like localhost:8080 or 192.168.1.1:8080
		const parts = address.split(":");
		if (parts.length === 2) {
			return { server: parts[0], port: Number.parseInt(parts[1], 10) };
		}

		// No port specified
		return { server: address, port: null };
	} catch {
		return { server: address, port: null };
	}
}

export function consolidateUpstreams(
	upstreams: CaddyUpstream[],
): ConsolidatedServer[] {
	const serverMap = new Map<string, ConsolidatedServer>();

	for (const upstream of upstreams) {
		const { server, port } = parseAddress(upstream.address);

		if (!serverMap.has(server)) {
			serverMap.set(server, {
				server,
				ports: [],
				totalRequests: 0,
				totalFails: 0,
				upstreams: [],
			});
		}

		const consolidated = serverMap.get(server);
		if (consolidated) {
			if (port !== null && !consolidated.ports.includes(port)) {
				consolidated.ports.push(port);
			}
			consolidated.totalRequests += upstream.num_requests;
			consolidated.totalFails += upstream.fails;
			consolidated.upstreams.push(upstream);
		}
	}

	// Sort ports for consistent display
	for (const server of serverMap.values()) {
		server.ports.sort((a, b) => a - b);
	}

	// Convert to array and sort by server name for stable ordering
	return Array.from(serverMap.values()).sort((a, b) =>
		a.server.localeCompare(b.server),
	);
}

/**
 * Recursively extract all reverse_proxy upstream addresses from directives
 */
function extractReverseProxyAddresses(directives: CaddyDirective[]): string[] {
	const addresses: string[] = [];

	for (const directive of directives) {
		if (directive.name === "reverse_proxy") {
			// reverse_proxy args are the upstream addresses
			// e.g., reverse_proxy localhost:8080
			// or reverse_proxy localhost:8080 localhost:8081
			addresses.push(...directive.args);
		}

		// Recursively check nested directives
		if (directive.block) {
			addresses.push(...extractReverseProxyAddresses(directive.block));
		}
	}

	return addresses;
}

/**
 * Extract all configured reverse_proxy upstreams from the Caddyfile
 */
export function getConfiguredUpstreams(config: CaddyConfig): string[] {
	const addresses: string[] = [];

	// Extract from site blocks
	for (const siteBlock of config.siteBlocks) {
		addresses.push(...extractReverseProxyAddresses(siteBlock.directives));
	}

	// Extract from global options (if any)
	if (config.globalOptions) {
		addresses.push(...extractReverseProxyAddresses(config.globalOptions));
	}

	// Return unique addresses
	return Array.from(new Set(addresses));
}

/**
 * Consolidate upstreams and mark offline ones
 */
export function consolidateUpstreamsWithConfig(
	upstreams: CaddyUpstream[],
	config: CaddyConfig | null,
): ConsolidatedServer[] {
	const consolidated = consolidateUpstreams(upstreams);

	// If no config provided, just return the consolidated list
	if (!config) {
		return consolidated;
	}

	// Get all configured upstream addresses
	const configuredAddresses = getConfiguredUpstreams(config);

	// Create a set of servers that have stats
	const serversWithStats = new Set(consolidated.map((s) => s.server));

	// Find configured upstreams that don't have stats (offline)
	const offlineServerMap = new Map<string, ConsolidatedServer>();
	for (const address of configuredAddresses) {
		const { server, port } = parseAddress(address);

		// If this server doesn't have stats, it's offline
		if (!serversWithStats.has(server)) {
			if (!offlineServerMap.has(server)) {
				offlineServerMap.set(server, {
					server,
					ports: [],
					totalRequests: 0,
					totalFails: 0,
					upstreams: [],
					isOffline: true,
				});
			}

			const offlineServer = offlineServerMap.get(server);
			if (
				offlineServer &&
				port !== null &&
				!offlineServer.ports.includes(port)
			) {
				offlineServer.ports.push(port);
			}
		}
	}

	// Sort ports for offline servers
	for (const server of offlineServerMap.values()) {
		server.ports.sort((a, b) => a - b);
	}

	const offlineServers = Array.from(offlineServerMap.values());

	// Combine and sort
	return [...consolidated, ...offlineServers].sort((a, b) =>
		a.server.localeCompare(b.server),
	);
}
