import type { CaddyDirective, CaddySiteBlock } from "@/types/caddyfile";

/**
 * CONTAINER ARCHITECTURE
 * ======================
 *
 * This file implements a Clubs-specific abstraction layer over Caddy's native configuration.
 * Caddy doesn't have a concept of "containers" - this is a design pattern we've created
 * to manage complex wildcard domain configurations.
 *
 * CONCEPTS:
 * ---------
 *
 * 1. **Site Blocks** (Standard Caddy)
 *    - Single domain with its own independent configuration
 *    - Example: app.example.com, api.example.com
 *    - Each block has its own TLS, headers, routing, etc.
 *
 * 2. **Containers** (Clubs Abstraction)
 *    - Wildcard domain (*.services.example.com) acting as a "partition table"
 *    - Contains shared configuration that ALL nested services inherit
 *    - Hosts multiple "services" underneath
 *    - Analogous to partition tables with nested partitions
 *
 * STRUCTURE:
 * ----------
 * ```
 * *.services.example.com {           # Container (the partition table)
 *     tls internal                   # Shared Config (inherited by all services)
 *     encode gzip                    # Shared Config
 *
 *     @api host api.services.example.com        # Service (nested partition)
 *     handle @api {                              # Service-specific config
 *         reverse_proxy localhost:3000
 *     }
 *
 *     @dashboard host dashboard.services.example.com    # Another Service
 *     handle @dashboard {
 *         reverse_proxy localhost:8080
 *     }
 *
 *     handle {                       # Fallback for unmatched hosts
 *         abort
 *     }
 * }
 * ```
 *
 * TERMINOLOGY:
 * ------------
 * - **Container**: The wildcard block that acts as a container for multiple services
 * - **Shared Config**: Top-level directives (tls, encode, headers, etc.) that all services inherit
 * - **Service**: A matcher + handle pair defining a specific service under the wildcard
 * - **Site**: A traditional, standalone Caddy site block (not a container)
 *
 * DETECTION LOGIC:
 * ----------------
 * A site block is considered a Container if:
 * 1. It has a wildcard address (*.domain.com)
 * 2. AND it has matchers (@name) with handle blocks
 * 3. OR it has 2+ handle blocks (indicating multiple services)
 *
 * WHY THIS MATTERS:
 * -----------------
 * - Containers are rendered with special UI (Container icon, different styling)
 * - Users can add/edit services within a container without duplicating shared config
 * - Provides a cleaner mental model for managing many related services
 * - Makes it easy to apply TLS, security headers, etc. to all services at once
 *
 * @see ContainerCard component for UI rendering
 * @see parseContainer for parsing logic
 * @see serializeContainer for serialization back to Caddyfile
 */

/**
 * Formats a directive for display in a human-readable way
 */
export function formatDirectiveForDisplay(directive: CaddyDirective): string {
	// For directives with blocks, show a summary
	if (directive.block && directive.block.length > 0) {
		const blockItemCount = directive.block.length;
		const args =
			directive.args.length > 0 ? ` ${directive.args.join(" ")}` : "";
		return `${directive.name}${args} { ... ${blockItemCount} item${blockItemCount !== 1 ? "s" : ""} }`;
	}

	// For simple directives, use raw if available, otherwise construct from name + args
	if (directive.raw && !directive.raw.endsWith("{")) {
		return directive.raw;
	}

	const args = directive.args.length > 0 ? ` ${directive.args.join(" ")}` : "";
	return `${directive.name}${args}`;
}

/**
 * Creates a short summary of a directive for card displays
 */
export function getDirectiveSummary(directive: CaddyDirective): string {
	// Just return the directive name with first arg if it exists
	const firstArg = directive.args.length > 0 ? ` ${directive.args[0]}` : "";
	return `${directive.name}${firstArg}`;
}

/**
 * Represents a single service within a Container
 *
 * Example Caddyfile representation:
 * ```
 * @api host api.services.example.com
 * handle @api {
 *     reverse_proxy localhost:3000
 * }
 * ```
 */
