"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface AutocompleteInputProps
	extends React.InputHTMLAttributes<HTMLInputElement> {
	suggestions?: string[];
}

const AutocompleteInput = React.forwardRef<
	HTMLInputElement,
	AutocompleteInputProps
>(({ suggestions = [], className, onFocus, onBlur, ...props }, ref) => {
	const [showSuggestions, setShowSuggestions] = React.useState(false);
	const [filteredSuggestions, setFilteredSuggestions] = React.useState<
		string[]
	>([]);
	const containerRef = React.useRef<HTMLDivElement>(null);

	// Update filtered suggestions when suggestions or value changes
	React.useEffect(() => {
		const inputValue = (props.value as string) || "";
		if (inputValue && suggestions.length > 0) {
			const filtered = suggestions.filter((suggestion) =>
				suggestion.toLowerCase().includes(inputValue.toLowerCase()),
			);
			setFilteredSuggestions(filtered);
			setShowSuggestions(filtered.length > 0);
		} else if (!inputValue && suggestions.length > 0) {
			// Show all suggestions when field is empty
			setFilteredSuggestions(suggestions);
			// Don't auto-show on empty, only on focus
		}
	}, [suggestions, props.value]);

	const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const value = e.target.value;
		if (value && suggestions.length > 0) {
			const filtered = suggestions.filter((suggestion) =>
				suggestion.toLowerCase().includes(value.toLowerCase()),
			);
			setFilteredSuggestions(filtered);
			setShowSuggestions(filtered.length > 0);
		} else if (!value && suggestions.length > 0) {
			setFilteredSuggestions(suggestions);
			setShowSuggestions(true);
		} else {
			setShowSuggestions(false);
		}
		props.onChange?.(e);
	};

	const handleSuggestionClick = (suggestion: string) => {
		const syntheticEvent = {
			target: { value: suggestion },
			currentTarget: { value: suggestion },
		} as React.ChangeEvent<HTMLInputElement>;
		props.onChange?.(syntheticEvent);
		setShowSuggestions(false);
	};

	const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
		const value = e.target.value;
		if (suggestions.length > 0) {
			if (value) {
				const filtered = suggestions.filter((suggestion) =>
					suggestion.toLowerCase().includes(value.toLowerCase()),
				);
				setFilteredSuggestions(filtered);
				setShowSuggestions(filtered.length > 0);
			} else {
				// Show all suggestions when focusing empty field
				setFilteredSuggestions(suggestions);
				setShowSuggestions(true);
			}
		}
		onFocus?.(e);
	};

	const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
		// Delay hiding to allow click on suggestion
		setTimeout(() => {
			setShowSuggestions(false);
		}, 200);
		onBlur?.(e);
	};

	return (
		<div ref={containerRef} className="relative">
			<Input
				ref={ref}
				className={className}
				onFocus={handleFocus}
				onBlur={handleBlur}
				onChange={handleInputChange}
				{...props}
			/>
			{showSuggestions && (
				<div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-md max-h-60 overflow-auto">
					{filteredSuggestions.map((suggestion) => (
						<button
							key={suggestion}
							type="button"
							onClick={() => handleSuggestionClick(suggestion)}
							className="w-full px-3 py-2 text-sm text-left hover:bg-accent hover:text-accent-foreground cursor-pointer"
						>
							{suggestion}
						</button>
					))}
				</div>
			)}
		</div>
	);
});

AutocompleteInput.displayName = "AutocompleteInput";

export { AutocompleteInput };
