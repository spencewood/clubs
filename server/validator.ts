export interface ValidationResult {
	valid: boolean;
	confidence: number;
	warnings: string[];
	errors: string[];
}

/**
 * Validates if content appears to be a valid Caddyfile
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
	const trimmed = content.trim();
	if (
		(trimmed.startsWith("{") && trimmed.endsWith("}")) ||
		(trimmed.startsWith("[") && trimmed.endsWith("]"))
	) {
		try {
			JSON.parse(content);
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
	let directiveMatches = 0;

	for (const line of lines) {
		const trimmedLine = line.trim();

		// Skip empty lines and comments
		if (!trimmedLine || trimmedLine.startsWith("#")) {
			continue;
		}

		// Check for common directives
		if (directivePattern.test(trimmedLine)) {
			directiveMatches++;
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
	if (result.confidence >= 50) {
		result.valid = true;
	} else if (result.confidence >= 30) {
		result.valid = true;
		result.warnings.push(
			`Low confidence (${result.confidence}%). This may not be a valid Caddyfile.`,
		);
	} else {
		result.valid = false;
		result.errors.push(
			`File does not appear to be a valid Caddyfile (confidence: ${result.confidence}%)`,
		);
	}

	// Add helpful info
	if (directiveMatches === 0 && result.confidence < 50) {
		result.warnings.push(
			"No common Caddy directives found. This might be a minimal configuration or not a Caddyfile.",
		);
	}

	return result;
}