export interface VirtualBlock {
	/** Unique identifier for this service */
	id: string;
	/** Matcher name (e.g., "api" from "@api") */
	matcherName: string;
	/** Full hostname this service responds to (e.g., "api.services.example.com") */
	hostname: string;
	/** Optional description for documentation */
	description?: string;
	/** Service-specific directives inside the handle block */
	directives: CaddyDirective[];
	/** The @id tag value for Caddy API access */
	caddyId?: string;
}

/**
 * Represents a Container - a wildcard domain acting as a partition table
 * for multiple services with shared configuration
 *
 * Example Caddyfile representation:
 * ```
 * *.services.example.com {
 *     tls internal              # Shared Config
 *     encode gzip               # Shared Config
 *
 *     @api host api.services.example.com
 *     handle @api { ... }       # Service
 *
 *     @web host web.services.example.com
 *     handle @web { ... }       # Service
 * }
 * ```
 */
export interface VirtualContainer {
	/** Unique identifier for this container */
	id: string;
	/** Wildcard domain pattern (e.g., "*.services.example.com") */
	wildcardDomain: string;
	/** Top-level directives inherited by all services (tls, encode, headers, etc.) */
	sharedConfig: CaddyDirective[];
	/** Individual services within this container */
	virtualBlocks: VirtualBlock[];
}

/**
 * Determines if a site block is a container (wildcard hosting services)
 *
 * DETECTION STRATEGY:
 * A Container is any wildcard domain (*.domain.com) that uses handle blocks.
 * This simple rule catches all container patterns:
 *
 * - Populated containers with services:
 *   *.services.example.com {
 *     @api host api.services.example.com
 *     handle @api { reverse_proxy localhost:3000 }
 *   }
 *
 * - Empty containers (newly created):
 *   *.services.example.com {
 *     handle { abort }
 *   }
 *
 * - Path-based containers:
 *   *.services.example.com {
 *     handle /api/* { ... }
 *     handle { ... }
 *   }
 *
 * @param siteBlock - The Caddy site block to check
 * @returns true if this is a container, false if it's a regular site
 */
export function isVirtualContainer(siteBlock: CaddySiteBlock): boolean {
	// Rule 1: Must have a wildcard address (*.domain.com)
	const hasWildcard = siteBlock.addresses.some((addr) => addr.includes("*"));
	if (!hasWildcard) return false;

	// Rule 2: Check for handle blocks (with or without matchers/args)
	// ANY wildcard with handle blocks is considered a container
	// This includes:
	// - Containers with matchers + handles (classic pattern)
	// - Containers with multiple handles (path-based routing)
	// - Empty containers with just a fallback handle (newly created)
	const hasHandleBlocks = siteBlock.directives.some((d) => d.name === "handle");

	return hasHandleBlocks;
}

/**
 * Parses a container site block into structured data
 *
 * PARSING STRATEGY:
 * 1. Separate directives into "shared config" vs "services"
 * 2. Shared config = top-level directives that ALL services inherit (tls, encode, headers)
 * 3. Services = matcher + handle pairs defining individual services
 *
 * INPUT (Caddyfile):
 *   *.services.example.com {
 *     tls internal                          # Shared config
 *     encode gzip                           # Shared config
 *
 *     @api host api.services.example.com    # Matcher (defines hostname)
 *     handle @api {                         # Handle (service-specific directives)
 *       reverse_proxy localhost:3000
 *     }
 *   }
 *
 * OUTPUT (Container):
 *   {
 *     wildcardDomain: "*.services.example.com",
 *     sharedConfig: [tls internal, encode gzip],
 *     virtualBlocks: [{
 *       matcherName: "api",
 *       hostname: "api.services.example.com",
 *       directives: [reverse_proxy localhost:3000]
 *     }]
 *   }
 *
 * @param siteBlock - The Caddy site block to parse
 * @returns Structured Container object
 */
