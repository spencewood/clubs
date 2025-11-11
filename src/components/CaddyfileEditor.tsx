"use client";

import {
	HighlightStyle,
	StreamLanguage,
	syntaxHighlighting,
} from "@codemirror/language";
import { RangeSetBuilder } from "@codemirror/state";
import type { DecorationSet, PluginValue } from "@codemirror/view";
import {
	Decoration,
	EditorView,
	ViewPlugin,
	type ViewUpdate,
} from "@codemirror/view";
import { tags } from "@lezer/highlight";
import CodeMirror from "@uiw/react-codemirror";
import { useEffect, useMemo, useState } from "react";
import { getCaddyConfig } from "@/lib/api";
import {
	basicCaddyAutocomplete,
	caddyAutocomplete,
} from "@/lib/caddy-autocomplete";
import {
	type CaddyContext,
	extractCaddyContext,
} from "@/lib/caddy-context-extractor";
import { caddyHover } from "@/lib/caddy-hover";
import { caddyfile } from "@/lib/caddyfile-mode";
import type { CaddyJSONConfig } from "@/lib/server/caddy-api-client";

interface CaddyfileEditorProps {
	value: string;
	onChange: (value: string) => void;
	placeholder?: string;
	highlightLines?: { from: number; to: number } | null;
}

// Create line highlight decoration
const lineHighlightMark = Decoration.line({
	attributes: { class: "cm-highlight-hover-block" },
});

// Create a view plugin to highlight specific lines
function createHighlightPlugin(
	highlightRange: { from: number; to: number } | null,
) {
	class HighlightPlugin implements PluginValue {
		decorations: DecorationSet;

		constructor(view: EditorView) {
			this.decorations = this.buildDecorations(view);
		}

		update(update: ViewUpdate) {
			this.decorations = this.buildDecorations(update.view);
		}

		buildDecorations(view: EditorView): DecorationSet {
			if (!highlightRange) {
				return Decoration.none;
			}

			const builder = new RangeSetBuilder<Decoration>();
			const doc = view.state.doc;

			// Highlight lines from 'from' to 'to' (1-indexed)
			for (let line = highlightRange.from; line <= highlightRange.to; line++) {
				if (line > 0 && line <= doc.lines) {
					const lineObj = doc.line(line);
					builder.add(lineObj.from, lineObj.from, lineHighlightMark);
				}
			}

			return builder.finish();
		}
	}

	return ViewPlugin.fromClass(HighlightPlugin, {
		decorations: (v) => v.decorations,
	});
}

