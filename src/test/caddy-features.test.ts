import { describe, expect, it } from "vitest";
import {
	caddyFeatures,
	parseDirectiveWithFeatures,
} from "@/lib/caddy-features";
import type { CaddyDirective } from "@/types/caddyfile";

describe("caddy-features", () => {
	describe("TLS Feature", () => {
		const tlsFeature = caddyFeatures.find((f) => f.id === "tls");

		it("should find TLS feature", () => {
			expect(tlsFeature).toBeDefined();
		});

		it("should parse simple 'tls internal' directive", () => {
			const directive: CaddyDirective = {
				id: "test",
				name: "tls",
				args: ["internal"],
			};
			const result = tlsFeature?.parse(directive);
			expect(result).toEqual({ mode: "internal" });
		});

		it("should parse 'tls' with email", () => {
			const directive: CaddyDirective = {
				id: "test",
				name: "tls",
				args: ["admin@example.com"],
			};
			const result = tlsFeature?.parse(directive);
			expect(result).toEqual({ mode: "auto", email: "admin@example.com" });
		});

		it("should parse 'tls' with cert and key files", () => {
			const directive: CaddyDirective = {
				id: "test",
				name: "tls",
				args: ["/path/to/cert.pem", "/path/to/key.pem"],
			};
			const result = tlsFeature?.parse(directive);
			expect(result).toEqual({
				mode: "custom",
				certFile: "/path/to/cert.pem",
				keyFile: "/path/to/key.pem",
			});
		});

		it("should parse plain 'tls' directive as auto mode", () => {
			const directive: CaddyDirective = {
				id: "test",
				name: "tls",
				args: [],
			};
			const result = tlsFeature?.parse(directive);
			expect(result).toEqual({ mode: "auto" });
		});

		it("should NOT parse 'tls' directive with subdirectives", () => {
			const directive: CaddyDirective = {
				id: "test",
				name: "tls",
				args: [],
				block: [
					{
						id: "sub1",
						name: "protocols",
						args: ["tls1.2", "tls1.3"],
					},
				],
			};
			const result = tlsFeature?.parse(directive);
			expect(result).toBeNull();
		});

		it("should generate 'tls internal' directive", () => {
			const directives = tlsFeature?.generate({ mode: "internal" });
			expect(directives).toHaveLength(1);
			expect(directives?.[0].name).toBe("tls");
			expect(directives?.[0].args).toEqual(["internal"]);
		});

		it("should generate 'tls' with email", () => {
			const directives = tlsFeature?.generate({
				mode: "auto",
				email: "admin@example.com",
			});
			expect(directives).toHaveLength(1);
			expect(directives?.[0].name).toBe("tls");
			expect(directives?.[0].args).toEqual(["admin@example.com"]);
		});

		it("should generate 'tls' with cert and key", () => {
			const directives = tlsFeature?.generate({
				mode: "custom",
				certFile: "/path/to/cert.pem",
				keyFile: "/path/to/key.pem",
			});
			expect(directives).toHaveLength(1);
			expect(directives?.[0].name).toBe("tls");
			expect(directives?.[0].args).toEqual([
				"/path/to/cert.pem",
				"/path/to/key.pem",
			]);
		});
	});

	describe("DNS Feature", () => {
		const dnsFeature = caddyFeatures.find((f) => f.id === "dns");

		it("should find DNS feature", () => {
			expect(dnsFeature).toBeDefined();
		});

		it("should parse 'dns cloudflare <token>' directive", () => {
			const directive: CaddyDirective = {
				id: "test",
				name: "dns",
				args: ["cloudflare", "my-api-token"],
			};
			const result = dnsFeature?.parse(directive);
			expect(result).toEqual({
				provider: "cloudflare",
				apiToken: "my-api-token",
			});
		});

		it("should parse 'dns' with multi-word token", () => {
			const directive: CaddyDirective = {
				id: "test",
				name: "dns",
				args: ["route53", "AWS", "KEY", "HERE"],
			};
			const result = dnsFeature?.parse(directive);
			expect(result).toEqual({
				provider: "route53",
				apiToken: "AWS KEY HERE",
			});
		});

		it("should NOT parse 'dns' directive with subdirectives", () => {
			const directive: CaddyDirective = {
				id: "test",
				name: "dns",
				args: ["cloudflare"],
				block: [
					{
						id: "sub1",
						name: "api_token",
						args: ["token"],
					},
				],
			};
			const result = dnsFeature?.parse(directive);
			expect(result).toBeNull();
		});

		it("should generate 'dns cloudflare <token>' directive", () => {
			const directives = dnsFeature?.generate({
				provider: "cloudflare",
				apiToken: "my-token",
			});
			expect(directives).toHaveLength(1);
			expect(directives?.[0].name).toBe("dns");
			expect(directives?.[0].args).toEqual(["cloudflare", "my-token"]);
		});
	});

	describe("Header Feature", () => {
		const headerFeature = caddyFeatures.find((f) => f.id === "header");

		it("should find Header feature", () => {
			expect(headerFeature).toBeDefined();
		});

		it("should parse simple 'header' directive", () => {
			const directive: CaddyDirective = {
				id: "test",
				name: "header",
				args: ["X-Custom-Header", '"value"'],
			};
			const result = headerFeature?.parse(directive);
			expect(result).toEqual({
				name: "X-Custom-Header",
				value: "value",
			});
		});

		it("should remove quotes from header value", () => {
			const directive: CaddyDirective = {
				id: "test",
				name: "header",
				args: ["X-Header", "'single-quotes'"],
			};
			const result = headerFeature?.parse(directive);
			expect(result).toEqual({
				name: "X-Header",
				value: "single-quotes",
			});
		});

		it("should NOT parse 'header /' with subdirectives", () => {
			const directive: CaddyDirective = {
				id: "test",
				name: "header",
				args: ["/"],
				block: [
					{
						id: "sub1",
						name: "Strict-Transport-Security",
						args: ['"max-age=31536000;"'],
					},
					{
						id: "sub2",
						name: "X-Frame-Options",
						args: ['"DENY"'],
					},
				],
			};
			const result = headerFeature?.parse(directive);
			expect(result).toBeNull();
		});

		it("should generate 'header' directive", () => {
			const directives = headerFeature?.generate({
				name: "X-Custom",
				value: "test",
			});
			expect(directives).toHaveLength(1);
			expect(directives?.[0].name).toBe("header");
			expect(directives?.[0].args).toEqual(["X-Custom", '"test"']);
		});
	});

	describe("Reverse Proxy Feature", () => {
		const proxyFeature = caddyFeatures.find((f) => f.id === "reverse-proxy");

		it("should find Reverse Proxy feature", () => {
			expect(proxyFeature).toBeDefined();
		});

		it("should parse 'reverse_proxy' with backend only", () => {
			const directive: CaddyDirective = {
				id: "test",
				name: "reverse_proxy",
				args: ["localhost:8080"],
			};
			const result = proxyFeature?.parse(directive);
			expect(result).toEqual({
				backend: "localhost:8080",
				headers: true,
			});
		});

		it("should parse 'reverse_proxy' with path and backend", () => {
			const directive: CaddyDirective = {
				id: "test",
				name: "reverse_proxy",
				args: ["/api/*", "localhost:8080"],
			};
			const result = proxyFeature?.parse(directive);
			expect(result).toEqual({
				path: "/api/*",
				backend: "localhost:8080",
				headers: true,
			});
		});

		it("should generate 'reverse_proxy' without path", () => {
			const directives = proxyFeature?.generate({
				backend: "localhost:3000",
			});
			expect(directives).toHaveLength(1);
			expect(directives?.[0].name).toBe("reverse_proxy");
			expect(directives?.[0].args).toEqual(["localhost:3000"]);
		});

		it("should generate 'reverse_proxy' with path", () => {
			const directives = proxyFeature?.generate({
				path: "/api/*",
				backend: "localhost:3000",
			});
			expect(directives).toHaveLength(1);
			expect(directives?.[0].name).toBe("reverse_proxy");
			expect(directives?.[0].args).toEqual(["/api/*", "localhost:3000"]);
		});
	});

	describe("parseDirectiveWithFeatures", () => {
		it("should identify TLS internal directive", () => {
			const directive: CaddyDirective = {
				id: "test",
				name: "tls",
				args: ["internal"],
			};
			const result = parseDirectiveWithFeatures(directive);
			expect(result).not.toBeNull();
			expect(result?.feature.id).toBe("tls");
			expect(result?.values).toEqual({ mode: "internal" });
		});

		it("should identify DNS directive", () => {
			const directive: CaddyDirective = {
				id: "test",
				name: "dns",
				args: ["cloudflare", "token"],
			};
			const result = parseDirectiveWithFeatures(directive);
			expect(result).not.toBeNull();
			expect(result?.feature.id).toBe("dns");
		});

		it("should return null for unknown directive", () => {
			const directive: CaddyDirective = {
				id: "test",
				name: "unknown_directive",
				args: ["foo", "bar"],
			};
			const result = parseDirectiveWithFeatures(directive);
			expect(result).toBeNull();
		});

		it("should return null for directive with subdirectives", () => {
			const directive: CaddyDirective = {
				id: "test",
				name: "tls",
				args: [],
				block: [{ id: "sub1", name: "protocols", args: ["tls1.3"] }],
			};
			const result = parseDirectiveWithFeatures(directive);
			expect(result).toBeNull();
		});
	});
});