export function parseVirtualContainer(
	siteBlock: CaddySiteBlock,
): VirtualContainer {
	const wildcardDomain = siteBlock.addresses[0]; // First address is the wildcard pattern
	const sharedConfig: CaddyDirective[] = [];
	const virtualBlocks: VirtualBlock[] = [];
	const matchers: Map<string, string> = new Map(); // matcher name -> hostname mapping

	// PASS 1: Separate shared config from matchers and handles
	// - Matchers (@name) define hostnames for services
	// - Handles contain service-specific configuration
	// - Everything else is shared config (inherited by all services)
	for (const directive of siteBlock.directives) {
		if (directive.name.startsWith("@")) {
			// Matcher definition: @name host hostname
			// These are NOT shared config - they define individual service hostnames
			const matcherName = directive.name.substring(1); // Remove @ prefix
			if (directive.args[0] === "host" && directive.args[1]) {
				matchers.set(matcherName, directive.args[1]);
			}
		} else if (directive.name === "handle") {
			// Handle blocks contain service-specific config
			// These are NOT shared config - they're parsed in the second pass
		} else {
			// Everything else is shared config (tls, encode, headers, log, etc.)
			// These directives are inherited by ALL services
			sharedConfig.push(directive);
		}
	}

	// PASS 2: Build services from handle directives
	// Each handle @matcher pair represents one service in the container
	for (const directive of siteBlock.directives) {
		if (directive.name === "handle" && directive.args.length > 0) {
			const matcherRef = directive.args[0]; // e.g., "@api"
			const matcherName = matcherRef.startsWith("@")
				? matcherRef.substring(1)
				: matcherRef;
			const hostname = matchers.get(matcherName) || "";

			// Extract @id tag from handle block if present
			let caddyId: string | undefined;
			const directives = directive.block || [];
			const filteredDirectives: CaddyDirective[] = [];

			for (const d of directives) {
				if (d.name === "@id" && d.args.length > 0) {
					caddyId = d.args[0];
					// Don't include @id in the directives list
				} else {
					filteredDirectives.push(d);
				}
			}

			virtualBlocks.push({
				id: directive.id,
				matcherName,
				hostname,
				directives: filteredDirectives,
				caddyId,
			});
		}
	}

	return {
		id: siteBlock.id,
		wildcardDomain,
		sharedConfig,
		virtualBlocks,
	};
}

/**
 * Converts a container back into a CaddySiteBlock
 */
export function serializeVirtualContainer(
	container: VirtualContainer,
): CaddySiteBlock {
	const directives: CaddyDirective[] = [];

	// Add shared config first
	directives.push(...container.sharedConfig);

	// Add matchers and handle blocks for each service
	for (const vBlock of container.virtualBlocks) {
		// Add matcher definition
		directives.push({
			id: `${vBlock.id}-matcher`,
			name: `@${vBlock.matcherName}`,
			args: ["host", vBlock.hostname],
			raw: `@${vBlock.matcherName} host ${vBlock.hostname}`,
		});

		// Prepare handle block directives
		const handleBlockDirectives: CaddyDirective[] = [];

		// Add @id tag first if present
		if (vBlock.caddyId) {
			handleBlockDirectives.push({
				id: `${vBlock.id}-id`,
				name: "@id",
				args: [vBlock.caddyId],
				raw: `@id ${vBlock.caddyId}`,
			});
		}

		// Add the rest of the directives
		handleBlockDirectives.push(...vBlock.directives);

		// Add handle block
		directives.push({
			id: vBlock.id,
			name: "handle",
			args: [`@${vBlock.matcherName}`],
			block: handleBlockDirectives,
			raw: `handle @${vBlock.matcherName}`,
		});
	}

	// Add fallback handle if there are virtual blocks
	if (container.virtualBlocks.length > 0) {
		const hasFallback = directives.some(
			(d) => d.name === "handle" && d.args.length === 0,
		);
		if (!hasFallback) {
			directives.push({
				id: `${container.id}-fallback`,
				name: "handle",
				args: [],
				block: [
					{
						id: `${container.id}-abort`,
						name: "abort",
						args: [],
						raw: "abort",
					},
				],
				raw: "handle",
			});
		}
	}

	return {
		id: container.id,
		addresses: [container.wildcardDomain],
		directives,
	};
}
