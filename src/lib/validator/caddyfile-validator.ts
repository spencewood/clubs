export interface ValidationResult {
	valid: boolean;
	confidence: number; // 0-100
	warnings: string[];
	errors: string[];
}

/**
 * Validates if content appears to be a valid Caddyfile
 * Uses heuristics to determine if the file is likely a Caddyfile
 */
export function validateCaddyfile(content: string): ValidationResult {
	const result: ValidationResult = {
		valid: false,
		confidence: 0,
		warnings: [],
		errors: [],
	};

	if (!content || content.trim().length === 0) {
		result.errors.push("File is empty");
		return result;
	}

	const lines = content.split("\n");
	let score = 0;

	// Check for HTML/XML (common false positive)
	if (content.includes("<!DOCTYPE") || content.includes("<html")) {
		result.errors.push("File appears to be HTML, not a Caddyfile");
		return result;
	}

	// Check for JSON (another common false positive)
	// Only flag as JSON if it ONLY contains JSON (not a Caddyfile that happens to have braces)
	const trimmed = content.trim();
	if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
		try {
			JSON.parse(content);
			// Successfully parsed as JSON - likely Caddy's JSON config, not a Caddyfile
			result.errors.push("File appears to be JSON, not a Caddyfile");
			return result;
		} catch {
			// Not valid JSON, continue checking
		}
	}

	// Check for common Caddyfile directives
	const commonDirectives = [
		"root",
		"file_server",
		"reverse_proxy",
		"handle",
		"route",
		"encode",
		"log",
		"tls",
		"respond",
		"redir",
		"rewrite",
		"header",
		"basicauth",
		"request_header",
		"uri",
		"try_files",
		"php_fastcgi",
		"templates",
		"import",
		"vars",
		"bind",
		"acme_server",
	];

	const directivePattern = new RegExp(
		`^\\s*(${commonDirectives.join("|")})\\b`,
		"i",
	);

	for (const line of lines) {
		const trimmedLine = line.trim();

		// Skip empty lines and comments
		if (!trimmedLine || trimmedLine.startsWith("#")) {
			continue;
		}

		// Check for common directives
		if (directivePattern.test(trimmedLine)) {
			score += 15;
		}

		// Check for site addresses (domain names or ports)
		if (
			/^[a-z0-9.-]+\.[a-z]{2,}(\s|{|$)/i.test(trimmedLine) ||
			/^:[0-9]{1,5}(\s|{|$)/.test(trimmedLine) ||
			/^localhost(:[0-9]+)?(\s|{|$)/.test(trimmedLine)
		) {
			score += 10;
		}

		// Check for block structure
		if (trimmedLine === "{" || trimmedLine === "}") {
			score += 5;
		}

		// Penalize if we see things that shouldn't be in a Caddyfile
		if (trimmedLine.includes("<?php") || trimmedLine.includes("<?=")) {
			result.errors.push("File appears to contain PHP code");
			return result;
		}

		if (
			trimmedLine.includes("function(") ||
			trimmedLine.includes("const ") ||
			trimmedLine.includes("let ") ||
			trimmedLine.includes("var ")
		) {
			result.warnings.push("File may contain JavaScript code");
			score -= 20;
		}
	}

	// Calculate confidence
	result.confidence = Math.min(100, Math.max(0, score));

	// Determine if valid based on confidence
	// Simplified: either valid or not, no "low confidence" middle ground
	if (result.confidence >= 30) {
		result.valid = true;
	} else {
		result.valid = false;
		result.errors.push("File does not appear to be a valid Caddyfile");
	}

	return result;
}
