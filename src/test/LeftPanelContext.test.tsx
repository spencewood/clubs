import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { LeftPanelProvider, useLeftPanel } from "@/contexts/LeftPanelContext";

describe("LeftPanelContext", () => {
	describe("Provider", () => {
		it("should provide initial state as collapsed (false)", () => {
			const { result } = renderHook(() => useLeftPanel(), {
				wrapper: LeftPanelProvider,
			});

			expect(result.current.leftPanelExpanded).toBe(false);
		});

		it("should provide setLeftPanelExpanded function", () => {
			const { result } = renderHook(() => useLeftPanel(), {
				wrapper: LeftPanelProvider,
			});

			expect(typeof result.current.setLeftPanelExpanded).toBe("function");
		});

		it("should provide toggleLeftPanel function", () => {
			const { result } = renderHook(() => useLeftPanel(), {
				wrapper: LeftPanelProvider,
			});

			expect(typeof result.current.toggleLeftPanel).toBe("function");
		});
	});

	describe("setLeftPanelExpanded", () => {
		it("should update expanded state to true", () => {
			const { result } = renderHook(() => useLeftPanel(), {
				wrapper: LeftPanelProvider,
			});

			act(() => {
				result.current.setLeftPanelExpanded(true);
			});

			expect(result.current.leftPanelExpanded).toBe(true);
		});

		it("should update expanded state to false", () => {
			const { result } = renderHook(() => useLeftPanel(), {
				wrapper: LeftPanelProvider,
			});

			// First expand
			act(() => {
				result.current.setLeftPanelExpanded(true);
			});

			// Then collapse
			act(() => {
				result.current.setLeftPanelExpanded(false);
			});

			expect(result.current.leftPanelExpanded).toBe(false);
		});

		it("should handle multiple state updates", () => {
			const { result } = renderHook(() => useLeftPanel(), {
				wrapper: LeftPanelProvider,
			});

			act(() => {
				result.current.setLeftPanelExpanded(true);
			});
			expect(result.current.leftPanelExpanded).toBe(true);

			act(() => {
				result.current.setLeftPanelExpanded(false);
			});
			expect(result.current.leftPanelExpanded).toBe(false);

			act(() => {
				result.current.setLeftPanelExpanded(true);
			});
			expect(result.current.leftPanelExpanded).toBe(true);
		});
	});

	describe("toggleLeftPanel", () => {
		it("should toggle from false to true", () => {
			const { result } = renderHook(() => useLeftPanel(), {
				wrapper: LeftPanelProvider,
			});

			act(() => {
				result.current.toggleLeftPanel();
			});

			expect(result.current.leftPanelExpanded).toBe(true);
		});

		it("should toggle from true to false", () => {
			const { result } = renderHook(() => useLeftPanel(), {
				wrapper: LeftPanelProvider,
			});

			// First expand
			act(() => {
				result.current.setLeftPanelExpanded(true);
			});

			// Then toggle
			act(() => {
				result.current.toggleLeftPanel();
			});

			expect(result.current.leftPanelExpanded).toBe(false);
		});

		it("should toggle multiple times correctly", () => {
			const { result } = renderHook(() => useLeftPanel(), {
				wrapper: LeftPanelProvider,
			});

			// Toggle 1: false -> true
			act(() => {
				result.current.toggleLeftPanel();
			});
			expect(result.current.leftPanelExpanded).toBe(true);

			// Toggle 2: true -> false
			act(() => {
				result.current.toggleLeftPanel();
			});
			expect(result.current.leftPanelExpanded).toBe(false);

			// Toggle 3: false -> true
			act(() => {
				result.current.toggleLeftPanel();
			});
			expect(result.current.leftPanelExpanded).toBe(true);
		});
	});

	describe("Error Handling", () => {
		it("should throw error when useLeftPanel is used outside provider", () => {
			// Suppress console.error for this test since we expect an error
			const originalError = console.error;
			console.error = () => {};

			expect(() => {
				renderHook(() => useLeftPanel());
			}).toThrow("useLeftPanel must be used within a LeftPanelProvider");

			// Restore console.error
			console.error = originalError;
		});
	});

	describe("State Persistence Across Re-renders", () => {
		it("should maintain state across component re-renders", () => {
			const { result, rerender } = renderHook(() => useLeftPanel(), {
				wrapper: LeftPanelProvider,
			});

			// Set state
			act(() => {
				result.current.setLeftPanelExpanded(true);
			});
			expect(result.current.leftPanelExpanded).toBe(true);

			// Force re-render
			rerender();

			// State should persist
			expect(result.current.leftPanelExpanded).toBe(true);
		});

		it("should maintain state when toggling after re-renders", () => {
			const { result, rerender } = renderHook(() => useLeftPanel(), {
				wrapper: LeftPanelProvider,
			});

			// Toggle and re-render multiple times
			act(() => {
				result.current.toggleLeftPanel();
			});
			rerender();
			expect(result.current.leftPanelExpanded).toBe(true);

			act(() => {
				result.current.toggleLeftPanel();
			});
			rerender();
			expect(result.current.leftPanelExpanded).toBe(false);
		});
	});

	describe("Multiple Consumers", () => {
		it("should provide independent state for each provider instance", () => {
			const { result: result1 } = renderHook(() => useLeftPanel(), {
				wrapper: LeftPanelProvider,
			});
			const { result: result2 } = renderHook(() => useLeftPanel(), {
				wrapper: LeftPanelProvider,
			});

			// Both should start with false
			expect(result1.current.leftPanelExpanded).toBe(false);
			expect(result2.current.leftPanelExpanded).toBe(false);

			// Update from first hook
			act(() => {
				result1.current.setLeftPanelExpanded(true);
			});

			// Each provider instance maintains its own state
			expect(result1.current.leftPanelExpanded).toBe(true);
			expect(result2.current.leftPanelExpanded).toBe(false);

			// Update from second hook
			act(() => {
				result2.current.setLeftPanelExpanded(true);
			});

			// Both are now true independently
			expect(result1.current.leftPanelExpanded).toBe(true);
			expect(result2.current.leftPanelExpanded).toBe(true);
		});
	});
});
