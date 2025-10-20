import { describe, expect, it } from "vitest";
import type { CaddyConfig } from "../../types/caddyfile";
import { caddyfileToJSON, jsonToCaddyfile } from "../caddy-json-converter";

describe("Caddyfile to JSON Converter", () => {
	describe("caddyfileToJSON", () => {
		it("should convert simple reverse proxy", () => {
			const config: CaddyConfig = {
				siteBlocks: [
					{
						id: "1",
						addresses: ["app.example.com"],
						directives: [
							{
								id: "d1",
								name: "reverse_proxy",
								args: ["localhost:3000"],
							},
						],
					},
				],
			};

			const json = caddyfileToJSON(config);

			expect(json.apps.http.servers.clubs).toBeDefined();
			expect(json.apps.http.servers.clubs.routes).toHaveLength(1);

			const route = json.apps.http.servers.clubs.routes[0];
			expect(route.match?.[0].host).toEqual(["app.example.com"]);
			expect(route.handle).toHaveLength(1);
			expect(route.handle[0].handler).toBe("reverse_proxy");
			expect(route.handle[0].upstreams).toEqual([{ dial: "localhost:3000" }]);
		});

		it("should convert file server with root", () => {
			const config: CaddyConfig = {
				siteBlocks: [
					{
						id: "1",
						addresses: ["files.example.com"],
						directives: [
							{
								id: "d1",
								name: "file_server",
								args: ["browse"],
								block: [
									{
										id: "d2",
										name: "root",
										args: ["/var/www/files"],
									},
								],
							},
						],
					},
				],
			};

			const json = caddyfileToJSON(config);

			const route = json.apps.http.servers.clubs.routes[0];
			const handler = route.handle[0];

			expect(handler.handler).toBe("file_server");
			expect(handler.browse).toEqual({});
			expect(handler.root).toBe("/var/www/files");
		});

		it("should handle multiple directives", () => {
			const config: CaddyConfig = {
				siteBlocks: [
					{
						id: "1",
						addresses: ["app.example.com"],
						directives: [
							{
								id: "d1",
								name: "reverse_proxy",
								args: ["localhost:3000"],
							},
							{
								id: "d2",
								name: "encode",
								args: ["gzip"],
							},
						],
					},
				],
			};

			const json = caddyfileToJSON(config);

			const route = json.apps.http.servers.clubs.routes[0];
			expect(route.handle).toHaveLength(2);
			expect(route.handle[0].handler).toBe("reverse_proxy");
			expect(route.handle[1].handler).toBe("encode");
		});

		it("should handle port-only addresses", () => {
			const config: CaddyConfig = {
				siteBlocks: [
					{
						id: "1",
						addresses: [":8080"],
						directives: [
							{
								id: "d1",
								name: "file_server",
								args: [],
							},
						],
					},
				],
			};

			const json = caddyfileToJSON(config);

			const route = json.apps.http.servers.clubs.routes[0];
			expect(route.match).toEqual([]);
		});

		it("should convert redirect directives", () => {
			const config: CaddyConfig = {
				siteBlocks: [
					{
						id: "1",
						addresses: ["old.example.com"],
						directives: [
							{
								id: "d1",
								name: "redir",
								args: ["https://new.example.com{uri}", "301"],
							},
						],
					},
				],
			};

			const json = caddyfileToJSON(config);

			const handler = json.apps.http.servers.clubs.routes[0].handle[0];
			expect(handler.handler).toBe("static_response");
			expect(handler.status_code).toBe(301);
			expect(handler.headers?.Location).toEqual([
				"https://new.example.com{uri}",
			]);
		});

		it("should convert custom headers", () => {
			const config: CaddyConfig = {
				siteBlocks: [
					{
						id: "1",
						addresses: ["app.example.com"],
						directives: [
							{
								id: "d1",
								name: "header",
								args: [],
								block: [
									{
										id: "d2",
										name: "X-Custom-Header",
										args: ["value"],
									},
									{
										id: "d3",
										name: "Cache-Control",
										args: ["max-age=3600"],
									},
								],
							},
						],
					},
				],
			};

			const json = caddyfileToJSON(config);

			const handler = json.apps.http.servers.clubs.routes[0].handle[0];
			expect(handler.handler).toBe("headers");
			expect(handler.response?.set).toEqual({
				"X-Custom-Header": ["value"],
				"Cache-Control": ["max-age=3600"],
			});
		});
	});

	describe("jsonToCaddyfile", () => {
		it("should convert JSON back to Caddyfile format", () => {
			const json = {
				apps: {
					http: {
						servers: {
							clubs: {
								listen: [":443", ":80"],
								routes: [
									{
										match: [{ host: ["app.example.com"] }],
										handle: [
											{
												handler: "reverse_proxy",
												upstreams: [{ dial: "localhost:3000" }],
											},
										],
									},
								],
							},
						},
					},
				},
			};

			const config = jsonToCaddyfile(json);

			expect(config.siteBlocks).toHaveLength(1);
			expect(config.siteBlocks[0].addresses).toEqual(["app.example.com"]);
			expect(config.siteBlocks[0].directives).toHaveLength(1);
			expect(config.siteBlocks[0].directives[0].name).toBe("reverse_proxy");
			expect(config.siteBlocks[0].directives[0].args).toEqual([
				"localhost:3000",
			]);
		});

		it("should handle file server conversion", () => {
			const json = {
				apps: {
					http: {
						servers: {
							clubs: {
								listen: [":80"],
								routes: [
									{
										match: [{ host: ["files.example.com"] }],
										handle: [
											{
												handler: "file_server",
												browse: {},
												root: "/var/www/files",
											},
										],
									},
								],
							},
						},
					},
				},
			};

			const config = jsonToCaddyfile(json);

			const directive = config.siteBlocks[0].directives[0];
			expect(directive.name).toBe("file_server");
			expect(directive.args).toContain("browse");
			expect(directive.block?.[0].name).toBe("root");
			expect(directive.block?.[0].args).toEqual(["/var/www/files"]);
		});

		it("should handle encode conversion", () => {
			const json = {
				apps: {
					http: {
						servers: {
							clubs: {
								listen: [":80"],
								routes: [
									{
										match: [{ host: ["app.example.com"] }],
										handle: [
											{
												handler: "encode",
												encodings: ["gzip", "zstd"],
											},
										],
									},
								],
							},
						},
					},
				},
			};

			const config = jsonToCaddyfile(json);

			const directive = config.siteBlocks[0].directives[0];
			expect(directive.name).toBe("encode");
			expect(directive.args).toEqual(["gzip", "zstd"]);
		});
	});

	describe("Bidirectional Conversion", () => {
		it("should maintain data integrity through round-trip conversion", () => {
			const original: CaddyConfig = {
				siteBlocks: [
					{
						id: "1",
						addresses: ["app.example.com"],
						directives: [
							{
								id: "d1",
								name: "reverse_proxy",
								args: ["localhost:3000"],
							},
							{
								id: "d2",
								name: "encode",
								args: ["gzip"],
							},
						],
					},
				],
			};

			// Convert to JSON and back
			const json = caddyfileToJSON(original);
			const converted = jsonToCaddyfile(json);

			// Check structure is preserved (IDs will be different)
			expect(converted.siteBlocks).toHaveLength(1);
			expect(converted.siteBlocks[0].addresses).toEqual(["app.example.com"]);
			expect(converted.siteBlocks[0].directives).toHaveLength(2);
			expect(converted.siteBlocks[0].directives[0].name).toBe("reverse_proxy");
			expect(converted.siteBlocks[0].directives[1].name).toBe("encode");
		});
	});
});
