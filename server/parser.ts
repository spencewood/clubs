export interface CaddyfileStats {
	siteBlocks: number;
	directives: number;
}

/**
 * Quick parser to extract basic stats from a Caddyfile
 */
export function getCaddyfileStats(content: string): CaddyfileStats {
	const lines = content.split("\n");
	let siteBlocks = 0;
	let directives = 0;
	let inBlock = false;
	let blockDepth = 0;

	for (const line of lines) {
		const trimmed = line.trim();

		// Skip empty lines and comments
		if (!trimmed || trimmed.startsWith("#")) {
			continue;
		}

		// Count opening braces
		if (trimmed === "{") {
			blockDepth++;
			if (blockDepth === 1) {
				inBlock = true;
			}
			continue;
		}

		// Count closing braces
		if (trimmed === "}") {
			blockDepth--;
			if (blockDepth === 0) {
				inBlock = false;
			}
			continue;
		}

		// If we're at depth 0 and see a non-brace line, it's likely a site address
		if (blockDepth === 0 && !trimmed.includes("{")) {
			siteBlocks++;
		}

		// Count directives (lines that look like directives inside blocks)
		if (inBlock && blockDepth > 0) {
			// Simple heuristic: if it's not a brace and we're in a block, it's likely a directive
			directives++;
		}
	}

	return {
		siteBlocks: Math.max(siteBlocks, 1), // At least 1 site block
		directives,
	};
}
