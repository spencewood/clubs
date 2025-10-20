import type { CaddyDirective } from "../types/caddyfile";

export interface CaddyFeature {
	id: string;
	name: string;
	description: string;
	icon: string;
	category: "proxy" | "files" | "headers" | "redirect" | "security" | "logging";
	fields: Array<{
		name: string;
		label: string;
		type: "text" | "boolean" | "select" | "number";
		required?: boolean;
		defaultValue?: string | boolean | number;
		options?: Array<{ value: string; label: string }>;
		placeholder?: string;
		helpText?: string;
	}>;
	generate: (values: Record<string, unknown>) => CaddyDirective[];
	parse: (directive: CaddyDirective) => Record<string, unknown> | null;
}

// Helper to generate unique IDs for directives
let directiveIdCounter = 0;
function generateDirectiveId(): string {
	return `directive-${Date.now()}-${directiveIdCounter++}`;
}

// Helper to create a directive from raw text
function createDirective(raw: string): CaddyDirective {
	const parts = raw.trim().split(/\s+/);
	const name = parts[0] || "";
	const args = parts.slice(1);

	return {
		id: generateDirectiveId(),
		name,
		args,
		raw,
	};
}

// Helper to create a directive with subdirectives
function createDirectiveWithBlock(
	name: string,
	args: string[],
	subdirectives: CaddyDirective[],
): CaddyDirective {
	return {
		id: generateDirectiveId(),
		name,
		args,
		block: subdirectives,
		raw: `${name} ${args.join(" ")}`,
	};
}

