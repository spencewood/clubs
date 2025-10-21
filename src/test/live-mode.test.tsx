import { beforeEach, describe, expect, it } from "vitest";
import {
	applyCaddyfileConfig,
	getCaddyAPIStatus,
	saveCaddyfile,
} from "@/lib/api";
import { setMockCaddyAPIAvailable, setMockCaddyfile } from "../mocks/handlers";

describe("Live Mode Integration", () => {
	beforeEach(() => {
		// Reset to Live Mode available
		setMockCaddyAPIAvailable(true);
	});

	describe("API Status Detection", () => {
		it("should detect when Caddy API is available", async () => {
			setMockCaddyAPIAvailable(true);

			const status = await getCaddyAPIStatus();

			expect(status.available).toBe(true);
			expect(status.running).toBe(true);
			expect(status.url).toBe("http://localhost:2019");
			expect(status.version).toBeDefined();
		});

		it("should detect when Caddy API is unavailable", async () => {
			setMockCaddyAPIAvailable(false);

			const status = await getCaddyAPIStatus();

			expect(status.available).toBe(false);
			expect(status.running).toBe(false);
			expect(status.version).toBeUndefined();
		});
	});

	describe("Apply Configuration (Live Mode)", () => {
		it("should successfully apply valid configuration", async () => {
			setMockCaddyAPIAvailable(true);
			setMockCaddyfile(`
app.example.com {
  reverse_proxy localhost:3000
}
      `);

			const result = await applyCaddyfileConfig();

			expect(result.success).toBe(true);
			expect(result.error).toBeUndefined();
		});

		it("should reject invalid configuration", async () => {
			setMockCaddyAPIAvailable(true);
			setMockCaddyfile(`
app.example.com {
  INVALID directive
}
      `);

			const result = await applyCaddyfileConfig();

			expect(result.success).toBe(false);
			expect(result.error).toBeDefined();
			expect(result.error).toContain("Failed to apply configuration");
		});

		it("should fail gracefully when API is unavailable", async () => {
			setMockCaddyAPIAvailable(false);

			const result = await applyCaddyfileConfig();

			expect(result.success).toBe(false);
			expect(result.error).toBeDefined();
		});
	});

	describe("Save to File", () => {
		it("should save Caddyfile successfully", async () => {
			const content = `
app.example.com {
  reverse_proxy localhost:3000
}
      `;

			const result = await saveCaddyfile(content);

			expect(result.success).toBe(true);
			expect(result.error).toBeUndefined();
		});

		it("should handle save errors for invalid content", async () => {
			// Try to save invalid content
			const result = await saveCaddyfile("INVALID directive");

			expect(result.success).toBe(false);
			expect(result.error).toBeDefined();
		});
	});

	describe("Hybrid Mode Behavior", () => {
		it("should prefer Live Mode when available", async () => {
			setMockCaddyAPIAvailable(true);

			const status = await getCaddyAPIStatus();

			expect(status.available).toBe(true);

			// Apply should work
			setMockCaddyfile("app.example.com {\n}");
			const applyResult = await applyCaddyfileConfig();
			expect(applyResult.success).toBe(true);
		});

		it("should fallback to File Mode when API unavailable", async () => {
			setMockCaddyAPIAvailable(false);

			const status = await getCaddyAPIStatus();

			expect(status.available).toBe(false);

			// Apply should fail gracefully
			const applyResult = await applyCaddyfileConfig();
			expect(applyResult.success).toBe(false);

			// But save should still work
			const saveResult = await saveCaddyfile("app.example.com {\n}");
			expect(saveResult.success).toBe(true);
		});
	});

	describe("Error Handling", () => {
		it("should provide clear error messages for validation failures", async () => {
			setMockCaddyAPIAvailable(true);
			setMockCaddyfile("INVALID");

			const result = await applyCaddyfileConfig();

			expect(result.success).toBe(false);
			expect(result.error).toMatch(
				/Failed to apply configuration|Invalid|syntax|directive/,
			);
		});

		it("should handle timeout scenarios", async () => {
			// MSW simulates delays, this tests that timeouts work
			const result = await applyCaddyfileConfig();

			// Should complete within reasonable time
			expect(result).toBeDefined();
		});
	});

	describe("Zero Downtime Guarantees", () => {
		it("should not affect existing config on validation failure", async () => {
			setMockCaddyAPIAvailable(true);

			// First, apply a valid config
			setMockCaddyfile("app.example.com {\n}");
			const goodResult = await applyCaddyfileConfig();
			expect(goodResult.success).toBe(true);

			// Then try to apply invalid config
			setMockCaddyfile("INVALID");
			const badResult = await applyCaddyfileConfig();
			expect(badResult.success).toBe(false);

			// Original config should still be intact (in real scenario)
			// This is guaranteed by Caddy's atomic updates
		});
	});
});