export function CaddyfileEditor({
	value,
	onChange,
	placeholder,
	highlightLines,
}: CaddyfileEditorProps) {
	// State for Caddy context (extracted from live config)
	const [caddyContext, setCaddyContext] = useState<CaddyContext | null>(null);

	// Fetch Caddy context on mount
	useEffect(() => {
		async function fetchContext() {
			try {
				const result = await getCaddyConfig();
				if (result.success && result.config) {
					const context = extractCaddyContext(result.config as CaddyJSONConfig);
					setCaddyContext(context);
				}
			} catch (error) {
				console.error("Failed to fetch Caddy context:", error);
				// Continue with basic autocomplete if fetch fails
			}
		}

		fetchContext();
	}, []);

	// Custom syntax highlighting - override comments only
	const customHighlighting = useMemo(
		() =>
			syntaxHighlighting(
				HighlightStyle.define([
					// Comments - muted gray
					{
						tag: tags.comment,
						color: "var(--color-muted-foreground)",
						fontStyle: "italic",
					},
					{
						tag: tags.lineComment,
						color: "var(--color-muted-foreground)",
						fontStyle: "italic",
					},
					{
						tag: tags.blockComment,
						color: "var(--color-muted-foreground)",
						fontStyle: "italic",
					},
					// Keywords - keep default colors
					{ tag: tags.keyword, color: "#0ea5e9" },
					{ tag: tags.controlKeyword, color: "#8b5cf6" },
					{ tag: tags.definitionKeyword, color: "#8b5cf6" },
					// Names
					{ tag: tags.variableName, color: "var(--color-foreground)" },
					{ tag: tags.propertyName, color: "#06b6d4" },
					// Literals
					{ tag: tags.string, color: "#10b981" }, // Green for paths and strings
					{ tag: tags.number, color: "#f59e0b" }, // Orange for numbers
					{ tag: tags.bool, color: "#f59e0b" },
					// Other
					{ tag: tags.operator, color: "var(--color-foreground)" },
					{ tag: tags.punctuation, color: "var(--color-foreground)" },
				]),
			),
		[],
	);

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
				// Syntax highlighting - comments
				".cmt-comment, .cmt-lineComment, .cmt-blockComment": {
					color: "var(--color-muted-foreground) !important",
					fontStyle: "italic",
				},
				// Hover highlight for site blocks
				".cm-highlight-hover-block": {
					borderLeft: "3px solid var(--color-primary)",
					paddingLeft: "4px",
				},
				// Autocomplete styling - matches Radix UI/shadcn patterns
				".cm-tooltip-autocomplete": {
					backgroundColor: "var(--color-popover)",
					color: "var(--color-popover-foreground)",
					border: "1px solid var(--color-border)",
					borderRadius: "calc(var(--radius) - 2px)", // rounded-md
					boxShadow:
						"0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)", // shadow-md
					fontFamily: "ui-monospace, monospace",
					fontSize: "0.875rem", // text-sm (14px)
					zIndex: "50",
				},
				".cm-tooltip-autocomplete > ul": {
					fontFamily: "ui-monospace, monospace",
					maxHeight: "300px",
					overflowY: "auto",
					overflowX: "hidden",
					padding: "0.25rem", // p-1
					scrollPaddingTop: "0.25rem",
					scrollPaddingBottom: "0.25rem",
				},
				".cm-tooltip-autocomplete > ul > li": {
					position: "relative",
					display: "flex",
					alignItems: "center",
					gap: "0.5rem", // gap-2
					paddingLeft: "0.5rem", // px-2
					paddingRight: "0.5rem",
					paddingTop: "0.375rem", // py-1.5
					paddingBottom: "0.375rem",
					fontSize: "0.875rem", // text-sm
					lineHeight: "1.25rem",
					borderRadius: "calc(var(--radius) - 4px)", // rounded-sm
					outline: "none",
					cursor: "default",
					userSelect: "none",
					transition: "background-color 150ms, color 150ms",
					color: "var(--color-popover-foreground)",
				},
				".cm-tooltip-autocomplete > ul > li[aria-selected]": {
					backgroundColor: "var(--color-accent)",
					color: "var(--color-accent-foreground)",
				},
				// Completion item parts
				".cm-completionLabel": {
					fontFamily: "ui-monospace, monospace",
					fontSize: "0.875rem", // text-sm
					color: "inherit",
				},
				".cm-completionDetail": {
					fontStyle: "normal",
					fontSize: "0.75rem", // text-xs
					color: "var(--color-muted-foreground)",
					marginLeft: "auto",
				},
				".cm-completionInfo": {
					padding: "1rem",
					backgroundColor: "var(--color-popover)",
					color: "var(--color-popover-foreground)",
					border: "1px solid var(--color-border)",
					borderRadius: "calc(var(--radius) - 2px)",
					fontSize: "0.75rem", // text-xs
					lineHeight: "1.5",
					maxWidth: "400px",
					boxShadow:
						"0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)", // shadow-md
					whiteSpace: "pre-wrap",
					zIndex: "50",
				},
				".cm-completionInfo.cm-completionInfo-left": {
					marginRight: "0.5rem",
				},
				".cm-completionInfo.cm-completionInfo-right": {
					marginLeft: "0.5rem",
				},
				// Hover tooltip styling - matches Radix UI/shadcn patterns
				".cm-caddy-hover": {
					padding: "1rem",
					backgroundColor: "var(--color-popover)",
					color: "var(--color-popover-foreground)",
					border: "1px solid var(--color-border)",
					borderRadius: "calc(var(--radius) - 2px)",
					maxWidth: "400px",
					boxShadow:
						"0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)", // shadow-md
					zIndex: "50",
				},
				".cm-caddy-hover-title": {
					fontFamily: "ui-monospace, monospace",
					fontWeight: "600",
					fontSize: "0.875rem", // text-sm
					marginBottom: "0.375rem",
					color: "inherit",
				},
				".cm-caddy-hover-description": {
					fontSize: "0.75rem", // text-xs
					lineHeight: "1.5",
					color: "var(--color-muted-foreground)",
					marginBottom: "0.375rem",
				},
				".cm-caddy-hover-example": {
					fontFamily: "ui-monospace, monospace",
					fontSize: "0.75rem", // text-xs
					padding: "0.25rem 0.375rem",
					backgroundColor: "var(--color-muted)",
					borderRadius: "calc(var(--radius) - 4px)",
					color: "inherit",
				},
			}),
		[],
	);

	return (
		<CodeMirror
			value={value}
			height="100%"
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
			extensions={[
				EditorView.lineWrapping,
				StreamLanguage.define(caddyfile),
				customHighlighting,
				createHighlightPlugin(highlightLines ?? null),
				theme,
				// Smart autocomplete with context (or basic fallback)
				caddyContext
					? caddyAutocomplete(caddyContext)
					: basicCaddyAutocomplete(),
				// Hover tooltips for directive documentation
				caddyHover(),
			]}
			indentWithTab={true}
		/>
	);
}
