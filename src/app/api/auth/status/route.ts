import { type NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { isGuestModeEnabled } from "@/lib/db";
import { getMockAuthState } from "@/mocks/handlers";

// Export function for SSR to access MSW mock auth state
export function getTestState() {
	return getMockAuthState();
}

/**
 * GET /api/auth/status
 * Status endpoint - returns guest mode status and current user info
 */
export async function GET(_request: NextRequest) {
	try {
		// Use in-memory MSW mock state for E2E tests
		if (process.env.E2E_TEST === "true") {
			const mockState = getMockAuthState();
			return NextResponse.json({
				guestModeEnabled: mockState.users.length === 0,
				isAuthenticated: mockState.currentUser !== null,
				user: mockState.currentUser
					? {
							id: mockState.currentUser.id,
							username: mockState.currentUser.username,
						}
					: null,
			});
		}

		const guestModeEnabled = isGuestModeEnabled();
		const currentUser = await getCurrentUser();

		return NextResponse.json({
			guestModeEnabled,
			isAuthenticated: !!currentUser,
			user: currentUser
				? {
						id: currentUser.id,
						username: currentUser.username,
					}
				: null,
		});
	} catch (error) {
		console.error("Status error:", error);
		return NextResponse.json(
			{ error: "An error occurred while fetching status" },
			{ status: 500 },
		);
	}
}
