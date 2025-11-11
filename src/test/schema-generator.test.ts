import { describe, expect, it } from "vitest";
import type { CaddyJSONConfig } from "@/lib/server/caddy-api-client";
import {
	generateBaseSchema,
	generateComprehensiveSchema,
	generateSchemaFromConfig,
	type JSONSchema,
	mergeSchemas,
} from "@/lib/server/caddy-schema-generator";

describe("Caddy Schema Generator", () => {
	describe("generateBaseSchema", () => {
		it("should generate a valid base schema", () => {
			const schema = generateBaseSchema();

			expect(schema).toBeDefined();
			expect(schema.$schema).toBe("http://json-schema.org/draft-07/schema#");
			expect(schema.type).toBe("object");
			expect(schema.properties).toBeDefined();
			expect(schema.properties?.apps).toBeDefined();
			expect(schema.properties?.admin).toBeDefined();
		});

		it("should include common Caddy apps in base schema", () => {
			const schema = generateBaseSchema();

			const appsSchema = schema.properties?.apps as JSONSchema;
			expect(appsSchema).toBeDefined();
			expect(appsSchema.properties?.http).toBeDefined();
			expect(appsSchema.properties?.tls).toBeDefined();
			expect(appsSchema.properties?.pki).toBeDefined();
		});
	});

	describe("generateSchemaFromConfig", () => {
		it("should generate schema from empty config", () => {
			const config: CaddyJSONConfig = {};
			const schema = generateSchemaFromConfig(config);

			expect(schema).toBeDefined();
			expect(schema.$schema).toBe("http://json-schema.org/draft-07/schema#");
			expect(schema.type).toBe("object");
		});

		it("should generate schema from basic HTTP config", () => {
			const config: CaddyJSONConfig = {
				apps: {
					http: {
						servers: {
							srv0: {
								listen: [":443"],
								routes: [
									{
										match: [{ host: ["example.com"] }],
										handle: [{ handler: "file_server", root: "/var/www" }],
									},
								],
							},
						},
					},
				},
			};

			const schema = generateSchemaFromConfig(config);

			expect(schema).toBeDefined();
			expect(schema.type).toBe("object");
			expect(schema.properties?.apps).toBeDefined();

			const appsSchema = schema.properties?.apps as JSONSchema;
			expect(appsSchema.properties?.http).toBeDefined();

			const httpSchema = appsSchema.properties?.http as JSONSchema;
			expect(httpSchema.properties?.servers).toBeDefined();
		});

		it("should infer array types correctly", () => {
			const config: CaddyJSONConfig = {
				apps: {
					http: {
						servers: {
							srv0: {
								listen: [":80", ":443"],
								routes: [],
							},
						},
					},
				},
			};

			const schema = generateSchemaFromConfig(config);
			const appsSchema = schema.properties?.apps as JSONSchema;
			const httpSchema = appsSchema.properties?.http as JSONSchema;
			const serversSchema = httpSchema.properties?.servers as JSONSchema;
			const srv0Schema = serversSchema.properties?.srv0 as JSONSchema;
			const listenSchema = srv0Schema.properties?.listen as JSONSchema;

			expect(listenSchema.type).toBe("array");
			expect(listenSchema.items).toBeDefined();
		});

		it("should include field descriptions for known fields", () => {
			const config: CaddyJSONConfig = {
				apps: {
					http: {
						servers: {},
					},
				},
			};

			const schema = generateSchemaFromConfig(config);
			expect(schema.title).toContain("Caddy");
			expect(schema.description).toBeDefined();

			const appsSchema = schema.properties?.apps as JSONSchema;
			expect(appsSchema.description).toBeTruthy();
		});
	});

	describe("mergeSchemas", () => {
		it("should merge two schemas", () => {
			const base: JSONSchema = {
				type: "object",
				properties: {
					foo: { type: "string" },
					bar: { type: "number" },
				},
			};

			const override: JSONSchema = {
				type: "object",
				properties: {
					bar: { type: "string" }, // Override type
					baz: { type: "boolean" }, // Add new property
				},
			};

			const merged = mergeSchemas(base, override);

			expect(merged.properties?.foo).toEqual({ type: "string" });
			expect(merged.properties?.bar).toEqual({ type: "string" }); // Overridden
			expect(merged.properties?.baz).toEqual({ type: "boolean" }); // Added
		});

		it("should merge required fields", () => {
			const base: JSONSchema = {
				type: "object",
				required: ["foo", "bar"],
			};

			const override: JSONSchema = {
				type: "object",
				required: ["bar", "baz"],
			};

			const merged = mergeSchemas(base, override);

			expect(merged.required).toContain("foo");
			expect(merged.required).toContain("bar");
			expect(merged.required).toContain("baz");
			expect(merged.required?.length).toBe(3); // No duplicates
		});
	});

	describe("generateComprehensiveSchema", () => {
		it("should combine base and inferred schemas", () => {
			const config: CaddyJSONConfig = {
				apps: {
					http: {
						servers: {
							custom_server: {
								listen: [":8080"],
							},
						},
					},
				},
			};

			const schema = generateComprehensiveSchema(config);

			expect(schema).toBeDefined();
			expect(schema.type).toBe("object");

			// Should have base schema fields
			expect(schema.properties?.admin).toBeDefined();

			// Should have inferred fields from config
			const appsSchema = schema.properties?.apps as JSONSchema;
			const httpSchema = appsSchema.properties?.http as JSONSchema;
			const serversSchema = httpSchema.properties?.servers as JSONSchema;
			expect(serversSchema.properties?.custom_server).toBeDefined();
		});
	});

	describe("complex config scenarios", () => {
		it("should handle TLS config", () => {
			const config: CaddyJSONConfig = {
				apps: {
					tls: {
						automation: {
							policies: [
								{
									issuers: [
										{
											module: "acme",
											email: "admin@example.com",
										},
									],
								},
							],
						},
						certificates: {
							load_files: [
								{
									certificate: "/path/to/cert.pem",
									key: "/path/to/key.pem",
								},
							],
						},
					},
				},
			};

			const schema = generateSchemaFromConfig(config);
			const appsSchema = schema.properties?.apps as JSONSchema;
			const tlsSchema = appsSchema.properties?.tls as JSONSchema;

			expect(tlsSchema).toBeDefined();
			expect(tlsSchema.properties?.automation).toBeDefined();
			expect(tlsSchema.properties?.certificates).toBeDefined();
		});

		it("should handle reverse proxy config", () => {
			const config: CaddyJSONConfig = {
				apps: {
					http: {
						servers: {
							srv0: {
								routes: [
									{
										handle: [
											{
												handler: "reverse_proxy",
												upstreams: [
													{ dial: "localhost:8080" },
													{ dial: "localhost:8081" },
												],
											},
										],
									},
								],
							},
						},
					},
				},
			};

			const schema = generateSchemaFromConfig(config);
			const appsSchema = schema.properties?.apps as JSONSchema;
			const httpSchema = appsSchema.properties?.http as JSONSchema;
			const serversSchema = httpSchema.properties?.servers as JSONSchema;
			const srv0Schema = serversSchema.properties?.srv0 as JSONSchema;
			const routesSchema = srv0Schema.properties?.routes as JSONSchema;

			expect(routesSchema.type).toBe("array");
			expect(routesSchema.items).toBeDefined();
		});
	});
});
