import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { UpstreamsProvider, useUpstreams } from "@/contexts/UpstreamsContext";

// Mock the API and parser
vi.mock("@/lib/api", () => ({
	loadCaddyfile: vi.fn(),
}));

vi.mock("@/lib/parser/caddyfile-parser", () => ({
	parseCaddyfile: vi.fn(),
}));

vi.mock("@/lib/upstream-utils", () => ({
	getConfiguredUpstreams: vi.fn(),
}));

describe("UpstreamsContext", () => {
	beforeEach(() => {
		// Clear localStorage before each test
		localStorage.clear();
		vi.clearAllMocks();
	});

	describe("Provider", () => {
		it("should provide initial state", async () => {
			const { loadCaddyfile } = await import("@/lib/api");
			const { parseCaddyfile } = await import("@/lib/parser/caddyfile-parser");
			const { getConfiguredUpstreams } = await import("@/lib/upstream-utils");

			vi.mocked(loadCaddyfile).mockResolvedValue({
				success: true,
				content: "",
			});
			vi.mocked(parseCaddyfile).mockReturnValue({
				siteBlocks: [],
				globalOptions: [],
			});
			vi.mocked(getConfiguredUpstreams).mockReturnValue([]);

			const { result } = renderHook(() => useUpstreams(), {
				wrapper: UpstreamsProvider,
			});

			await waitFor(() => {
				expect(result.current.loading).toBe(false);
			});

			expect(result.current.upstreams).toEqual([]);
			expect(result.current.error).toBe(null);
			expect(typeof result.current.addCustomUpstream).toBe("function");
			expect(typeof result.current.removeCustomUpstream).toBe("function");
			expect(typeof result.current.refresh).toBe("function");
		});
	});

	describe("addCustomUpstream", () => {
		it("should add a custom upstream to the list", async () => {
			const { loadCaddyfile } = await import("@/lib/api");
			const { parseCaddyfile } = await import("@/lib/parser/caddyfile-parser");
			const { getConfiguredUpstreams } = await import("@/lib/upstream-utils");

			vi.mocked(loadCaddyfile).mockResolvedValue({
				success: true,
				content: "",
			});
			vi.mocked(parseCaddyfile).mockReturnValue({
				siteBlocks: [],
				globalOptions: [],
			});
			vi.mocked(getConfiguredUpstreams).mockReturnValue([]);

			const { result } = renderHook(() => useUpstreams(), {
				wrapper: UpstreamsProvider,
			});

			await waitFor(() => {
				expect(result.current.loading).toBe(false);
			});

			act(() => {
				result.current.addCustomUpstream("localhost:3000");
			});

			await waitFor(() => {
				const upstream = result.current.upstreams.find(
					(u) => u.address === "localhost:3000",
				);
				expect(upstream).toBeDefined();
				expect(upstream?.isCustom).toBe(true);
				expect(upstream?.server).toBe("localhost");
				expect(upstream?.port).toBe(3000);
			});
		});

		it("should not add duplicate upstreams", async () => {
			const { loadCaddyfile } = await import("@/lib/api");
			const { parseCaddyfile } = await import("@/lib/parser/caddyfile-parser");
			const { getConfiguredUpstreams } = await import("@/lib/upstream-utils");

			vi.mocked(loadCaddyfile).mockResolvedValue({
				success: true,
				content: "",
			});
			vi.mocked(parseCaddyfile).mockReturnValue({
				siteBlocks: [],
				globalOptions: [],
			});
			vi.mocked(getConfiguredUpstreams).mockReturnValue([]);

			const { result } = renderHook(() => useUpstreams(), {
				wrapper: UpstreamsProvider,
			});

			await waitFor(() => {
				expect(result.current.loading).toBe(false);
			});

			act(() => {
				result.current.addCustomUpstream("localhost:3000");
			});

			await waitFor(() => {
				expect(result.current.upstreams.length).toBe(1);
			});

			// Try adding the same upstream again
			act(() => {
				result.current.addCustomUpstream("localhost:3000");
			});

			// Should still only have 1 upstream
			await waitFor(() => {
				expect(result.current.upstreams.length).toBe(1);
			});
		});

		it("should persist custom upstreams to localStorage", async () => {
			const { loadCaddyfile } = await import("@/lib/api");
			const { parseCaddyfile } = await import("@/lib/parser/caddyfile-parser");
			const { getConfiguredUpstreams } = await import("@/lib/upstream-utils");

			vi.mocked(loadCaddyfile).mockResolvedValue({
				success: true,
				content: "",
			});
			vi.mocked(parseCaddyfile).mockReturnValue({
				siteBlocks: [],
				globalOptions: [],
			});
			vi.mocked(getConfiguredUpstreams).mockReturnValue([]);

			const { result } = renderHook(() => useUpstreams(), {
				wrapper: UpstreamsProvider,
			});

			await waitFor(() => {
				expect(result.current.loading).toBe(false);
			});

			act(() => {
				result.current.addCustomUpstream("localhost:3000");
			});

			await waitFor(() => {
				const stored = localStorage.getItem("clubs_custom_upstreams");
				expect(stored).toBe('["localhost:3000"]');
			});
		});
	});

	describe("removeCustomUpstream", () => {
		it("should remove a custom upstream from the list", async () => {
			const { loadCaddyfile } = await import("@/lib/api");
			const { parseCaddyfile } = await import("@/lib/parser/caddyfile-parser");
			const { getConfiguredUpstreams } = await import("@/lib/upstream-utils");

			vi.mocked(loadCaddyfile).mockResolvedValue({
				success: true,
				content: "",
			});
			vi.mocked(parseCaddyfile).mockReturnValue({
				siteBlocks: [],
				globalOptions: [],
			});
			vi.mocked(getConfiguredUpstreams).mockReturnValue([]);

			const { result } = renderHook(() => useUpstreams(), {
				wrapper: UpstreamsProvider,
			});

			await waitFor(() => {
				expect(result.current.loading).toBe(false);
			});

			// Add upstream
			act(() => {
				result.current.addCustomUpstream("localhost:3000");
			});

			await waitFor(() => {
				expect(result.current.upstreams.length).toBe(1);
			});

			// Remove upstream
			act(() => {
				result.current.removeCustomUpstream("localhost:3000");
			});

			await waitFor(() => {
				expect(result.current.upstreams.length).toBe(0);
			});
		});
	});

	describe("parseUpstreamAddress", () => {
		it("should parse server:port addresses", async () => {
			const { loadCaddyfile } = await import("@/lib/api");
			const { parseCaddyfile } = await import("@/lib/parser/caddyfile-parser");
			const { getConfiguredUpstreams } = await import("@/lib/upstream-utils");

			vi.mocked(loadCaddyfile).mockResolvedValue({
				success: true,
				content: "",
			});
			vi.mocked(parseCaddyfile).mockReturnValue({
				siteBlocks: [],
				globalOptions: [],
			});
			vi.mocked(getConfiguredUpstreams).mockReturnValue([]);

			const { result } = renderHook(() => useUpstreams(), {
				wrapper: UpstreamsProvider,
			});

			await waitFor(() => {
				expect(result.current.loading).toBe(false);
			});

			act(() => {
				result.current.addCustomUpstream("localhost:8080");
			});

			await waitFor(() => {
				const upstream = result.current.upstreams[0];
				expect(upstream.address).toBe("localhost:8080");
				expect(upstream.server).toBe("localhost");
				expect(upstream.port).toBe(8080);
			});
		});

		it("should parse addresses without ports", async () => {
			const { loadCaddyfile } = await import("@/lib/api");
			const { parseCaddyfile } = await import("@/lib/parser/caddyfile-parser");
			const { getConfiguredUpstreams } = await import("@/lib/upstream-utils");

			vi.mocked(loadCaddyfile).mockResolvedValue({
				success: true,
				content: "",
			});
			vi.mocked(parseCaddyfile).mockReturnValue({
				siteBlocks: [],
				globalOptions: [],
			});
			vi.mocked(getConfiguredUpstreams).mockReturnValue([]);

			const { result } = renderHook(() => useUpstreams(), {
				wrapper: UpstreamsProvider,
			});

			await waitFor(() => {
				expect(result.current.loading).toBe(false);
			});

			act(() => {
				result.current.addCustomUpstream("myserver.local");
			});

			await waitFor(() => {
				const upstream = result.current.upstreams[0];
				expect(upstream.address).toBe("myserver.local");
				expect(upstream.server).toBe("myserver.local");
				expect(upstream.port).toBe(null);
			});
		});
	});

	describe("Error Handling", () => {
		it("should throw error when useUpstreams is used outside provider", () => {
			// Suppress console.error for this test since we expect an error
			const originalError = console.error;
			console.error = () => {};

			expect(() => {
				renderHook(() => useUpstreams());
			}).toThrow("useUpstreams must be used within an UpstreamsProvider");

			// Restore console.error
			console.error = originalError;
		});

		it("should handle API errors gracefully", async () => {
			const { loadCaddyfile } = await import("@/lib/api");

			vi.mocked(loadCaddyfile).mockResolvedValue({
				success: false,
				error: "Failed to load",
			});

			const { result } = renderHook(() => useUpstreams(), {
				wrapper: UpstreamsProvider,
			});

			await waitFor(() => {
				expect(result.current.loading).toBe(false);
			});

			// Should have empty upstreams and null error (since we still succeeded with empty list)
			expect(result.current.upstreams).toEqual([]);
		});
	});
});
