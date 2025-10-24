import { describe, expect, it } from "vitest";
import {
	parseCaddyfile,
	serializeCaddyfile,
} from "@/lib/parser/caddyfile-parser";

describe("@id tag support", () => {
	it("should parse @id tag from site block", () => {
		const input = `example.com {
	@id mysite
	reverse_proxy localhost:8080
}`;

		const config = parseCaddyfile(input);
		expect(config.siteBlocks).toHaveLength(1);
		expect(config.siteBlocks[0].caddyId).toBe("mysite");
		expect(config.siteBlocks[0].directives).toHaveLength(1);
		expect(config.siteBlocks[0].directives[0].name).toBe("reverse_proxy");
	});

	it("should serialize @id tag back to Caddyfile", () => {
		const input = `example.com {
	@id mysite
	reverse_proxy localhost:8080
}`;

		const config = parseCaddyfile(input);
		const output = serializeCaddyfile(config);

		expect(output).toContain("@id mysite");
		expect(output).toContain("reverse_proxy localhost:8080");
	});

	it("should handle multiple sites with different @id tags", () => {
		const input = `example.com {
	@id site1
	reverse_proxy localhost:8080
}

api.example.com {
	@id site2
	reverse_proxy localhost:9000
}`;

		const config = parseCaddyfile(input);
		expect(config.siteBlocks).toHaveLength(2);
		expect(config.siteBlocks[0].caddyId).toBe("site1");
		expect(config.siteBlocks[1].caddyId).toBe("site2");
	});

	it("should handle sites without @id tags", () => {
		const input = `example.com {
	reverse_proxy localhost:8080
}`;

		const config = parseCaddyfile(input);
		expect(config.siteBlocks).toHaveLength(1);
		expect(config.siteBlocks[0].caddyId).toBeUndefined();
	});

	it("should preserve @id tag in round-trip", () => {
		const input = `example.com {
	@id mysite
	reverse_proxy localhost:8080
	encode gzip
}`;

		const config = parseCaddyfile(input);
		const output = serializeCaddyfile(config);
		const reparsed = parseCaddyfile(output);

		expect(reparsed.siteBlocks[0].caddyId).toBe("mysite");
		expect(reparsed.siteBlocks[0].directives).toHaveLength(2);
	});
});