export const caddyFeatures: CaddyFeature[] = [
	{
		id: "reverse-proxy",
		name: "Proxy to Backend",
		description: "Forward requests to another server",
		icon: "ArrowLeftRight",
		category: "proxy",
		fields: [
			{
				name: "backend",
				label: "Backend Server",
				type: "text",
				required: true,
				placeholder: "localhost:8080",
				helpText: "The server to proxy requests to",
			},
			{
				name: "path",
				label: "Path Pattern",
				type: "text",
				placeholder: "/api/*",
				helpText: "Optional: Only proxy specific paths",
			},
			{
				name: "headers",
				label: "Preserve Host Header",
				type: "boolean",
				defaultValue: true,
				helpText: "Send original Host header to backend",
			},
		],
		generate: (values) => {
			const path = values.path as string | undefined;
			const backend = values.backend as string;

			if (path) {
				return [createDirective(`reverse_proxy ${path} ${backend}`)];
			}
			return [createDirective(`reverse_proxy ${backend}`)];
		},
		parse: (directive) => {
			if (directive.name !== "reverse_proxy") return null;

			// Pattern: reverse_proxy [path] backend
			if (directive.args.length === 2) {
				return {
					path: directive.args[0],
					backend: directive.args[1],
					headers: true,
				};
			}
			if (directive.args.length === 1) {
				return {
					backend: directive.args[0],
					headers: true,
				};
			}
			return null;
		},
	},
	{
		id: "file-server",
		name: "Serve Static Files",
		description: "Serve files from a directory",
		icon: "FolderOpen",
		category: "files",
		fields: [
			{
				name: "root",
				label: "Root Directory",
				type: "text",
				required: true,
				placeholder: "/var/www/html",
				helpText: "Path to the directory containing files",
			},
			{
				name: "browse",
				label: "Enable Directory Browsing",
				type: "boolean",
				defaultValue: false,
				helpText: "Allow users to browse directory listings",
			},
		],
		generate: (values) => {
			const root = values.root as string;
			const browse = values.browse as boolean;

			const directives = [createDirective(`root * ${root}`)];

			if (browse) {
				directives.push(createDirective("file_server browse"));
			} else {
				directives.push(createDirective("file_server"));
			}

			return directives;
		},
		parse: (directive) => {
			// This feature generates multiple directives, so we can't easily parse it
			// from a single directive. Return null to indicate it's not parseable.
			return null;
		},
	},
	{
		id: "compression",
		name: "Enable Compression",
		description: "Compress responses with gzip/zstd",
		icon: "Archive",
		category: "files",
		fields: [
			{
				name: "algorithm",
				label: "Compression Algorithm",
				type: "select",
				required: true,
				defaultValue: "gzip",
				options: [
					{ value: "gzip", label: "Gzip (widely compatible)" },
					{ value: "zstd", label: "Zstandard (better compression)" },
					{ value: "gzip zstd", label: "Both (auto-select best)" },
				],
			},
		],
		generate: (values) => {
			return [createDirective(`encode ${values.algorithm}`)];
		},
		parse: (directive) => {
			if (directive.name !== "encode") return null;

			return {
				algorithm: directive.args.join(" "),
			};
		},
	},
	{
		id: "header",
		name: "Add Custom Header",
		description: "Set HTTP response headers",
		icon: "FileCode",
		category: "headers",
		fields: [
			{
				name: "name",
				label: "Header Name",
				type: "text",
				required: true,
				placeholder: "X-Custom-Header",
			},
			{
				name: "value",
				label: "Header Value",
				type: "text",
				required: true,
				placeholder: "value",
			},
		],
		generate: (values) => {
			return [createDirective(`header ${values.name} "${values.value}"`)];
		},
		parse: (directive) => {
			if (directive.name !== "header") return null;
			if (directive.args.length < 2) return null;

			const name = directive.args[0];
			// Remove quotes from value if present
			const value = directive.args.slice(1).join(" ").replace(/^["']|["']$/g, "");

			return { name, value };
		},
	},
	{
		id: "redirect",
		name: "Redirect",
		description: "Redirect requests to another URL",
		icon: "ArrowRight",
		category: "redirect",
		fields: [
			{
				name: "from",
				label: "From Path",
				type: "text",
				placeholder: "/old-path",
				helpText: "Optional: Redirect only specific paths",
			},
			{
				name: "to",
				label: "To URL",
				type: "text",
				required: true,
				placeholder: "https://example.com/new-path",
			},
			{
				name: "permanent",
				label: "Permanent Redirect (301)",
				type: "boolean",
				defaultValue: false,
				helpText: "Otherwise uses temporary redirect (302)",
			},
		],
		generate: (values) => {
			const from = values.from as string | undefined;
			const to = values.to as string;
			const permanent = values.permanent as boolean;
			const code = permanent ? "permanent" : "temporary";

			if (from) {
				return [createDirective(`redir ${from} ${to} ${code}`)];
			}
			return [createDirective(`redir ${to} ${code}`)];
		},
		parse: (directive) => {
			if (directive.name !== "redir") return null;

			// Pattern: redir [from] to [code]
			const lastArg = directive.args[directive.args.length - 1];
			const permanent = lastArg === "permanent";

			if (directive.args.length === 3) {
				// Has from path
				return {
					from: directive.args[0],
					to: directive.args[1],
					permanent,
				};
			}
			if (directive.args.length === 2) {
				// No from path
				return {
					to: directive.args[0],
					permanent,
				};
			}
			return null;
		},
	},
	{
		id: "logging",
		name: "Enable Logging",
		description: "Log requests to a file",
		icon: "FileText",
		category: "logging",
		fields: [
			{
				name: "output",
				label: "Log File Path",
				type: "text",
				required: true,
				placeholder: "/var/log/caddy/access.log",
			},
			{
				name: "format",
				label: "Log Format",
				type: "select",
				defaultValue: "common",
				options: [
					{ value: "common", label: "Common Log Format" },
					{ value: "json", label: "JSON" },
					{ value: "console", label: "Console (development)" },
				],
			},
		],
		generate: (values) => {
			const output = values.output as string;
			const format = values.format as string;

			return [
				createDirectiveWithBlock(
					"log",
					[],
					[
						createDirective(`output file ${output}`),
						createDirective(`format ${format}`),
					],
				),
			];
		},
		parse: (directive) => {
			if (directive.name !== "log") return null;
			if (!directive.block || directive.block.length === 0) return null;

			let output = "";
			let format = "common";

			for (const sub of directive.block) {
				if (sub.name === "output" && sub.args[0] === "file") {
					output = sub.args.slice(1).join(" ");
				} else if (sub.name === "format") {
					format = sub.args.join(" ");
				}
			}

			if (!output) return null;

			return { output, format };
		},
	},
	{
		id: "tls",
		name: "TLS/SSL Settings",
		description: "Configure HTTPS certificates",
		icon: "Lock",
		category: "security",
		fields: [
			{
				name: "email",
				label: "Email for Let's Encrypt",
				type: "text",
				placeholder: "admin@example.com",
				helpText: "For automatic certificate management",
			},
			{
				name: "certFile",
				label: "Certificate File",
				type: "text",
				placeholder: "/path/to/cert.pem",
				helpText: "For custom certificates",
			},
			{
				name: "keyFile",
				label: "Key File",
				type: "text",
				placeholder: "/path/to/key.pem",
				helpText: "For custom certificates",
			},
		],
		generate: (values) => {
			const email = values.email as string | undefined;
			const certFile = values.certFile as string | undefined;
			const keyFile = values.keyFile as string | undefined;

			if (certFile && keyFile) {
				return [createDirective(`tls ${certFile} ${keyFile}`)];
			}
			if (email) {
				return [createDirective(`tls ${email}`)];
			}
			return [createDirective("tls")];
		},
		parse: (directive) => {
			if (directive.name !== "tls") return null;

			if (directive.args.length === 0) {
				// Just "tls" with no args
				return {};
			}
			if (directive.args.length === 1) {
				// Could be email
				const arg = directive.args[0];
				if (arg.includes("@")) {
					return { email: arg };
				}
				return {};
			}
			if (directive.args.length === 2) {
				// cert and key files
				return {
					certFile: directive.args[0],
					keyFile: directive.args[1],
				};
			}
			return null;
		},
	},
	{
		id: "cors",
		name: "CORS Headers",
		description: "Enable Cross-Origin Resource Sharing",
		icon: "Globe",
		category: "headers",
		fields: [
			{
				name: "origins",
				label: "Allowed Origins",
				type: "text",
				required: true,
				defaultValue: "*",
				placeholder: "https://example.com",
				helpText: "Use * for all origins (not recommended for production)",
			},
			{
				name: "methods",
				label: "Allowed Methods",
				type: "text",
				defaultValue: "GET, POST, PUT, DELETE, OPTIONS",
			},
		],
		generate: (values) => {
			const origins = values.origins as string;
			const methods = values.methods as string;

			return [
				createDirective(`header Access-Control-Allow-Origin "${origins}"`),
				createDirective(`header Access-Control-Allow-Methods "${methods}"`),
				createDirective(
					'header Access-Control-Allow-Headers "Content-Type, Authorization"',
				),
			];
		},
		parse: (directive) => {
			// CORS generates multiple directives, can't parse from single directive
			return null;
		},
	},
];

// Helper function to try parsing a directive with all features
export function parseDirectiveWithFeatures(
	directive: CaddyDirective,
): { feature: CaddyFeature; values: Record<string, unknown> } | null {
	for (const feature of caddyFeatures) {
		const values = feature.parse(directive);
		if (values !== null) {
			return { feature, values };
		}
	}
	return null;
}

export const featureCategories = [
	{ id: "proxy", label: "Proxying", icon: "ArrowLeftRight" },
	{ id: "files", label: "File Serving", icon: "FolderOpen" },
	{ id: "headers", label: "Headers", icon: "FileCode" },
	{ id: "redirect", label: "Redirects", icon: "ArrowRight" },
	{ id: "security", label: "Security", icon: "Lock" },
	{ id: "logging", label: "Logging", icon: "FileText" },
] as const;
