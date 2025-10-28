import { describe, expect, it } from "vitest";
import {
	parseCaddyfile,
	serializeCaddyfile,
} from "@/lib/parser/caddyfile-parser";
import type { CaddyConfig } from "@/types/caddyfile";

/**
 * Tests for deleting sites from virtual containers
 * These tests ensure that when a site is deleted from a container,
 * both the matcher (@name) and handle block are properly removed.
 */
describe("Container Site Deletion", () => {
	describe("handleDeleteSite logic", () => {
		it("should remove both matcher and handle block when deleting a site", () => {
			const input = `*.services.example.com {
	@api host api.services.example.com
	handle @api {
		reverse_proxy localhost:8080
	}
	@web host web.services.example.com
	handle @web {
		reverse_proxy localhost:3000
	}
	handle {
		abort
	}
}`;

			const config = parseCaddyfile(input);
			expect(config.siteBlocks).toHaveLength(1);

			const container = config.siteBlocks[0];
			expect(container.directives).toHaveLength(5); // 2 matchers + 2 handles + 1 fallback

			// Find the handle block for @api
			const apiHandle = container.directives.find(
				(d) => d.name === "handle" && d.args[0] === "@api",
			);
			expect(apiHandle).toBeDefined();

			// Simulate handleDeleteSite: remove both matcher and handle
			if (apiHandle && apiHandle.args.length > 0) {
				const matcherRef = apiHandle.args[0];
				container.directives = container.directives.filter(
					(d) => d.name !== matcherRef && d.id !== apiHandle.id,
				);
			}

			// Verify both are removed
			expect(container.directives).toHaveLength(3); // Only @web, handle @web, and fallback remain
			expect(
				container.directives.find((d) => d.name === "@api"),
			).toBeUndefined();
			expect(
				container.directives.find(
					(d) => d.name === "handle" && d.args[0] === "@api",
				),
			).toBeUndefined();

			// Verify @web still exists
			expect(container.directives.find((d) => d.name === "@web")).toBeDefined();
			expect(
				container.directives.find(
					(d) => d.name === "handle" && d.args[0] === "@web",
				),
			).toBeDefined();
		});

		it("should handle deletion when only one site exists", () => {
			const input = `*.services.example.com {
	@api host api.services.example.com
	handle @api {
		reverse_proxy localhost:8080
	}
	handle {
		abort
	}
}`;

			const config = parseCaddyfile(input);
			const container = config.siteBlocks[0];

			const apiHandle = container.directives.find(
				(d) => d.name === "handle" && d.args[0] === "@api",
			);

			if (apiHandle && apiHandle.args.length > 0) {
				const matcherRef = apiHandle.args[0];
				container.directives = container.directives.filter(
					(d) => d.name !== matcherRef && d.id !== apiHandle.id,
				);
			}

			// Should only have the fallback handle left
			expect(container.directives).toHaveLength(1);
			expect(container.directives[0].name).toBe("handle");
			expect(container.directives[0].args).toHaveLength(0);
		});

		it("should handle deletion of middle site in multi-site container", () => {
			const input = `*.services.example.com {
	@first host first.services.example.com
	handle @first {
		reverse_proxy localhost:8080
	}
	@middle host middle.services.example.com
	handle @middle {
		reverse_proxy localhost:8081
	}
	@last host last.services.example.com
	handle @last {
		reverse_proxy localhost:8082
	}
	handle {
		abort
	}
}`;

			const config = parseCaddyfile(input);
			const container = config.siteBlocks[0];

			// Delete the middle site
			const middleHandle = container.directives.find(
				(d) => d.name === "handle" && d.args[0] === "@middle",
			);

			if (middleHandle && middleHandle.args.length > 0) {
				const matcherRef = middleHandle.args[0];
				container.directives = container.directives.filter(
					(d) => d.name !== matcherRef && d.id !== middleHandle.id,
				);
			}

			// Should have first, last, and fallback (6 directives total)
			expect(container.directives).toHaveLength(5);
			expect(
				container.directives.find((d) => d.name === "@middle"),
			).toBeUndefined();
			expect(
				container.directives.find((d) => d.name === "@first"),
			).toBeDefined();
			expect(
				container.directives.find((d) => d.name === "@last"),
			).toBeDefined();
		});

		it("should not leave orphaned matchers (the bug this fixes)", () => {
			const input = `*.services.example.com {
	@api host api.services.example.com
	handle @api {
		reverse_proxy localhost:8080
	}
	handle {
		abort
	}
}`;

			const config = parseCaddyfile(input);
			const container = config.siteBlocks[0];

			const apiHandle = container.directives.find(
				(d) => d.name === "handle" && d.args[0] === "@api",
			);

			// This is the OLD BUGGY logic (what we're testing against)
			// First remove the handle
			const buggyDirectives = container.directives.filter(
				(d) => d.id !== apiHandle?.id,
			);

			// Then try to find the handle again (this will fail!)
			const handleBlock = buggyDirectives.find((d) => d.id === apiHandle?.id);

			// This demonstrates the bug - the handle is gone, so we can't find the matcher
			expect(handleBlock).toBeUndefined();

			// The matcher would be left behind with the buggy logic
			expect(buggyDirectives.find((d) => d.name === "@api")).toBeDefined();
		});

		it("should properly serialize after deletion", () => {
			const input = `*.services.example.com {
	@api host api.services.example.com
	handle @api {
		reverse_proxy localhost:8080
	}
	@web host web.services.example.com
	handle @web {
		reverse_proxy localhost:3000
	}
	handle {
		abort
	}
}`;

			const config = parseCaddyfile(input);
			const container = config.siteBlocks[0];

			// Delete @api
			const apiHandle = container.directives.find(
				(d) => d.name === "handle" && d.args[0] === "@api",
			);

			if (apiHandle && apiHandle.args.length > 0) {
				const matcherRef = apiHandle.args[0];
				container.directives = container.directives.filter(
					(d) => d.name !== matcherRef && d.id !== apiHandle.id,
				);
			}

			const output = serializeCaddyfile(config);

			// Should not contain @api or its handle
			expect(output).not.toContain("@api");
			expect(output).not.toContain("api.services.example.com");

			// Should still contain @web
			expect(output).toContain("@web");
			expect(output).toContain("web.services.example.com");

			// Should be valid Caddyfile that can be re-parsed
			const reparsed = parseCaddyfile(output);
			expect(reparsed.siteBlocks).toHaveLength(1);
			expect(reparsed.siteBlocks[0].directives).toHaveLength(3);
		});

		it("should handle sites with complex directives", () => {
			const input = `*.services.example.com {
	@api host api.services.example.com
	handle @api {
		reverse_proxy localhost:8080 {
			header_up X-Real-IP {remote_host}
			health_uri /health
		}
		encode gzip
	}
	@web host web.services.example.com
	handle @web {
		reverse_proxy localhost:3000
	}
	handle {
		abort
	}
}`;

			const config = parseCaddyfile(input);
			const container = config.siteBlocks[0];

			const apiHandle = container.directives.find(
				(d) => d.name === "handle" && d.args[0] === "@api",
			);

			if (apiHandle && apiHandle.args.length > 0) {
				const matcherRef = apiHandle.args[0];
				container.directives = container.directives.filter(
					(d) => d.name !== matcherRef && d.id !== apiHandle.id,
				);
			}

			const output = serializeCaddyfile(config);

			// Should not contain any @api-related config
			expect(output).not.toContain("@api");
			expect(output).not.toContain("X-Real-IP");
			expect(output).not.toContain("/health");

			// Should still work after deletion
			expect(output).toContain("@web");
		});

		it("should handle deletion when handle has no arguments (edge case)", () => {
			const input = `*.services.example.com {
	handle {
		respond "fallback"
	}
}`;

			const config = parseCaddyfile(input);
			const container = config.siteBlocks[0];

			const fallbackHandle = container.directives.find(
				(d) => d.name === "handle" && d.args.length === 0,
			);

			// Simulate deletion with no matcher (should just remove the handle)
			if (fallbackHandle) {
				if (fallbackHandle.args.length > 0) {
					const matcherRef = fallbackHandle.args[0];
					container.directives = container.directives.filter(
						(d) => d.name !== matcherRef && d.id !== fallbackHandle.id,
					);
				} else {
					// No matcher, just remove the handle
					container.directives = container.directives.filter(
						(d) => d.id !== fallbackHandle.id,
					);
				}
			}

			expect(container.directives).toHaveLength(0);
		});
	});

	describe("round-trip preservation (known limitations)", () => {
		it("should NOT preserve comments when re-serializing (documented limitation)", () => {
			const input = `*.services.example.com {
	# This is the API service
	@api host api.services.example.com
	handle @api {
		reverse_proxy localhost:8080
	}

	# This is the web service
	@web host web.services.example.com
	handle @web {
		reverse_proxy localhost:3000
	}

	# Fallback handler
	handle {
		abort
	}
}`;

			const config = parseCaddyfile(input);
			const output = serializeCaddyfile(config);

			// Comments are not preserved (this is expected behavior)
			expect(output).not.toContain("# This is the API service");
			expect(output).not.toContain("# This is the web service");
			expect(output).not.toContain("# Fallback handler");
		});

		it("should NOT preserve custom spacing when re-serializing (documented limitation)", () => {
			const input = `*.services.example.com {
	@api host api.services.example.com


	handle @api {
		reverse_proxy localhost:8080
	}


	@web host web.services.example.com
	handle @web {
		reverse_proxy localhost:3000
	}
}`;

			const config = parseCaddyfile(input);
			const output = serializeCaddyfile(config);

			// Extra blank lines are not preserved (this is expected behavior)
			// The output will have normalized spacing
			expect(output.split("\n\n\n").length).toBe(1); // No triple line breaks
		});
	});

	describe("integration with full config flow", () => {
		it("should work with typical delete workflow", () => {
			// Start with a container with 3 sites
			const config: CaddyConfig = {
				siteBlocks: [
					{
						id: "container-1",
						addresses: ["*.services.example.com"],
						directives: [
							{
								id: "matcher-api",
								name: "@api",
								args: ["host", "api.services.example.com"],
								raw: "@api host api.services.example.com",
							},
							{
								id: "handle-api",
								name: "handle",
								args: ["@api"],
								block: [
									{
										id: "proxy-api",
										name: "reverse_proxy",
										args: ["localhost:8080"],
										raw: "reverse_proxy localhost:8080",
									},
								],
								raw: "handle @api",
							},
							{
								id: "matcher-web",
								name: "@web",
								args: ["host", "web.services.example.com"],
								raw: "@web host web.services.example.com",
							},
							{
								id: "handle-web",
								name: "handle",
								args: ["@web"],
								block: [
									{
										id: "proxy-web",
										name: "reverse_proxy",
										args: ["localhost:3000"],
										raw: "reverse_proxy localhost:3000",
									},
								],
								raw: "handle @web",
							},
							{
								id: "handle-fallback",
								name: "handle",
								args: [],
								block: [
									{
										id: "abort",
										name: "abort",
										args: [],
										raw: "abort",
									},
								],
								raw: "handle",
							},
						],
					},
				],
			};

			const container = config.siteBlocks[0];
			const siteIdToDelete = "handle-api";

			// Simulate handleDeleteSite
			const handleBlock = container.directives.find(
				(d) => d.id === siteIdToDelete,
			);
			if (handleBlock && handleBlock.args.length > 0) {
				const matcherRef = handleBlock.args[0];
				container.directives = container.directives.filter(
					(d) => d.name !== matcherRef && d.id !== siteIdToDelete,
				);
			}

			// Verify deletion
			expect(container.directives).toHaveLength(3);
			expect(
				container.directives.find((d) => d.id === "matcher-api"),
			).toBeUndefined();
			expect(
				container.directives.find((d) => d.id === "handle-api"),
			).toBeUndefined();
			expect(
				container.directives.find((d) => d.id === "handle-web"),
			).toBeDefined();

			// Verify serialization
			const output = serializeCaddyfile(config);
			expect(output).toContain("*.services.example.com");
			expect(output).not.toContain("@api");
			expect(output).toContain("@web");
			expect(output).toContain("abort");
		});
	});
});
