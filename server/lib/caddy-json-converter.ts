import type {
	CaddyConfig,
	CaddyDirective,
	SiteBlock,
} from "../types/caddyfile.js";

// Caddy JSON API types
export interface CaddyJSONConfig {
	apps: {
		http: {
			servers: {
				[key: string]: {
					listen: string[];
					routes: CaddyRoute[];
					automatic_https?: {
						disable?: boolean;
						disable_redirects?: boolean;
					};
				};
			};
		};
		tls?: {
			certificates?: {
				automate?: string[];
			};
		};
	};
}

export interface CaddyRoute {
	match?: Array<{
		host?: string[];
		path?: string[];
	}>;
	handle: CaddyHandler[];
	terminal?: boolean;
}

export interface CaddyHandler {
	handler: string;
	[key: string]: unknown;
}

/**
 * Convert our internal CaddyConfig to Caddy's JSON API format
 */
export function caddyfileToJSON(config: CaddyConfig): CaddyJSONConfig {
	const routes: CaddyRoute[] = [];

	for (const siteBlock of config.siteBlocks) {
		const route = siteBlockToRoute(siteBlock);
		routes.push(route);
	}

	const jsonConfig: CaddyJSONConfig = {
		apps: {
			http: {
				servers: {
					clubs: {
						listen: [":443", ":80"],
						routes,
					},
				},
			},
		},
	};

	return jsonConfig;
}

/**
 * Convert a single site block to a Caddy route
 */
function siteBlockToRoute(siteBlock: SiteBlock): CaddyRoute {
	// Separate domain addresses from port addresses
	const hosts = siteBlock.addresses.filter(
		(addr) => !addr.startsWith(":") && addr !== "localhost",
	);
	const ports = siteBlock.addresses.filter((addr) => addr.startsWith(":"));

	const route: CaddyRoute = {
		handle: [],
	};

	// Add host matcher if we have domain addresses
	if (hosts.length > 0) {
		route.match = [{ host: hosts }];
	} else if (ports.length > 0) {
		// If only ports, we might want to adjust the listen directive
		// For now, match all hosts
		route.match = [];
	}

	// Convert directives to handlers
	for (const directive of siteBlock.directives) {
		const handler = directiveToHandler(directive);
		if (handler) {
			route.handle.push(handler);
		}
	}

	return route;
}

/**
 * Convert a Caddyfile directive to a Caddy JSON handler
 */
function directiveToHandler(directive: CaddyDirective): CaddyHandler | null {
	switch (directive.name) {
		case "reverse_proxy": {
			const backend = directive.args[directive.args.length - 1];
			const path = directive.args.length > 1 ? directive.args[0] : undefined;

			const handler: CaddyHandler = {
				handler: "reverse_proxy",
				upstreams: [{ dial: backend }],
			};

			// Add path matcher if specified
			if (path) {
				handler.rewrite = { uri: path };
			}

			return handler;
		}

		case "file_server": {
			const handler: CaddyHandler = {
				handler: "file_server",
			};

			// Check for browse argument
			if (directive.args.includes("browse")) {
				handler.browse = {};
			}

			// Check for root in block directives
			if (directive.block) {
				for (const blockDir of directive.block) {
					if (blockDir.name === "root") {
						handler.root = blockDir.args[0];
					}
				}
			}

			return handler;
		}

		case "respond": {
			const body = directive.args.join(" ");
			return {
				handler: "static_response",
				body,
			};
		}

		case "encode": {
			const encodings = directive.args.length > 0 ? directive.args : ["gzip"];
			return {
				handler: "encode",
				encodings,
			};
		}

		case "header": {
			if (directive.block) {
				const headers: Record<string, string[]> = {};
				for (const blockDir of directive.block) {
					// Block directives have name as the header key and args as the value
					const key = blockDir.name;
					const value = blockDir.args.join(" ");
					headers[key] = [value];
				}
				return {
					handler: "headers",
					response: {
						set: headers,
					},
				};
			}
			return null;
		}

		case "redir": {
			const to = directive.args[0];
			const code = directive.args[1]
				? Number.parseInt(directive.args[1], 10)
				: 302;
			return {
				handler: "static_response",
				status_code: code,
				headers: {
					Location: [to],
				},
			};
		}

		case "root": {
			// Root is typically used with file_server, handle separately
			return null;
		}

		case "tls": {
			// TLS is handled at the server level, not as a handler
			return null;
		}

		case "log": {
			// Logging configuration - skip for now
			return null;
		}

		default: {
			// For unknown directives, create a generic handler
			// This won't work in practice but prevents data loss
			console.warn(`Unknown directive: ${directive.name}`);
			return null;
		}
	}
}

