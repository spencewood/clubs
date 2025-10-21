import type { CaddyDirective, CaddySiteBlock } from "@/types/caddyfile";

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

export interface VirtualBlock {
	id: string;
	matcherName: string;
	hostname: string;
	description?: string;
	directives: CaddyDirective[];
}

export interface VirtualContainer {
	id: string;
	wildcardDomain: string;
	sharedConfig: CaddyDirective[];
	virtualBlocks: VirtualBlock[];
}

/**
 * Determines if a site block is a virtual container (wildcard with handle blocks)
 */
export function isVirtualContainer(siteBlock: CaddySiteBlock): boolean {
	// Check if any address contains a wildcard
	const hasWildcard = siteBlock.addresses.some((addr) => addr.includes("*"));
	if (!hasWildcard) return false;

	// Check if it has any @matcher declarations and handle blocks
	const hasMatchers = siteBlock.directives.some(
		(d) => d.name.startsWith("@") || (d.name === "handle" && d.args.length > 0),
	);

	return hasMatchers;
}

/**
 * Parses a virtual container site block into structured data
 */
export function parseVirtualContainer(
	siteBlock: CaddySiteBlock,
): VirtualContainer {
	const wildcardDomain = siteBlock.addresses[0]; // Assume first address is the wildcard
	const sharedConfig: CaddyDirective[] = [];
	const virtualBlocks: VirtualBlock[] = [];
	const matchers: Map<string, string> = new Map(); // matcher name -> hostname

	// First pass: collect matchers and shared config
	for (const directive of siteBlock.directives) {
		if (directive.name.startsWith("@")) {
			// Matcher definition: @name host hostname - NOT shared config
			const matcherName = directive.name.substring(1); // Remove @
			if (directive.args[0] === "host" && directive.args[1]) {
				matchers.set(matcherName, directive.args[1]);
			}
		} else if (directive.name === "handle") {
			// ALL handle blocks (with or without args) are NOT shared config
			// They define individual services or fallback behavior
		} else {
			// Everything else is shared config (tls, headers, encode, etc.)
			sharedConfig.push(directive);
		}
	}

	// Second pass: collect handle blocks
	for (const directive of siteBlock.directives) {
		if (directive.name === "handle" && directive.args.length > 0) {
			const matcherRef = directive.args[0]; // e.g., "@api"
			const matcherName = matcherRef.startsWith("@")
				? matcherRef.substring(1)
				: matcherRef;
			const hostname = matchers.get(matcherName) || "";

			virtualBlocks.push({
				id: directive.id,
				matcherName,
				hostname,
				directives: directive.block || [],
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
 * Converts a virtual container back into a CaddySiteBlock
 */
export function serializeVirtualContainer(
	container: VirtualContainer,
): CaddySiteBlock {
	const directives: CaddyDirective[] = [];

	// Add shared config first
	directives.push(...container.sharedConfig);

	// Add matchers and handle blocks
	for (const vBlock of container.virtualBlocks) {
		// Add matcher definition
		directives.push({
			id: `${vBlock.id}-matcher`,
			name: `@${vBlock.matcherName}`,
			args: ["host", vBlock.hostname],
			raw: `@${vBlock.matcherName} host ${vBlock.hostname}`,
		});

		// Add handle block
		directives.push({
			id: vBlock.id,
			name: "handle",
			args: [`@${vBlock.matcherName}`],
			block: vBlock.directives,
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
