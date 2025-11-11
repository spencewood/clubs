import type { CaddyJSONConfig } from "./caddy-api-client";

export interface JSONSchema {
	$schema?: string;
	type?: string;
	properties?: Record<string, JSONSchema>;
	items?: JSONSchema;
	additionalProperties?: boolean | JSONSchema;
	description?: string;
	enum?: unknown[];
	required?: string[];
	anyOf?: JSONSchema[];
	[key: string]: unknown;
}

/**
 * Known Caddy configuration field descriptions
 * This enhances the generated schema with helpful documentation
 */
const CADDY_FIELD_DESCRIPTIONS: Record<string, string> = {
	apps: "Top-level application modules (http, tls, pki, etc.)",
	admin: "Admin API configuration",
	logging: "Logging configuration",
	storage: "Storage backend configuration",
	grace_period: "Duration of the graceful shutdown period (Go duration string)",

	// HTTP app
	"apps.http": "HTTP application configuration",
	"apps.http.servers": "HTTP server instances",
	"apps.http.http_port": "Default HTTP port (default: 80)",
	"apps.http.https_port": "Default HTTPS port (default: 443)",
	"apps.http.grace_period": "Graceful shutdown period for HTTP connections",

	// TLS app
	"apps.tls": "TLS/HTTPS configuration",
	"apps.tls.certificates": "Certificate configuration",
	"apps.tls.automation": "Automated certificate management (ACME, etc.)",

	// PKI app
	"apps.pki": "Public Key Infrastructure configuration",
	"apps.pki.certificate_authorities": "Internal certificate authorities",

	// Server fields
	listen: "Listen addresses (e.g., :443, 0.0.0.0:8080)",
	routes: "Routing rules for matching requests",
	errors: "Error handling configuration",
	logs: "Access and error logging configuration",
	automatic_https: "Automatic HTTPS configuration",

	// Route fields
	match: "Request matchers (host, path, headers, etc.)",
	handle: "Handler chain for matched requests",
	terminal: "Whether this route should end the routing chain",

	// Common handler fields
	handler: "Handler module name",
	upstreams: "Backend servers for reverse proxy",
	root: "Document root for file server",
	rewrite: "URL rewriting rules",
};

/**
 * Get a description for a field path (e.g., "apps.http.servers")
 */
function getFieldDescription(path: string): string | undefined {
	return CADDY_FIELD_DESCRIPTIONS[path];
}

/**
 * Infer JSON Schema from a value recursively
 */
function inferSchemaFromValue(value: unknown, path: string = ""): JSONSchema {
	if (value === null) {
		return {
			type: "null",
			description: getFieldDescription(path),
		};
	}

	if (Array.isArray(value)) {
		const itemSchemas =
			value.length > 0
				? value.map((item, i) => inferSchemaFromValue(item, `${path}[${i}]`))
				: [];

		// If all items have the same structure, use that as the schema
		// Otherwise, allow any of the schemas
		const schema: JSONSchema = {
			type: "array",
			description: getFieldDescription(path),
		};

		if (itemSchemas.length > 0) {
			// Simple heuristic: if all items are the same type, use that type
			const types = itemSchemas.map((s) => s.type);
			const allSameType = types.every((t) => t === types[0]);

			if (allSameType && itemSchemas[0]) {
				schema.items = itemSchemas[0];
			} else {
				// Mixed types - use anyOf
				schema.items = {
					anyOf: itemSchemas,
				} as JSONSchema;
			}
		}

		return schema;
	}

	if (typeof value === "object") {
		const obj = value as Record<string, unknown>;
		const properties: Record<string, JSONSchema> = {};
		const required: string[] = [];

		for (const [key, val] of Object.entries(obj)) {
			const fieldPath = path ? `${path}.${key}` : key;
			properties[key] = inferSchemaFromValue(val, fieldPath);

			// Mark field as required if it exists in the config
			if (val !== null && val !== undefined) {
				required.push(key);
			}
		}

		return {
			type: "object",
			properties,
			required: required.length > 0 ? required : undefined,
			additionalProperties: true, // Caddy allows custom fields
			description: getFieldDescription(path),
		};
	}

	// Primitive types
	const type = typeof value;
	if (type === "string" || type === "number" || type === "boolean") {
		return {
			type,
			description: getFieldDescription(path),
		};
	}

	// Fallback
	return {
		type: "object",
		additionalProperties: true,
		description: getFieldDescription(path),
	};
}

