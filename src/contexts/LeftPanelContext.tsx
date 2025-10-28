"use client";

import React, {
	createContext,
	type ReactNode,
	useContext,
	useState,
} from "react";

interface LeftPanelContextType {
	leftPanelExpanded: boolean;
	setLeftPanelExpanded: (expanded: boolean) => void;
	toggleLeftPanel: () => void;
}

const LeftPanelContext = createContext<LeftPanelContextType | undefined>(
	undefined,
);

export function LeftPanelProvider({ children }: { children: ReactNode }) {
	const [leftPanelExpanded, setLeftPanelExpanded] = useState(false);

	const toggleLeftPanel = () => {
		setLeftPanelExpanded((prev) => !prev);
	};

	return (
		<LeftPanelContext.Provider
			value={{ leftPanelExpanded, setLeftPanelExpanded, toggleLeftPanel }}
		>
			{children}
		</LeftPanelContext.Provider>
	);
}

export function useLeftPanel() {
	const context = useContext(LeftPanelContext);
	if (context === undefined) {
		throw new Error("useLeftPanel must be used within a LeftPanelProvider");
	}
	return context;
}
