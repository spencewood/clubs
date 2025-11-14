import { type NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { isGuestModeEnabled } from "@/lib/db";

/**
 * GET /api/auth/status
 * Status endpoint - returns guest mode status and current user info
 */
export async function GET(_request: NextRequest) {
	try {
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
