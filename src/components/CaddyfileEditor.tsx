import { EditorView } from "@codemirror/view";
import CodeMirror from "@uiw/react-codemirror";
import { useMemo } from "react";

interface CaddyfileEditorProps {
	value: string;
	onChange: (value: string) => void;
	placeholder?: string;
}

export function CaddyfileEditor({
	value,
	onChange,
	placeholder,
}: CaddyfileEditorProps) {
	// Create theme that uses CSS variables - will update when theme changes
	const theme = useMemo(
		() =>
			EditorView.theme({
				"&": {
					fontSize: "14px",
					fontFamily: "ui-monospace, monospace",
					backgroundColor: "var(--color-background)",
					color: "var(--color-foreground)",
				},
				".cm-scroller": {
					backgroundColor: "var(--color-background)",
				},
				".cm-content": {
					caretColor: "var(--color-primary)",
					backgroundColor: "var(--color-background)",
				},
				// Block cursor styling
				".cm-cursor, .cm-dropCursor": {
					borderLeft: "none !important",
					width: "0.6em !important",
					backgroundColor: "var(--color-primary) !important",
					opacity: "0.8",
				},
				"&.cm-focused .cm-cursor": {
					opacity: "1 !important",
				},
				// Selection - green highlighting (works with drawSelection: false)
				"::selection": {
					backgroundColor: "rgba(34, 197, 94, 0.3)",
				},
				".cm-activeLine": {
					backgroundColor: "hsl(142.1 76.2% 36.3% / 0.1)", // Green with low opacity
				},
				".cm-activeLineGutter": {
					backgroundColor: "hsl(142.1 76.2% 36.3% / 0.1)", // Match active line
					color: "hsl(142.1 76.2% 36.3%)", // Green text for active line number
				},
				".cm-gutters": {
					backgroundColor: "var(--color-muted)",
					color: "var(--color-muted-foreground)",
					border: "none",
				},
				".cm-lineNumbers .cm-gutterElement": {
					color: "var(--color-muted-foreground)",
				},
				".cm-line": {
					color: "var(--color-muted-foreground)",
				},
			}),
		[],
	);

	return (
		<CodeMirror
			value={value}
			height="calc(100vh - 250px)"
			placeholder={placeholder}
			onChange={onChange}
			basicSetup={{
				lineNumbers: true,
				highlightActiveLineGutter: false,
				highlightSpecialChars: true,
				foldGutter: true,
				drawSelection: false,
				dropCursor: true,
				allowMultipleSelections: true,
				indentOnInput: true,
				syntaxHighlighting: true,
				bracketMatching: true,
				closeBrackets: true,
				autocompletion: true,
				rectangularSelection: true,
				crosshairCursor: true,
				highlightActiveLine: false,
				highlightSelectionMatches: false,
				closeBracketsKeymap: true,
				searchKeymap: true,
				foldKeymap: true,
				completionKeymap: true,
				lintKeymap: true,
			}}
			extensions={[EditorView.lineWrapping, theme]}
			indentWithTab={true}
		/>
	);
}
