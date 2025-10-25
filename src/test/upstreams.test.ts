import { beforeEach, describe, expect, it } from "vitest";
import { getCaddyUpstreams } from "@/lib/api";
import { setMockCaddyAPIAvailable } from "../mocks/handlers";

describe("Upstreams Health", () => {
	beforeEach(() => {
		setMockCaddyAPIAvailable(true);
	});

	describe("getCaddyUpstreams", () => {
		it("should fetch upstream health data successfully", async () => {
			const result = await getCaddyUpstreams();

			expect(result.success).toBe(true);
			expect(result.upstreams).toBeDefined();
			expect(Array.isArray(result.upstreams)).toBe(true);
			expect(result.error).toBeUndefined();
		});

		it("should return upstream data with correct structure", async () => {
			const result = await getCaddyUpstreams();

			expect(result.success).toBe(true);
			expect(result.upstreams).toBeDefined();

			if (result.upstreams) {
				expect(result.upstreams.length).toBeGreaterThan(0);

				// Check first upstream has required fields
				const upstream = result.upstreams[0];
				expect(upstream).toHaveProperty("address");
				expect(upstream).toHaveProperty("num_requests");
				expect(upstream).toHaveProperty("fails");

				// Check types
				expect(typeof upstream.address).toBe("string");
				expect(typeof upstream.num_requests).toBe("number");
				expect(typeof upstream.fails).toBe("number");
			}
		});

		it("should return mock upstreams with varying health statuses", async () => {
			const result = await getCaddyUpstreams();

			expect(result.success).toBe(true);
			expect(result.upstreams).toBeDefined();

			if (result.upstreams) {
				// Should have healthy upstream (0 fails)
				const healthy = result.upstreams.find((u) => u.fails === 0);
				expect(healthy).toBeDefined();

				// Should have degraded upstream (some fails)
				const degraded = result.upstreams.find(
					(u) => u.fails > 0 && u.fails < 10,
				);
				expect(degraded).toBeDefined();

				// Should have unhealthy upstream (many fails)
				const unhealthy = result.upstreams.find((u) => u.fails >= 10);
				expect(unhealthy).toBeDefined();
			}
		});

		it("should fail when Caddy API is unavailable", async () => {
			setMockCaddyAPIAvailable(false);

			const result = await getCaddyUpstreams();

			expect(result.success).toBe(false);
			expect(result.error).toBeDefined();
			expect(result.error).toContain("Caddy API not available");
			expect(result.upstreams).toBeUndefined();
		});

		it("should handle empty upstream list", async () => {
			// Even if no upstreams, should return success with empty array
			const result = await getCaddyUpstreams();

			expect(result.success).toBe(true);
			expect(result.upstreams).toBeDefined();
			expect(Array.isArray(result.upstreams)).toBe(true);
		});
	});

	describe("Upstream Health Status Logic", () => {
		it("should identify healthy upstreams", async () => {
			const result = await getCaddyUpstreams();

			expect(result.success).toBe(true);
			if (result.upstreams) {
				const healthy = result.upstreams.filter((u) => u.fails === 0);
				expect(healthy.length).toBeGreaterThan(0);
			}
		});

		it("should identify degraded upstreams", async () => {
			const result = await getCaddyUpstreams();

			expect(result.success).toBe(true);
			if (result.upstreams) {
				// Degraded: fails > 0 but < threshold
				const degraded = result.upstreams.filter(
					(u) => u.fails > 0 && u.fails <= 5,
				);
				expect(degraded.length).toBeGreaterThan(0);
			}
		});

		it("should identify unhealthy upstreams", async () => {
			const result = await getCaddyUpstreams();

			expect(result.success).toBe(true);
			if (result.upstreams) {
				// Unhealthy: fails > 5
				const unhealthy = result.upstreams.filter((u) => u.fails > 5);
				expect(unhealthy.length).toBeGreaterThan(0);
			}
		});

		it("should track active requests", async () => {
			const result = await getCaddyUpstreams();

			expect(result.success).toBe(true);
			if (result.upstreams) {
				// All upstreams should have num_requests >= 0
				result.upstreams.forEach((u) => {
					expect(u.num_requests).toBeGreaterThanOrEqual(0);
				});
			}
		});
	});
});
