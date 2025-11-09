import type { CaddySiteBlock } from "@/types/caddyfile";

export interface Recipe {
	id: string;
	name: string;
	description: string;
	category: "basic" | "proxy" | "static" | "advanced";
	icon: string;
	fields: RecipeField[];
	generate: (values: Record<string, string>) => CaddySiteBlock;
}

export interface RecipeField {
	name: string;
	label: string;
	type: "text" | "number" | "select" | "boolean";
	placeholder?: string;
	description?: string;
	required?: boolean;
	options?: Array<{ value: string; label: string }>;
	defaultValue?: string | number | boolean;
}

function generateId(): string {
	return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

export const recipes: Recipe[] = [
	{
		id: "reverse-proxy",
		name: "Reverse Proxy",
		description: "Proxy requests from a domain to an upstream server",
		category: "proxy",
		icon: "ArrowRightLeft",
		fields: [
			{
				name: "domain",
				label: "Domain",
				type: "text",
				placeholder: "api.example.com",
				description: "The domain that will receive requests",
				required: true,
			},
			{
				name: "backend",
				label: "Upstream Server",
				type: "text",
				placeholder: "localhost:8080",
				description: "The upstream server to proxy requests to",
				required: true,
				defaultValue: "localhost:8080",
			},
			{
				name: "https",
				label: "Enable HTTPS",
				type: "boolean",
				description: "Automatically obtain and renew SSL certificates",
				defaultValue: true,
			},
		],
		generate: (values) => ({
			id: generateId(),
			addresses: [values.domain],
			directives: [
				{
					id: generateId(),
					name: "reverse_proxy",
					args: [values.backend],
					raw: `reverse_proxy ${values.backend}`,
				},
				...(values.https === "true"
					? []
					: [
							{
								id: generateId(),
								name: "tls",
								args: ["internal"],
								raw: "tls internal",
							},
						]),
			],
		}),
	},
	{
		id: "static-site",
		name: "Static Website",
		description: "Serve static files with optional HTTPS",
		category: "static",
		icon: "FileText",
		fields: [
			{
				name: "domain",
				label: "Domain",
				type: "text",
				placeholder: "example.com",
				description: "Your website domain",
				required: true,
			},
			{
				name: "root",
				label: "Root Directory",
				type: "text",
				placeholder: "/var/www/html",
				description: "Path to your website files",
				required: true,
				defaultValue: "/var/www/html",
			},
			{
				name: "compression",
				label: "Enable Compression",
				type: "boolean",
				description: "Compress responses with gzip",
				defaultValue: true,
			},
		],
		generate: (values) => ({
			id: generateId(),
			addresses: [values.domain],
			directives: [
				{
					id: generateId(),
					name: "root",
					args: ["*", values.root],
					raw: `root * ${values.root}`,
				},
				{
					id: generateId(),
					name: "file_server",
					args: [],
					raw: "file_server",
				},
				...(values.compression === "true"
					? [
							{
								id: generateId(),
								name: "encode",
								args: ["gzip"],
								raw: "encode gzip",
							},
						]
					: []),
			],
		}),
	},
	{
		id: "spa-with-api",
		name: "SPA with API",
		description: "Single Page Application with API proxy",
		category: "proxy",
		icon: "Boxes",
		fields: [
			{
				name: "domain",
				label: "Domain",
				type: "text",
				placeholder: "app.example.com",
				description: "Your app domain",
				required: true,
			},
			{
				name: "root",
				label: "App Directory",
				type: "text",
				placeholder: "/app/dist",
				description: "Path to your built SPA files",
				required: true,
				defaultValue: "/app/dist",
			},
			{
				name: "apiPath",
				label: "API Path",
				type: "text",
				placeholder: "/api/*",
				description: "URL path for API requests",
				required: true,
				defaultValue: "/api/*",
			},
			{
				name: "apiBackend",
				label: "API Upstream",
				type: "text",
				placeholder: "localhost:8080",
				description: "Upstream API server",
				required: true,
				defaultValue: "localhost:8080",
			},
		],
		generate: (values) => ({
			id: generateId(),
			addresses: [values.domain],
			directives: [
				{
					id: generateId(),
					name: "root",
					args: ["*", values.root],
					raw: `root * ${values.root}`,
				},
				{
					id: generateId(),
					name: "handle",
					args: [values.apiPath],
					raw: `handle ${values.apiPath}`,
					block: [
						{
							id: generateId(),
							name: "reverse_proxy",
							args: [values.apiBackend],
							raw: `reverse_proxy ${values.apiBackend}`,
						},
					],
				},
				{
					id: generateId(),
					name: "file_server",
					args: [],
					raw: "file_server",
				},
				{
					id: generateId(),
					name: "try_files",
					args: ["{path}", "/index.html"],
					raw: "try_files {path} /index.html",
				},
				{
					id: generateId(),
					name: "encode",
					args: ["gzip"],
					raw: "encode gzip",
				},
			],
		}),
	},
	{
		id: "redirect",
		name: "Redirect",
		description: "Redirect one domain to another",
		category: "basic",
		icon: "ArrowRight",
		fields: [
			{
				name: "from",
				label: "From Domain",
				type: "text",
				placeholder: "www.example.com",
				description: "Domain to redirect from",
				required: true,
			},
			{
				name: "to",
				label: "To URL",
				type: "text",
				placeholder: "https://example.com",
				description: "Where to redirect to",
				required: true,
			},
			{
				name: "permanent",
				label: "Permanent Redirect (301)",
				type: "boolean",
				description: "Use 301 instead of 302",
				defaultValue: true,
			},
		],
		generate: (values) => ({
			id: generateId(),
			addresses: [values.from],
			directives: [
				{
					id: generateId(),
					name: "redir",
					args: [values.to, values.permanent === "true" ? "permanent" : ""],
					raw: `redir ${values.to}${values.permanent === "true" ? " permanent" : ""}`,
				},
			],
		}),
	},
	{
		id: "port-binding",
		name: "Port Binding",
		description: "Listen on a specific port",
		category: "basic",
		icon: "Server",
		fields: [
			{
				name: "port",
				label: "Port",
				type: "number",
				placeholder: "8080",
				description: "Port number to listen on",
				required: true,
				defaultValue: 8080,
			},
			{
				name: "response",
				label: "Response Type",
				type: "select",
				description: "What to serve",
				required: true,
				options: [
					{ value: "text", label: "Text Response" },
					{ value: "proxy", label: "Proxy to Upstream" },
					{ value: "static", label: "Static Files" },
				],
				defaultValue: "text",
			},
			{
				name: "value",
				label: "Value",
				type: "text",
				placeholder: "Hello World! or localhost:3000",
				description: "Response text, upstream address, or file path",
				required: true,
			},
		],
		generate: (values) => {
			const directives: CaddySiteBlock["directives"] = [];

			if (values.response === "text") {
				directives.push({
					id: generateId(),
					name: "respond",
					args: [`"${values.value}"`],
					raw: `respond "${values.value}"`,
				});
			} else if (values.response === "proxy") {
				directives.push({
					id: generateId(),
					name: "reverse_proxy",
					args: [values.value],
					raw: `reverse_proxy ${values.value}`,
				});
			} else if (values.response === "static") {
				directives.push(
					{
						id: generateId(),
						name: "root",
						args: ["*", values.value],
						raw: `root * ${values.value}`,
					},
					{
						id: generateId(),
						name: "file_server",
						args: [],
						raw: "file_server",
					},
				);
			}

			return {
				id: generateId(),
				addresses: [`:${values.port}`],
				directives,
			};
		},
	},
];

export function getRecipeById(id: string): Recipe | undefined {
	return recipes.find((r) => r.id === id);
}

export function getRecipesByCategory(category: Recipe["category"]): Recipe[] {
	return recipes.filter((r) => r.category === category);
}