/**
 * Convert Caddy JSON config back to our internal format
 * This is used when reading from the API
 */
export function jsonToCaddyfile(json: CaddyJSONConfig): CaddyConfig {
	const siteBlocks: SiteBlock[] = [];

	// Extract routes from the first server
	const servers = Object.values(json.apps.http.servers);
	if (servers.length === 0) {
		return { siteBlocks: [] };
	}

	const server = servers[0];

	for (const route of server.routes || []) {
		const siteBlock = routeToSiteBlock(route);
		if (siteBlock) {
			siteBlocks.push(siteBlock);
		}
	}

	return { siteBlocks };
}

/**
 * Convert a Caddy route back to a site block
 */
function routeToSiteBlock(route: CaddyRoute): SiteBlock | null {
	// Extract addresses from matchers
	const addresses: string[] = [];

	if (route.match && route.match.length > 0) {
		for (const matcher of route.match) {
			if (matcher.host) {
				addresses.push(...matcher.host);
			}
		}
	}

	// If no addresses found, use a default
	if (addresses.length === 0) {
		addresses.push("localhost");
	}

	// Convert handlers to directives
	const directives: CaddyDirective[] = [];

	for (const handler of route.handle) {
		const directive = handlerToDirective(handler);
		if (directive) {
			directives.push(directive);
		}
	}

	return {
		id: crypto.randomUUID(),
		addresses,
		directives,
	};
}

/**
 * Convert a Caddy JSON handler back to a directive
 */
function handlerToDirective(handler: CaddyHandler): CaddyDirective | null {
	switch (handler.handler) {
		case "reverse_proxy": {
			const upstreams = handler.upstreams as
				| Array<{ dial: string }>
				| undefined;
			if (!upstreams || upstreams.length === 0) {
				return null;
			}

			const backend = upstreams[0].dial;
			return {
				id: crypto.randomUUID(),
				name: "reverse_proxy",
				args: [backend],
			};
		}

		case "file_server": {
			const args: string[] = [];
			if (handler.browse) {
				args.push("browse");
			}

			const directive: CaddyDirective = {
				id: crypto.randomUUID(),
				name: "file_server",
				args,
			};

			if (handler.root) {
				directive.block = [
					{
						id: crypto.randomUUID(),
						name: "root",
						args: [handler.root as string],
					},
				];
			}

			return directive;
		}

		case "static_response": {
			const body = handler.body as string | undefined;
			if (body) {
				return {
					id: crypto.randomUUID(),
					name: "respond",
					args: [body],
				};
			}

			// Check if it's a redirect
			const statusCode = handler.status_code as number | undefined;
			const headers = handler.headers as Record<string, string[]> | undefined;
			if (headers?.Location) {
				return {
					id: crypto.randomUUID(),
					name: "redir",
					args: [headers.Location[0], statusCode?.toString() || "302"],
				};
			}

			return null;
		}

		case "encode": {
			const encodings = (handler.encodings as string[]) || ["gzip"];
			return {
				id: crypto.randomUUID(),
				name: "encode",
				args: encodings,
			};
		}

		case "headers": {
			const response = handler.response as
				| { set?: Record<string, string[]> }
				| undefined;
			if (response?.set) {
				const block: CaddyDirective[] = [];
				for (const [key, values] of Object.entries(response.set)) {
					block.push({
						id: crypto.randomUUID(),
						name: key,
						args: values,
					});
				}

				return {
					id: crypto.randomUUID(),
					name: "header",
					args: [],
					block,
				};
			}

			return null;
		}

		default: {
			console.warn(`Unknown handler: ${handler.handler}`);
			return null;
		}
	}
}
