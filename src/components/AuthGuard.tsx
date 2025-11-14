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
	// Check if guest mode is enabled
	const guestMode = isGuestModeEnabled();

	// If guest mode is enabled, allow access
	if (guestMode) {
		return <>{children}</>;
	}

	// Guest mode is disabled - check authentication
	const user = await getCurrentUser();

	// Not authenticated - redirect to login
	if (!user) {
		redirect("/login");
	}

	// Authenticated - allow access
	return <>{children}</>;
}
