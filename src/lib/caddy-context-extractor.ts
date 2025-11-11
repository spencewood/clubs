import type { CaddyHandler, CaddyJSONConfig } from "./server/caddy-api-client";

/**
 * Context extracted from a live Caddy configuration
 * This provides intelligent autocomplete suggestions
 */
export interface CaddyContext {
	// Available upstream addresses
	upstreams: string[];
	// Server IDs
	servers: string[];
	// Handler types used in the config
	handlers: string[];
	// Common matchers (like @api, @websocket)
	matchers: string[];
	// Protocols in use
	protocols: string[];
	// Common paths
	paths: string[];
	// Hostnames/domains
	hosts: string[];
}

/**
 * Extract useful context from a Caddy JSON configuration
 * This analyzes the config to find patterns that can be used for autocomplete
 */
export function extractCaddyContext(config: CaddyJSONConfig): CaddyContext {
	const context: CaddyContext = {
		upstreams: [],
		servers: [],
		handlers: [],
		matchers: [],
		protocols: [],
		paths: [],
		hosts: [],
	};

	// Extract from HTTP app
	if (config.apps?.http) {
		const httpApp = config.apps.http;

		// Extract server names
		if (httpApp.servers) {
			context.servers = Object.keys(httpApp.servers);

			// Process each server
			for (const [_serverName, serverConfig] of Object.entries(
				httpApp.servers,
			)) {
				const server = serverConfig;

				// Extract routes
				if (Array.isArray(server.routes)) {
					for (const route of server.routes) {
						// Extract matchers
						if (Array.isArray(route.match)) {
							for (const matcher of route.match) {
								// Extract hosts
								if (Array.isArray(matcher.host)) {
									context.hosts.push(...matcher.host);
								}
								// Extract paths
								if (Array.isArray(matcher.path)) {
									context.paths.push(...matcher.path);
								}
							}
						}

						// Extract handlers and upstreams
						if (Array.isArray(route.handle)) {
							extractHandlers(route.handle, context);
						}
					}
				}
			}
		}
	}

	// Extract from TLS app
	if (config.apps?.tls) {
		const tlsApp = config.apps.tls;

		// Extract protocols
		if (tlsApp.automation?.policies) {
			for (const policy of tlsApp.automation.policies) {
				if (Array.isArray(policy.protocols)) {
					context.protocols.push(...policy.protocols);
				}
			}
		}
	}

	// Deduplicate and sort
	context.upstreams = [...new Set(context.upstreams)].sort();
	context.servers = [...new Set(context.servers)].sort();
	context.handlers = [...new Set(context.handlers)].sort();
	context.matchers = [...new Set(context.matchers)].sort();
	context.protocols = [...new Set(context.protocols)].sort();
	context.paths = [...new Set(context.paths)].sort();
	context.hosts = [...new Set(context.hosts)].sort();

	return context;
}

/**
 * Recursively extract handlers and upstreams from handler chain
 */
function extractHandlers(handlers: CaddyHandler[], context: CaddyContext) {
	for (const handler of handlers) {
		// Extract handler type
		if (handler.handler) {
			context.handlers.push(handler.handler);
		}

		// Extract upstreams from reverse_proxy
		if (
			handler.handler === "reverse_proxy" &&
			Array.isArray(handler.upstreams)
		) {
			for (const upstream of handler.upstreams) {
				if (upstream.dial) {
					context.upstreams.push(upstream.dial);
				}
			}
		}

		// Extract nested handlers (subroutes)
		if (Array.isArray(handler.routes)) {
			for (const route of handler.routes) {
				if (Array.isArray(route.handle)) {
					extractHandlers(route.handle, context);
				}
			}
		}

		// Extract from handle blocks
		if (Array.isArray(handler.handle)) {
			extractHandlers(handler.handle, context);
		}
	}
}

/**
 * Common Caddy directive documentation
 */
export const DIRECTIVE_DOCS: Record<
	string,
	{ description: string; example?: string; params?: string }
