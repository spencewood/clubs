import {
	autocompletion,
	type CompletionContext,
} from "@codemirror/autocomplete";
import type { CaddyContext } from "./caddy-context-extractor";
import {
	DIRECTIVE_DOCS,
	ENCODINGS,
	HTTP_STATUS_CODES,
	LB_POLICIES,
	TLS_PROTOCOLS,
} from "./caddy-context-extractor";

/**
 * Analyze the line context to determine what kind of completions to show
 */
function getLineContext(context: CompletionContext): {
	type:
		| "directive"
		| "handler"
		| "upstream"
		| "lb_policy"
		| "protocol"
		| "encoding"
		| "status_code"
		| "unknown";
	prefix: string;
	line: string;
} {
	const line = context.state.doc.lineAt(context.pos);
	const lineText = line.text;
	const cursorPos = context.pos - line.from;
	const textBeforeCursor = lineText.substring(0, cursorPos);
	const words = textBeforeCursor.trim().split(/\s+/);
	const currentWord = words[words.length - 1] || "";

	// Inside reverse_proxy block
	if (lineText.includes("reverse_proxy") && words.length > 1) {
		// Check for lb_policy
		if (words.some((w) => w === "lb_policy")) {
			return { type: "lb_policy", prefix: currentWord, line: lineText };
		}

		// After reverse_proxy directive, suggest upstreams
		if (words[0] === "reverse_proxy" && words.length >= 2) {
			return { type: "upstream", prefix: currentWord, line: lineText };
		}
	}

	// Inside encode block
	if (lineText.includes("encode") && words.length > 1) {
		return { type: "encoding", prefix: currentWord, line: lineText };
	}

	// Inside tls block
	if (lineText.includes("protocols") && words.length > 1) {
		return { type: "protocol", prefix: currentWord, line: lineText };
	}

	// After respond or redir - suggest status codes
	if ((words[0] === "respond" || words[0] === "redir") && words.length >= 2) {
		// If the last word looks like a number, suggest status codes
		if (/^\d*$/.test(currentWord)) {
			return { type: "status_code", prefix: currentWord, line: lineText };
		}
	}

	// At the beginning of a line or after whitespace - suggest directives
	if (
		words.length === 1 ||
		textBeforeCursor.endsWith("\t") ||
		textBeforeCursor.endsWith(" ")
	) {
		return { type: "directive", prefix: currentWord, line: lineText };
	}

	return { type: "unknown", prefix: currentWord, line: lineText };
}

/**
 * Create Caddy autocompletion extension with live context
 */
export function caddyAutocomplete(context: CaddyContext | null) {
	return autocompletion({
		override: [
			(completionContext: CompletionContext) => {
				const { type, prefix } = getLineContext(completionContext);
				const word = completionContext.matchBefore(/\w*/);

				if (!word || (word.from === word.to && !completionContext.explicit)) {
					return null;
				}

				const options: Array<{
					label: string;
					type?: string;
					detail?: string;
					info?: string;
					boost?: number;
				}> = [];

				switch (type) {
					case "directive":
						// Add directive completions with documentation
						for (const [directive, doc] of Object.entries(DIRECTIVE_DOCS)) {
							if (directive.startsWith(prefix.toLowerCase())) {
								options.push({
									label: directive,
									type: "keyword",
									detail: doc.params || "directive",
									info: `${doc.description}${doc.example ? `\n\nExample:\n${doc.example}` : ""}`,
									boost: 10, // Prioritize directives
								});
							}
						}
						break;

					case "upstream": {
						// Add upstream addresses from live config
						if (context?.upstreams) {
							for (const upstream of context.upstreams) {
								if (upstream.toLowerCase().includes(prefix.toLowerCase())) {
									options.push({
										label: upstream,
										type: "variable",
										detail: "upstream address",
										boost: 20, // Prioritize actual upstreams
									});
								}
							}
						}

						// Add common upstream patterns
						const commonUpstreams = [
							"localhost:8080",
							"localhost:3000",
							"localhost:9000",
						];
						for (const upstream of commonUpstreams) {
							if (upstream.toLowerCase().includes(prefix.toLowerCase())) {
								options.push({
									label: upstream,
									type: "variable",
									detail: "common upstream",
									boost: 5,
								});
							}
						}
						break;
					}

					case "lb_policy":
						// Add load balancing policies
						for (const policy of LB_POLICIES) {
							if (policy.label.startsWith(prefix.toLowerCase())) {
								options.push({
									label: policy.label,
									type: "keyword",
									detail: policy.detail,
									boost: 15,
								});
							}
						}
						break;

					case "protocol":
						// Add TLS protocols
						for (const protocol of TLS_PROTOCOLS) {
							if (protocol.label.startsWith(prefix.toLowerCase())) {
								options.push({
									label: protocol.label,
									type: "keyword",
									detail: protocol.detail,
									boost: 15,
								});
							}
						}
						break;

					case "encoding":
						// Add encoding algorithms
						for (const encoding of ENCODINGS) {
							if (encoding.label.startsWith(prefix.toLowerCase())) {
								options.push({
									label: encoding.label,
									type: "keyword",
									detail: encoding.detail,
									boost: 15,
								});
							}
						}
						break;

					case "status_code":
						// Add HTTP status codes
						for (const code of HTTP_STATUS_CODES) {
							if (code.label.startsWith(prefix)) {
								options.push({
									label: code.label,
									type: "constant",
									detail: code.detail,
									boost: 15,
								});
							}
						}
						break;

					case "handler":
						// Add handler types from live config
						if (context?.handlers) {
							for (const handler of context.handlers) {
								if (handler.toLowerCase().includes(prefix.toLowerCase())) {
									options.push({
										label: handler,
										type: "function",
										detail: "handler",
										boost: 12,
									});
								}
							}
						}
						break;
				}

				// If no specific completions, add context-aware suggestions
				if (options.length === 0 && context) {
					// Add hosts
					if (context.hosts.length > 0) {
						for (const host of context.hosts) {
							if (host.toLowerCase().includes(prefix.toLowerCase())) {
								options.push({
									label: host,
									type: "variable",
									detail: "from config",
									boost: 8,
								});
							}
						}
					}
				}

				if (options.length === 0) {
					return null;
				}

				return {
					from: word.from,
					options,
					validFor: /^\w*$/,
				};
			},
		],
	});
}

/**
 * Create a basic Caddy autocompletion without context
 * This is used as a fallback when no live config is available
 */
export function basicCaddyAutocomplete() {
	return autocompletion({
		override: [
			(context: CompletionContext) => {
				const word = context.matchBefore(/\w*/);

				if (!word || (word.from === word.to && !context.explicit)) {
					return null;
				}

				const prefix = word.text.toLowerCase();
				const options: Array<{
					label: string;
					type?: string;
					detail?: string;
					info?: string;
				}> = [];

				// Add directive completions
				for (const [directive, doc] of Object.entries(DIRECTIVE_DOCS)) {
					if (directive.startsWith(prefix)) {
						options.push({
							label: directive,
							type: "keyword",
							detail: doc.params || "directive",
							info: `${doc.description}${doc.example ? `\n\nExample:\n${doc.example}` : ""}`,
						});
					}
				}

				if (options.length === 0) {
					return null;
				}

				return {
					from: word.from,
					options,
					validFor: /^\w*$/,
				};
			},
		],
	});
}
