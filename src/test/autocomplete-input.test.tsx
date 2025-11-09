import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { AutocompleteInput } from "@/components/ui/autocomplete-input";

describe("AutocompleteInput", () => {
	const mockSuggestions = ["localhost", "example.com", "api.example.com"];

	describe("Rendering", () => {
		it("should render input field", () => {
			render(<AutocompleteInput suggestions={mockSuggestions} />);
			const input = screen.getByRole("textbox");
			expect(input).toBeInTheDocument();
		});

		it("should render with placeholder", () => {
			render(
				<AutocompleteInput
					suggestions={mockSuggestions}
					placeholder="Enter server"
				/>,
			);
			const input = screen.getByPlaceholderText("Enter server");
			expect(input).toBeInTheDocument();
		});

		it("should render with initial value", () => {
			render(
				<AutocompleteInput suggestions={mockSuggestions} value="localhost" />,
			);
			const input = screen.getByRole("textbox") as HTMLInputElement;
			expect(input.value).toBe("localhost");
		});

		it("should not show suggestions initially", () => {
			render(<AutocompleteInput suggestions={mockSuggestions} />);
			const suggestionButtons = screen.queryAllByRole("button");
			expect(suggestionButtons).toHaveLength(0);
		});
	});

	describe("Focus Behavior", () => {
		it("should show all suggestions when empty field is focused", async () => {
			const user = userEvent.setup();
			render(<AutocompleteInput suggestions={mockSuggestions} value="" />);

			const input = screen.getByRole("textbox");
			await user.click(input);

			await waitFor(() => {
				const suggestionButtons = screen.getAllByRole("button");
				expect(suggestionButtons).toHaveLength(mockSuggestions.length);
			});

			for (const suggestion of mockSuggestions) {
				expect(screen.getByText(suggestion)).toBeInTheDocument();
			}
		});

		it("should show filtered suggestions when field with value is focused", async () => {
			const user = userEvent.setup();
			render(<AutocompleteInput suggestions={mockSuggestions} value="local" />);

			const input = screen.getByRole("textbox");
			await user.click(input);

			await waitFor(() => {
				expect(screen.getByText("localhost")).toBeInTheDocument();
			});

			expect(screen.queryByText("example.com")).not.toBeInTheDocument();
			expect(screen.queryByText("api.example.com")).not.toBeInTheDocument();
		});

		it("should hide suggestions on blur", async () => {
			const user = userEvent.setup();
			render(<AutocompleteInput suggestions={mockSuggestions} value="" />);

			const input = screen.getByRole("textbox");
			await user.click(input);

			await waitFor(() => {
				expect(screen.getByText("localhost")).toBeInTheDocument();
			});

			await user.click(document.body);

			await waitFor(() => {
				expect(screen.queryByText("localhost")).not.toBeInTheDocument();
			});
		});
	});

	describe("Filtering", () => {
		it("should filter suggestions based on input (case-insensitive)", async () => {
			const user = userEvent.setup();
			render(<AutocompleteInput suggestions={mockSuggestions} value="LOCAL" />);

			const input = screen.getByRole("textbox");
			await user.click(input);

			await waitFor(() => {
				expect(screen.getByText("localhost")).toBeInTheDocument();
			});

			expect(screen.queryByText("example.com")).not.toBeInTheDocument();
			expect(screen.queryByText("api.example.com")).not.toBeInTheDocument();
		});

		it("should show suggestions matching partial input", async () => {
			const user = userEvent.setup();
			render(<AutocompleteInput suggestions={mockSuggestions} value="" />);

			const input = screen.getByRole("textbox");
			await user.type(input, "example");

			await waitFor(() => {
				expect(screen.getByText("example.com")).toBeInTheDocument();
				expect(screen.getByText("api.example.com")).toBeInTheDocument();
			});

			expect(screen.queryByText("localhost")).not.toBeInTheDocument();
		});

		it("should show no suggestions when no match found", async () => {
			const user = userEvent.setup();
			render(
				<AutocompleteInput suggestions={mockSuggestions} value="nomatch" />,
			);

			const input = screen.getByRole("textbox");
			await user.click(input);

			// Should not show any suggestions since "nomatch" doesn't match any suggestions
			await waitFor(
				() => {
					const suggestionButtons = screen.queryAllByRole("button");
					expect(suggestionButtons).toHaveLength(0);
				},
				{ timeout: 500 },
			);
		});

		it("should update filtered suggestions when input changes", async () => {
			const user = userEvent.setup();
			render(<AutocompleteInput suggestions={mockSuggestions} value="" />);

			const input = screen.getByRole("textbox");

			// Type "local" - should show localhost
			await user.type(input, "local");
			await waitFor(() => {
				expect(screen.getByText("localhost")).toBeInTheDocument();
			});

			// Clear and type "example" - should show example.com and api.example.com
			await user.clear(input);
			await user.type(input, "example");
			await waitFor(() => {
				expect(screen.getByText("example.com")).toBeInTheDocument();
				expect(screen.getByText("api.example.com")).toBeInTheDocument();
			});
		});
	});

	describe("Suggestion Selection", () => {
		it("should call onChange when suggestion is clicked", async () => {
			const user = userEvent.setup();
			const onChange = vi.fn();
			render(
				<AutocompleteInput
					suggestions={mockSuggestions}
					value=""
					onChange={onChange}
				/>,
			);

			const input = screen.getByRole("textbox");
			await user.click(input);

			await waitFor(() => {
				expect(screen.getByText("localhost")).toBeInTheDocument();
			});

			const suggestion = screen.getByText("localhost");
			await user.click(suggestion);

			expect(onChange).toHaveBeenCalledWith(
				expect.objectContaining({
					target: expect.objectContaining({ value: "localhost" }),
				}),
			);
		});

		it("should hide suggestions after selection", async () => {
			const user = userEvent.setup();
			render(<AutocompleteInput suggestions={mockSuggestions} value="" />);

			const input = screen.getByRole("textbox");
			await user.click(input);

			await waitFor(() => {
				expect(screen.getByText("localhost")).toBeInTheDocument();
			});

			const suggestion = screen.getByText("localhost");
			await user.click(suggestion);

			await waitFor(() => {
				expect(screen.queryByText("localhost")).not.toBeInTheDocument();
			});
		});
	});

	describe("Free-form Input", () => {
		it("should allow typing custom values not in suggestions", async () => {
			const user = userEvent.setup();
			const onChange = vi.fn();
			render(
				<AutocompleteInput
					suggestions={mockSuggestions}
					value=""
					onChange={onChange}
				/>,
			);

			const input = screen.getByRole("textbox");
			await user.type(input, "custom");

			// Should have called onChange for each character typed
			expect(onChange).toHaveBeenCalled();
			expect(onChange.mock.calls.length).toBeGreaterThan(0);

			// Verify that onChange was called with synthetic events containing typed characters
			const calls = onChange.mock.calls;
			expect(calls.length).toBeGreaterThan(0);
			// Each call should be a ChangeEvent
			for (const call of calls) {
				expect(call[0]).toHaveProperty("target");
			}
		});

		it("should not restrict input to suggestions only", async () => {
			const user = userEvent.setup();
			const onChange = vi.fn();
			render(
				<AutocompleteInput
					suggestions={mockSuggestions}
					value=""
					onChange={onChange}
				/>,
			);

			const input = screen.getByRole("textbox");
			const customValue = "192.168.1.1:8080";
			await user.type(input, customValue);

			// Should have called onChange for each character
			expect(onChange).toHaveBeenCalled();
			expect(onChange.mock.calls.length).toBeGreaterThan(0);
		});
	});

	describe("Edge Cases", () => {
		it("should handle empty suggestions array", async () => {
			const user = userEvent.setup();
			render(<AutocompleteInput suggestions={[]} value="" />);

			const input = screen.getByRole("textbox");
			await user.type(input, "test");

			const suggestionButtons = screen.queryAllByRole("button");
			expect(suggestionButtons).toHaveLength(0);
		});

		it("should handle undefined suggestions", async () => {
			const user = userEvent.setup();
			render(<AutocompleteInput value="" />);

			const input = screen.getByRole("textbox");
			await user.type(input, "test");

			const suggestionButtons = screen.queryAllByRole("button");
			expect(suggestionButtons).toHaveLength(0);
		});

		it("should update suggestions when suggestions prop changes", async () => {
			const { rerender } = render(
				<AutocompleteInput suggestions={["localhost"]} value="" />,
			);

			const input = screen.getByRole("textbox");
			await userEvent.setup().click(input);

			await waitFor(() => {
				expect(screen.getByText("localhost")).toBeInTheDocument();
			});

			// Update suggestions
			rerender(
				<AutocompleteInput
					suggestions={["newserver.com", "another.com"]}
					value=""
				/>,
			);

			await waitFor(() => {
				expect(screen.queryByText("localhost")).not.toBeInTheDocument();
			});
		});

		it("should work with duplicate suggestions", async () => {
			const user = userEvent.setup();
			const duplicateSuggestions = ["localhost", "localhost", "example.com"];
			render(<AutocompleteInput suggestions={duplicateSuggestions} value="" />);

			const input = screen.getByRole("textbox");
			await user.click(input);

			await waitFor(() => {
				// Should show each unique suggestion once (due to key={suggestion})
				const localhostButtons = screen.getAllByText("localhost");
				// React will handle duplicates, but we should have at least one
				expect(localhostButtons.length).toBeGreaterThan(0);
			});
		});
	});

	describe("Accessibility", () => {
		it("should be accessible via keyboard", async () => {
			const user = userEvent.setup();
			render(<AutocompleteInput suggestions={mockSuggestions} value="" />);

			const input = screen.getByRole("textbox");

			// Tab to focus
			await user.tab();
			expect(input).toHaveFocus();

			// Should show suggestions on focus
			await waitFor(() => {
				expect(screen.getByText("localhost")).toBeInTheDocument();
			});
		});

		it("should forward ref correctly", () => {
			const ref = vi.fn();
			render(<AutocompleteInput ref={ref} suggestions={mockSuggestions} />);

			expect(ref).toHaveBeenCalled();
		});

		it("should support disabled state", () => {
			render(<AutocompleteInput suggestions={mockSuggestions} disabled />);

			const input = screen.getByRole("textbox") as HTMLInputElement;
			expect(input.disabled).toBe(true);
		});

		it("should support readonly state", () => {
			render(<AutocompleteInput suggestions={mockSuggestions} readOnly />);

			const input = screen.getByRole("textbox") as HTMLInputElement;
			expect(input.readOnly).toBe(true);
		});
	});

	describe("Custom Event Handlers", () => {
		it("should call custom onFocus handler", async () => {
			const user = userEvent.setup();
			const onFocus = vi.fn();
			render(
				<AutocompleteInput
					suggestions={mockSuggestions}
					value=""
					onFocus={onFocus}
				/>,
			);

			const input = screen.getByRole("textbox");
			await user.click(input);

			expect(onFocus).toHaveBeenCalled();
		});

		it("should call custom onBlur handler", async () => {
			const user = userEvent.setup();
			const onBlur = vi.fn();
			render(
				<AutocompleteInput
					suggestions={mockSuggestions}
					value=""
					onBlur={onBlur}
				/>,
			);

			const input = screen.getByRole("textbox");
			await user.click(input);
			await user.click(document.body);

			// Wait for the setTimeout in handleBlur
			await waitFor(() => {
				expect(onBlur).toHaveBeenCalled();
			});
		});

		it("should call custom onChange handler", async () => {
			const user = userEvent.setup();
			const onChange = vi.fn();
			render(
				<AutocompleteInput
					suggestions={mockSuggestions}
					value=""
					onChange={onChange}
				/>,
			);

			const input = screen.getByRole("textbox");
			await user.type(input, "test");

			expect(onChange).toHaveBeenCalled();
		});
	});
});
