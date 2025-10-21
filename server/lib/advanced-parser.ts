/**
 * Enhanced Caddyfile parser that recognizes common patterns
 */

export interface ServiceBlock {
	matcherName: string;
	hostname: string;
	description?: string;
	directives: string[];
}

export interface ParsedCaddyfile {
	mainAddress: string;
	globalDirectives: string[];
	services: ServiceBlock[];
}

/**
 * Parse a Caddyfile using wildcard domain with named matchers
 */
export function parseWildcardWithHandles(
	content: string,
): ParsedCaddyfile | null {
	const lines = content.split("\n");
	const services: ServiceBlock[] = [];
	const _globalDirectives: string[] = [];
	let mainAddress = "";

	// First pass: find services by looking for @matcher + handle patterns
	const matchers = new Map<string, { hostname: string; line: number }>();
	const handles = new Map<
		string,
		{ startLine: number; endLine: number; directives: string[] }
	>();

	let inSiteBlock = false;
	let depth = 0;
	let currentHandle: {
		matcherName: string;
		directives: string[];
		startLine: number;
	} | null = null;
	let handleStartDepth = 0;
	let lastComment = "";

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i];
		const trimmed = line.trim();

		if (!trimmed) continue;

		// Capture meaningful comments (not section headers)
		if (trimmed.startsWith("#") && !trimmed.includes("====")) {
			lastComment = trimmed.replace(/^#\s*/, "");
			continue;
		}

		// Site block start: *.example.com {
		if (!inSiteBlock && /^[*a-z0-9.-]+\s*\{/.test(trimmed)) {
			mainAddress = trimmed.replace(/\s*\{.*/, "");
			inSiteBlock = true;
			depth = 1;
			continue;
		}

		if (!inSiteBlock) continue;

		// Track braces
		const openBraces = (trimmed.match(/\{/g) || []).length;
		const closeBraces = (trimmed.match(/\}/g) || []).length;

		// Before updating depth, check if we're closing a handle block
		if (currentHandle && closeBraces > 0) {
			const newDepth = depth - closeBraces + openBraces;
			if (newDepth < handleStartDepth) {
				// End of handle block
				handles.set(currentHandle.matcherName, {
					startLine: currentHandle.startLine,
					endLine: i,
					directives: currentHandle.directives,
				});

				// Create service entry
				const matcher = matchers.get(currentHandle.matcherName);
				if (matcher) {
					services.push({
						matcherName: currentHandle.matcherName,
						hostname: matcher.hostname,
						description: lastComment || undefined,
						directives: currentHandle.directives,
					});
				}

				currentHandle = null;
				lastComment = "";
			}
		}

		// Update depth
		depth += openBraces - closeBraces;

		if (depth === 0) {
			inSiteBlock = false;
			break;
		}

		// Named matcher: @name host hostname
		const matcherMatch = trimmed.match(/^(@[\w-]+)\s+host\s+([\w.-]+)/);
		if (matcherMatch) {
			matchers.set(matcherMatch[1], {
				hostname: matcherMatch[2],
				line: i,
			});
			continue;
		}

		// Handle directive: handle @name {
		const handleMatch = trimmed.match(/^handle\s+(@[\w-]+)/);
		if (handleMatch) {
			currentHandle = {
				matcherName: handleMatch[1],
				directives: [],
				startLine: i,
			};
			handleStartDepth = depth;
			continue;
		}

		// Inside handle block - collect directives
		if (currentHandle && depth > handleStartDepth) {
			// Skip opening/closing braces by themselves
			if (trimmed !== "{" && trimmed !== "}") {
				currentHandle.directives.push(trimmed);
			}
		}
	}

	if (services.length > 0) {
		return {
			mainAddress,
			globalDirectives: [],
			services,
		};
	}

	return null;
}

/**
 * Get enhanced stats
 */
export function getEnhancedStats(content: string): {
	siteBlocks: number;
	directives: number;
	services?: number;
} {
	const parsed = parseWildcardWithHandles(content);

	if (parsed) {
		return {
			siteBlocks: 1,
			directives: parsed.globalDirectives.length,
			services: parsed.services.length,
		};
	}

	// Fallback to simple counting
	const lines = content.split("\n");
	let siteBlocks = 0;
	let directives = 0;
	let inBlock = false;
	let blockDepth = 0;

	for (const line of lines) {
		const trimmed = line.trim();

		if (!trimmed || trimmed.startsWith("#")) {
			continue;
		}

		if (trimmed === "{") {
			blockDepth++;
			if (blockDepth === 1) {
				inBlock = true;
			}
			continue;
		}

		if (trimmed === "}") {
			blockDepth--;
			if (blockDepth === 0) {
				inBlock = false;
			}
			continue;
		}

		if (blockDepth === 0 && !trimmed.includes("{")) {
			siteBlocks++;
		}

		if (inBlock && blockDepth > 0) {
			directives++;
		}
	}

	return {
		siteBlocks: Math.max(siteBlocks, 1),
		directives,
	};
}
