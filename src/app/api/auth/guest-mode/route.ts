import { type NextRequest, NextResponse } from "next/server";
import { clearAuthCookies, getCurrentUser } from "@/lib/auth";
import { deleteAllUsers, setSetting } from "@/lib/db";

/**
 * PUT /api/auth/guest-mode
 * Toggle guest mode on/off (requires authentication)
 */
export async function PUT(request: NextRequest) {
	try {
		// Must be authenticated to change guest mode setting
		const currentUser = await getCurrentUser();
		if (!currentUser) {
			return NextResponse.json(
				{ error: "Authentication required" },
				{ status: 401 },
			);
		}

		const body = (await request.json()) as { enabled: boolean };

		// Update guest mode setting
		setSetting("guest_mode_enabled", body.enabled ? "true" : "false");

		// If enabling guest mode, wipe all user data
		if (body.enabled) {
			// Delete all users (and their refresh tokens via CASCADE)
			deleteAllUsers();

			// Clear auth cookies (logs out current user)
			clearAuthCookies();
		}

		return NextResponse.json({
			success: true,
			guestModeEnabled: body.enabled,
		});
	} catch (error) {
		console.error("Guest mode toggle error:", error);
		return NextResponse.json(
			{ error: "An error occurred while updating guest mode" },
			{ status: 500 },
		);
	}
}
