import { hoverTooltip } from "@codemirror/view";
import { DIRECTIVE_DOCS } from "./caddy-context-extractor";

/**
 * Create hover tooltip extension for Caddy directives
 * Shows documentation when hovering over known directives
 */
export function caddyHover() {
	return hoverTooltip((view, pos, _side) => {
		const { from, to, text } = view.state.doc.lineAt(pos);
		const line = text;

		// Find the word at cursor position
		let wordStart = pos;
		let wordEnd = pos;

		// Find word boundaries
		while (wordStart > from && /\w/.test(line[wordStart - from - 1])) {
			wordStart--;
		}
		while (wordEnd < to && /\w/.test(line[wordEnd - from])) {
			wordEnd++;
		}

		if (wordStart === wordEnd) {
			return null;
		}

		const word = view.state.doc.sliceString(wordStart, wordEnd);

		// Check if this is a known directive
		const doc = DIRECTIVE_DOCS[word];
		if (!doc) {
			return null;
		}

		// Build tooltip content
		const dom = document.createElement("div");
		dom.className = "cm-caddy-hover";

		const title = document.createElement("div");
		title.className = "cm-caddy-hover-title";
		title.textContent = `${word}${doc.params ? ` ${doc.params}` : ""}`;
		dom.appendChild(title);

		const description = document.createElement("div");
		description.className = "cm-caddy-hover-description";
		description.textContent = doc.description;
		dom.appendChild(description);

		if (doc.example) {
			const example = document.createElement("div");
			example.className = "cm-caddy-hover-example";
			example.textContent = `Example: ${doc.example}`;
			dom.appendChild(example);
		}

		return {
			pos: wordStart,
			end: wordEnd,
			above: true,
			create: () => {
				return { dom };
			},
		};
	});
}