> = {
	reverse_proxy: {
		description:
			"A powerful and extensible reverse proxy. Capable of load balancing, health checks, and more.",
		example: "reverse_proxy localhost:8080",
		params: "[<upstreams...>]",
	},
	file_server: {
		description:
			"Serves static files from disk. By default, serves files from the current directory.",
		example: "file_server browse",
		params: "[browse] [<root>]",
	},
	root: {
		description:
			"Sets the root path for the file server. All file paths are resolved relative to this.",
		example: "root * /var/www/html",
		params: "[<matcher>] <path>",
	},
	encode: {
		description:
			"Enables response encoding (compression). Supports gzip, zstd, and more.",
		example: "encode gzip zstd",
		params: "<encodings...>",
	},
	tls: {
		description:
			"Configures TLS/HTTPS for the site. Can customize certificates, protocols, ciphers, etc.",
		example: "tls internal",
		params: "[internal|<cert> <key>]",
	},
	handle: {
		description:
			"Evaluates directives mutually exclusively. Once a handle matches, no other handles are evaluated.",
		example: "handle /api/* { ... }",
		params: "[<matcher>]",
	},
	handle_path: {
		description:
			"Like handle, but strips the matched path prefix before handling.",
		example: "handle_path /api/* { ... }",
		params: "<matcher>",
	},
	route: {
		description:
			"Evaluates directives in order, allowing complex routing logic.",
		example: "route { ... }",
		params: "[<matcher>]",
	},
	redir: {
		description: "Issues an HTTP redirect to the client.",
		example: "redir https://example.com{uri} permanent",
		params: "[<matcher>] <to> [<code>]",
	},
	rewrite: {
		description: "Rewrites the request URI internally without a redirect.",
		example: "rewrite * /index.html",
		params: "[<matcher>] <to>",
	},
	uri: {
		description: "Manipulates a request's URI (path, query, etc).",
		example: "uri strip_prefix /api",
		params: "<directive> [<args>]",
	},
	try_files: {
		description:
			"Tries files in sequence and rewrites to the first one that exists.",
		example: "try_files {path} {path}/ /index.html",
		params: "<files...>",
	},
	header: {
		description: "Manipulates response headers.",
		example: "header X-Custom-Header value",
		params: "[<matcher>] <field> <value>",
	},
	header_up: {
		description:
			"Sets request headers going to the upstream (used inside reverse_proxy).",
		example: "header_up X-Real-IP {remote_host}",
		params: "<field> <value>",
	},
	header_down: {
		description:
			"Sets response headers coming from the upstream (used inside reverse_proxy).",
		example: "header_down -Server",
		params: "<field> <value>",
	},
	respond: {
		description: "Writes a hard-coded response to the client.",
		example: 'respond "Hello, world!" 200',
		params: "[<matcher>] <body> [<code>]",
	},
	log: {
		description: "Enables and configures access logging.",
		example: "log { output file /var/log/caddy/access.log }",
		params: "",
	},
	php_fastcgi: {
		description: "Proxies to a PHP FastCGI server. Commonly used with php-fpm.",
		example: "php_fastcgi localhost:9000",
		params: "<php-fpm-address>",
	},
	basicauth: {
		description: "Enables HTTP Basic Authentication.",
		example: "basicauth { user $2a$14$... }",
		params: "",
	},
	import: {
		description: "Imports a snippet or file.",
		example: "import common_config",
		params: "<name>",
	},
	lb_policy: {
		description:
			"Load balancing policy (used inside reverse_proxy). Options: random, least_conn, round_robin, first, ip_hash, uri_hash, header, cookie.",
		example: "lb_policy least_conn",
		params: "<policy>",
	},
	health_uri: {
		description: "URI to use for health checks (used inside reverse_proxy).",
		example: "health_uri /health",
		params: "<uri>",
	},
	health_interval: {
		description: "Interval between health checks (used inside reverse_proxy).",
		example: "health_interval 30s",
		params: "<duration>",
	},
	transport: {
		description:
			"Configures the transport to the upstream (used inside reverse_proxy).",
		example: "transport http { tls }",
		params: "<protocol> { ... }",
	},
};

/**
 * Get completion options for load balancing policies
 */
export const LB_POLICIES = [
	{ label: "random", detail: "Random selection" },
	{ label: "least_conn", detail: "Fewest active connections" },
	{ label: "round_robin", detail: "Round-robin rotation" },
	{ label: "first", detail: "Always use first available" },
	{ label: "ip_hash", detail: "Hash client IP" },
	{ label: "uri_hash", detail: "Hash request URI" },
	{ label: "header", detail: "Hash request header" },
	{ label: "cookie", detail: "Hash cookie value" },
];

/**
 * Get completion options for TLS protocols
 */
export const TLS_PROTOCOLS = [
	{ label: "tls1.2", detail: "TLS 1.2" },
	{ label: "tls1.3", detail: "TLS 1.3" },
];

/**
 * Get completion options for encoding algorithms
 */
export const ENCODINGS = [
	{ label: "gzip", detail: "GZIP compression" },
	{ label: "zstd", detail: "Zstandard compression" },
];

/**
 * Get completion options for common HTTP status codes
 */
export const HTTP_STATUS_CODES = [
	{ label: "200", detail: "OK" },
	{ label: "201", detail: "Created" },
	{ label: "204", detail: "No Content" },
	{ label: "301", detail: "Moved Permanently" },
	{ label: "302", detail: "Found" },
	{ label: "304", detail: "Not Modified" },
	{ label: "307", detail: "Temporary Redirect" },
	{ label: "308", detail: "Permanent Redirect" },
	{ label: "400", detail: "Bad Request" },
	{ label: "401", detail: "Unauthorized" },
	{ label: "403", detail: "Forbidden" },
	{ label: "404", detail: "Not Found" },
	{ label: "500", detail: "Internal Server Error" },
	{ label: "502", detail: "Bad Gateway" },
	{ label: "503", detail: "Service Unavailable" },
];
