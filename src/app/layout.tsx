import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { LeftPanelProvider } from "@/contexts/LeftPanelContext";

export const metadata: Metadata = {
	title: "Clubs - Caddy Configuration Manager",
	description: "A modern web UI for managing Caddy server configurations",
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="en" suppressHydrationWarning>
			<body className="antialiased">
				<ThemeProvider
					attribute="class"
					defaultTheme="system"
					enableSystem
					disableTransitionOnChange
				>
					<LeftPanelProvider>{children}</LeftPanelProvider>
					<Toaster position="top-right" richColors closeButton />
				</ThemeProvider>
			</body>
		</html>
	);
}
