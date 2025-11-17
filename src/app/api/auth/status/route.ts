import { type NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { isGuestModeEnabled } from "@/lib/db";

// In-memory state for E2E tests
let testState = {
	users: [] as Array<{ id: string; username: string; password: string }>,
	currentUser: null as {
		id: string;
		username: string;
		password: string;
	} | null,
};

export function getTestState() {
	return testState;
}

export function resetTestState() {
	testState = {
		users: [],
		currentUser: null,
	};
}

/**
 * GET /api/auth/status
 * Status endpoint - returns guest mode status and current user info
 */
export async function GET(_request: NextRequest) {
	try {
		// Use in-memory state for E2E tests
		if (process.env.E2E_TEST === "true") {
			return NextResponse.json({
				guestModeEnabled: testState.users.length === 0,
				isAuthenticated: testState.currentUser !== null,
				user: testState.currentUser
					? {
							id: testState.currentUser.id,
							username: testState.currentUser.username,
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
