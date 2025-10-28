import type { Metadata } from "next";
import "./globals.css";
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
				<LeftPanelProvider>{children}</LeftPanelProvider>
			</body>
		</html>
	);
}
