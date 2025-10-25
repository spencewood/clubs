import type { Metadata } from "next";
import "./globals.css";

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
			<body className="antialiased">{children}</body>
		</html>
	);
}
