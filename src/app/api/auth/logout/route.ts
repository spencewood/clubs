import { type NextRequest, NextResponse } from "next/server";
import { clearAuthCookies } from "@/lib/auth";

/**
 * POST /api/auth/logout
 * Logout endpoint - clears auth cookies and invalidates refresh token
 */
export async function POST(_request: NextRequest) {
	try {
		// Use in-memory state for E2E tests
		if (process.env.E2E_TEST === "true") {
			const { getTestState } = await import("../status/route");
			const testState = getTestState();
			testState.currentUser = null;

			return NextResponse.json({
				success: true,
				message: "Logged out successfully",
			});
		}

		// Clear auth cookies (also deletes refresh token from database)
		await clearAuthCookies();

		return NextResponse.json({
			success: true,
			message: "Logged out successfully",
		});
	} catch (error) {
		console.error("Logout error:", error);
		return NextResponse.json(
			{ error: "An error occurred during logout" },
			{ status: 500 },
		);
	}
}
