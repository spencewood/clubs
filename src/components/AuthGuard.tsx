import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { getCurrentUser } from "@/lib/auth";
import { isGuestModeEnabled } from "@/lib/db";

interface AuthGuardProps {
	children: ReactNode;
}

/**
 * Server component that guards routes requiring authentication
 * Redirects to login if guest mode is disabled and user is not authenticated
 */
export async function AuthGuard({ children }: AuthGuardProps) {
	// For E2E tests, use API to allow in-memory state
	if (process.env.E2E_TEST === "true") {
		const response = await fetch("http://localhost:3000/api/auth/status", {
			cache: "no-store",
		});
		const data = await response.json();

		if (data.guestModeEnabled) {
			return <>{children}</>;
		}

		if (!data.isAuthenticated) {
			redirect("/login");
		}

		return <>{children}</>;
	}

	// Production: use database directly (more efficient)
	const guestMode = isGuestModeEnabled();

	if (guestMode) {
		return <>{children}</>;
	}

	const user = await getCurrentUser();

	if (!user) {
		redirect("/login");
	}

	return <>{children}</>;
}
