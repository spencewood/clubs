import type { StreamParser } from "@codemirror/language";

// Caddyfile directives (keywords)
const directives = new Set([
	"root",
	"bind",
	"encode",
	"file_server",
	"reverse_proxy",
	"route",
	"handle",
	"handle_path",
	"templates",
	"tls",
	"admin",
	"email",
	"debug",
	"header",
	"header_up",
	"header_down",
	"rewrite",
	"uri",
	"try_files",
	"basicauth",
	"request_header",
	"respond",
	"redir",
	"import",
	"log",
	"php_fastcgi",
	"матchers",
	"path",
	"method",
	"query",
	"vars",
	"expression",
	"not",
	"browse",
	"gzip",
	"zstd",
	"protocols",
]);

// Caddyfile stream parser
export const caddyfile: StreamParser<unknown> = {
	token(stream, _state) {
		// Skip whitespace
		if (stream.eatSpace()) {
			return null;
		}

		// Comments
		if (stream.match(/^#.*/)) {
			return "comment";
		}

		// Strings (quoted)
		if (stream.match(/^"([^"\\]|\\.)*"/)) {
			return "string";
		}
		if (stream.match(/^'([^'\\]|\\.)*'/)) {
			return "string";
		}

		// Numbers (including IPs and ports)
		if (stream.match(/^\d+(\.\d+){0,3}(:\d+)?/)) {
			return "number";
		}

		// Email addresses (check before domain names)
		if (stream.match(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/)) {
			return "string";
		}

		// Placeholders like {host}, {remote_host}, etc.
		if (stream.match(/^\{[^}]+\}/)) {
			return "variableName";
		}

		// Domain names and addresses (before colons or spaces)
		if (
			stream.match(
				/^[a-zA-Z0-9][-a-zA-Z0-9]*(\.[a-zA-Z0-9][-a-zA-Z0-9]*)*(\.[a-zA-Z]{2,})?/,
			)
		) {
			const word = stream.current();
			// Check if it's a directive
			if (directives.has(word)) {
				return "keyword";
			}
			// Check if it looks like a domain (has dot or is followed by port)
			if (word.includes(".") || stream.peek() === ":") {
				return null; // Default color (black/white)
			}
			return "keyword"; // Treat as directive if not recognized
		}

		// Paths (starting with /)
		if (stream.match(/^\/[^\s{]*/)) {
			return "string";
		}

		// Wildcards and matchers
		if (stream.match(/^\*/)) {
			return "operator";
		}

		// Braces
		if (stream.match(/^[{}]/)) {
			return "bracket";
		}

		// Protocol names (http://, https://)
		if (stream.match(/^https?:\/\//)) {
			return "string";
		}

		// Fallback - consume one character
		stream.next();
		return null;
	},
};
