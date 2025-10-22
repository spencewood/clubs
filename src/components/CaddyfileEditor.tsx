import { EditorView } from "@codemirror/view";
import CodeMirror from "@uiw/react-codemirror";

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
	return (
		<CodeMirror
			value={value}
			height="600px"
			placeholder={placeholder}
			onChange={onChange}
			basicSetup={{
				lineNumbers: true,
				highlightActiveLineGutter: true,
				highlightSpecialChars: true,
				foldGutter: true,
				drawSelection: true,
				dropCursor: true,
				allowMultipleSelections: true,
				indentOnInput: true,
				syntaxHighlighting: true,
				bracketMatching: true,
				closeBrackets: true,
				autocompletion: true,
				rectangularSelection: true,
				crosshairCursor: true,
				highlightActiveLine: true,
				highlightSelectionMatches: true,
				closeBracketsKeymap: true,
				searchKeymap: true,
				foldKeymap: true,
				completionKeymap: true,
				lintKeymap: true,
			}}
			extensions={[
				EditorView.lineWrapping,
				EditorView.theme({
					"&": {
						fontSize: "14px",
						fontFamily: "ui-monospace, monospace",
						backgroundColor: "hsl(var(--background))",
					},
					".cm-content": {
						caretColor: "hsl(var(--primary))",
					},
					"&.cm-focused .cm-cursor": {
						borderLeftColor: "hsl(var(--primary))",
					},
					".cm-activeLine": {
						backgroundColor: "hsl(142.1 76.2% 36.3% / 0.1)", // Green with low opacity
					},
					".cm-activeLineGutter": {
						backgroundColor: "hsl(142.1 76.2% 36.3% / 0.1)", // Match active line
						color: "hsl(142.1 76.2% 36.3%)", // Green text for active line number
					},
					".cm-gutters": {
						backgroundColor: "hsl(var(--muted))",
						color: "hsl(var(--muted-foreground))",
						border: "none",
					},
					".cm-lineNumbers .cm-gutterElement": {
						color: "hsl(var(--muted-foreground))",
					},
				}),
			]}
			indentWithTab={true}
		/>
	);
}
