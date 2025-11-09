import * as React from "react";
import { Input } from "./input";

interface AutocompleteInputProps
	extends React.InputHTMLAttributes<HTMLInputElement> {
	suggestions?: string[];
}

const AutocompleteInput = React.forwardRef<
	HTMLInputElement,
	AutocompleteInputProps
>(({ suggestions = [], id, ...props }, ref) => {
	const listId = `${id}-autocomplete-list`;

	return (
		<>
			<Input ref={ref} id={id} list={listId} {...props} />
			<datalist id={listId}>
				{suggestions.map((suggestion) => (
					<option key={suggestion} value={suggestion} />
				))}
			</datalist>
		</>
	);
});

AutocompleteInput.displayName = "AutocompleteInput";

export { AutocompleteInput };
