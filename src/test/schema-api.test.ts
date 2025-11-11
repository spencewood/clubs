import { describe, expect, it } from "vitest";
import { getCaddySchema } from "@/lib/api";
import { setMockCaddyAPIAvailable } from "@/mocks/handlers";

describe("Schema API with MSW", () => {
	it("should generate comprehensive schema when Caddy is available", async () => {
		setMockCaddyAPIAvailable(true);

		const result = await getCaddySchema("comprehensive");

		expect(result.success).toBe(true);
		expect(result.schema).toBeDefined();
		expect(result.mode).toBe("comprehensive");
		expect(result.warning).toBeUndefined();

		// Check schema structure
		// biome-ignore lint/suspicious/noExplicitAny: Test needs to access dynamic properties
		const schema = result.schema as any;
		expect(schema.$schema).toBe("http://json-schema.org/draft-07/schema#");
		expect(schema.title).toContain("Caddy Configuration Schema");
		expect(schema.type).toBe("object");
		expect(schema.properties.apps).toBeDefined();
		expect(schema.properties.admin).toBeDefined();
	});

	it("should generate base schema when mode=base", async () => {
		const result = await getCaddySchema("base");

		expect(result.success).toBe(true);
		expect(result.schema).toBeDefined();
		expect(result.mode).toBe("base");

		// biome-ignore lint/suspicious/noExplicitAny: Test needs to access dynamic properties
		const schema = result.schema as any;
		expect(schema.title).toContain("Base");
	});

	it("should fallback to base schema when Caddy is unavailable", async () => {
		setMockCaddyAPIAvailable(false);

		const result = await getCaddySchema("comprehensive");

		expect(result.success).toBe(true);
		expect(result.schema).toBeDefined();
		expect(result.mode).toBe("base");
		expect(result.warning).toContain("not available");

		// Reset for other tests
		setMockCaddyAPIAvailable(true);
	});

	it("should include HTTP and TLS app schemas in comprehensive mode", async () => {
		setMockCaddyAPIAvailable(true);

		const result = await getCaddySchema("comprehensive");

		expect(result.success).toBe(true);

		// biome-ignore lint/suspicious/noExplicitAny: Test needs to access dynamic properties
		const schema = result.schema as any;
		expect(schema.properties.apps.properties.http).toBeDefined();
		expect(schema.properties.apps.properties.tls).toBeDefined();
	});
});
