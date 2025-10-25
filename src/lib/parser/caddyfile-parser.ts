import type {
	CaddyConfig,
	CaddyDirective,
	CaddySiteBlock,
} from "@/types/caddyfile";

function generateId(): string {
	return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

export function parseCaddyfile(content: string): CaddyConfig {
	const lines = content.split("\n");
	const config: CaddyConfig = {
		siteBlocks: [],
		globalOptions: [],
	};

	let currentBlock: CaddySiteBlock | null = null;
	const blockStack: {
		directives: CaddyDirective[];
		directive?: CaddyDirective;
	}[] = [];
	let isGlobalOptions = false;

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i].trim();

		// Skip empty lines and comments
		if (!line || line.startsWith("#")) {
			continue;
		}

		// Check for global options block
		if (line === "{" && currentBlock === null && blockStack.length === 0) {
			isGlobalOptions = true;
			blockStack.push({ directives: config.globalOptions || [] });
			continue;
		}

		// Handle closing braces
		if (line === "}") {
			if (blockStack.length > 0) {
				blockStack.pop();
				if (blockStack.length === 0) {
					if (currentBlock) {
						// End of site block
						config.siteBlocks.push(currentBlock);
						currentBlock = null;
					}
					// Always reset isGlobalOptions when blockStack is empty
					isGlobalOptions = false;
				}
			}
			continue;
		}

		// Parse directive or site address
		const tokens = tokenizeLine(line);
		if (tokens.length === 0) continue;

		// Check if this is a site address (no current block and not in global options)
		if (!currentBlock && !isGlobalOptions) {
			// This is a site address line
			// Split comma-separated addresses (e.g., "example.com, www.example.com")
			const addresses = tokens
				.filter((t) => t !== "{")
				.flatMap((addr) => addr.split(","))
				.map((addr) => addr.trim())
				.filter((addr) => addr.length > 0);
			const hasOpenBrace = tokens.includes("{");

			currentBlock = {
				id: generateId(),
				addresses,
				directives: [],
			};

			if (hasOpenBrace) {
				blockStack.push({ directives: currentBlock.directives });
			} else {
				// Single-line site block (uncommon but possible)
				config.siteBlocks.push(currentBlock);
				currentBlock = null;
			}
			continue;
		}

		// Parse directive
		const directiveName = tokens[0];
		const args = tokens.slice(1).filter((t) => t !== "{");
		const hasOpenBrace = tokens.includes("{");

		// Special handling for @id directive in site blocks
		if (directiveName === "@id" && currentBlock && blockStack.length === 1) {
			// This is an @id tag at the site block level
			if (args.length > 0) {
				currentBlock.caddyId = args[0];
			}
			// Don't add @id as a regular directive
			continue;
		}

		const directive: CaddyDirective = {
			id: generateId(),
			name: directiveName,
			args,
			block: hasOpenBrace ? [] : undefined,
			raw: line,
		};

		// Add to current context
		const currentContext = blockStack[blockStack.length - 1];
		if (currentContext) {
			currentContext.directives.push(directive);
		}

		// If this directive has a block, push it onto the stack
		if (hasOpenBrace && directive.block) {
			blockStack.push({ directives: directive.block, directive });
		}
	}

	// Clean up any unclosed blocks
	if (currentBlock) {
		config.siteBlocks.push(currentBlock);
	}

	return config;
}

function tokenizeLine(line: string): string[] {
	const tokens: string[] = [];
	let current = "";
	let inQuotes = false;
	let quoteChar = "";

	for (let i = 0; i < line.length; i++) {
		const char = line[i];

		if ((char === '"' || char === "'") && (i === 0 || line[i - 1] !== "\\")) {
			if (!inQuotes) {
				inQuotes = true;
				quoteChar = char;
			} else if (char === quoteChar) {
				inQuotes = false;
				quoteChar = "";
			}
			current += char;
		} else if (char === " " && !inQuotes) {
			if (current) {
				tokens.push(current);
				current = "";
			}
		} else if (char === "#" && !inQuotes) {
			// Comment - stop parsing this line
			break;
		} else {
			current += char;
		}
	}

	if (current) {
		tokens.push(current);
	}

	return tokens;
}

export function serializeCaddyfile(config: CaddyConfig): string {
	const lines: string[] = [];

	// Serialize global options
	if (config.globalOptions && config.globalOptions.length > 0) {
		lines.push("{");
		for (const directive of config.globalOptions) {
			lines.push(...serializeDirective(directive, 1));
		}
		lines.push("}");
		lines.push("");
	}

	// Serialize site blocks
	for (const siteBlock of config.siteBlocks) {
		lines.push(...serializeSiteBlock(siteBlock));
		lines.push("");
	}

	return lines.join("\n").trim();
}

function serializeSiteBlock(siteBlock: CaddySiteBlock): string[] {
	const lines: string[] = [];

	// Site addresses
	lines.push(`${siteBlock.addresses.join(" ")} {`);

	// Add @id tag if present
	if (siteBlock.caddyId) {
		lines.push(`\t@id ${siteBlock.caddyId}`);
	}

	// Directives
	for (const directive of siteBlock.directives) {
		lines.push(...serializeDirective(directive, 1));
	}

	lines.push("}");

	return lines;
}

function serializeDirective(
	directive: CaddyDirective,
	indent: number,
): string[] {
	const lines: string[] = [];
	const indentStr = "\t".repeat(indent);

	const args = directive.args.join(" ");
	const directiveLine = `${indentStr}${directive.name}${args ? ` ${args}` : ""}`;

	if (directive.block && directive.block.length > 0) {
		lines.push(`${directiveLine} {`);
		for (const subDirective of directive.block) {
			lines.push(...serializeDirective(subDirective, indent + 1));
		}
		lines.push(`${indentStr}}`);
	} else {
		lines.push(directiveLine);
	}

	return lines;
}