/**
 * Generate a JSON Schema from a Caddy configuration
 * This introspects the actual config structure and creates a schema
 * that describes it, making it useful for validation and autocomplete
 */
export function generateSchemaFromConfig(config: CaddyJSONConfig): JSONSchema {
	const schema = inferSchemaFromValue(config, "");

	return {
		...schema,
		$schema: "http://json-schema.org/draft-07/schema#",
		title: "Caddy Configuration Schema",
		description:
			"JSON Schema generated from the current Caddy configuration. This schema reflects the modules and structure present in your Caddy instance.",
	};
}

/**
 * Generate a minimal base schema for Caddy configurations
 * This provides a basic structure even when no config is available
 */
export function generateBaseSchema(): JSONSchema {
	return {
		$schema: "http://json-schema.org/draft-07/schema#",
		title: "Caddy Configuration Schema (Base)",
		description:
			"Base JSON Schema for Caddy configurations. This is a minimal schema that will work with any Caddy installation.",
		type: "object",
		properties: {
			admin: {
				type: "object",
				description: "Admin API configuration",
				properties: {
					listen: {
						type: "string",
						description: "Listen address for admin API",
					},
					enforce_origin: {
						type: "boolean",
						description: "Enforce origin checking",
					},
					origins: {
						type: "array",
						items: { type: "string" },
						description: "Allowed origins for admin API",
					},
				},
				additionalProperties: true,
			},
			logging: {
				type: "object",
				description: "Logging configuration",
				additionalProperties: true,
			},
			storage: {
				type: "object",
				description: "Storage backend configuration",
				additionalProperties: true,
			},
			apps: {
				type: "object",
				description: "Application modules",
				properties: {
					http: {
						type: "object",
						description: "HTTP application",
						properties: {
							servers: {
								type: "object",
								description: "HTTP server instances",
								additionalProperties: {
									type: "object",
									properties: {
										listen: {
											type: "array",
											items: { type: "string" },
											description: "Listen addresses",
										},
										routes: {
											type: "array",
											description: "Request routing rules",
											items: { type: "object" },
										},
									},
								},
							},
							http_port: {
								type: "integer",
								description: "Default HTTP port",
								default: 80,
							},
							https_port: {
								type: "integer",
								description: "Default HTTPS port",
								default: 443,
							},
						},
						additionalProperties: true,
					},
					tls: {
						type: "object",
						description: "TLS/HTTPS configuration",
						additionalProperties: true,
					},
					pki: {
						type: "object",
						description: "Public Key Infrastructure",
						additionalProperties: true,
					},
				},
				additionalProperties: true,
			},
		},
		additionalProperties: true,
	};
}

/**
 * Merge two schemas together, preferring properties from the first schema
 */
export function mergeSchemas(
	base: JSONSchema,
	override: JSONSchema,
): JSONSchema {
	const merged: JSONSchema = { ...base };

	// Merge properties
	if (base.properties && override.properties) {
		merged.properties = {
			...base.properties,
			...override.properties,
		};
	} else if (override.properties) {
		merged.properties = override.properties;
	}

	// Merge required fields
	if (base.required || override.required) {
		const requiredSet = new Set([
			...(base.required || []),
			...(override.required || []),
		]);
		merged.required = Array.from(requiredSet);
	}

	return merged;
}

/**
 * Generate a comprehensive schema from a Caddy config
 * This combines the base schema with the inferred schema from the actual config
 */
export function generateComprehensiveSchema(
	config: CaddyJSONConfig,
): JSONSchema {
	const baseSchema = generateBaseSchema();
	const inferredSchema = generateSchemaFromConfig(config);

	return mergeSchemas(baseSchema, inferredSchema);
}
