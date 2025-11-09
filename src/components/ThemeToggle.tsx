"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

export function ThemeToggle() {
	const { theme, setTheme, resolvedTheme } = useTheme();
	const [mounted, setMounted] = useState(false);

	// Only render after mounting to avoid hydration mismatch
	useEffect(() => {
		setMounted(true);
	}, []);

	if (!mounted) {
		return (
			<Button variant="ghost" size="icon" disabled>
				<Sun className="h-5 w-5" />
			</Button>
		);
	}

	const toggleTheme = () => {
		const currentTheme = theme === "system" ? resolvedTheme : theme;
		const newTheme = currentTheme === "light" ? "dark" : "light";
		setTheme(newTheme);
	};

	// Use resolvedTheme to show the correct icon
	const isDark = (theme === "system" ? resolvedTheme : theme) === "dark";

	return (
		<Button
			variant="ghost"
			size="icon"
			onClick={toggleTheme}
			title={isDark ? "Switch to light mode" : "Switch to dark mode"}
		>
			{isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
		</Button>
	);
}
