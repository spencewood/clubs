import { type NextRequest, NextResponse } from "next/server";
import { clearAuthCookies } from "@/lib/auth";

/**
 * POST /api/auth/logout
 * Logout endpoint - clears auth cookies and invalidates refresh token
 */
export async function POST(_request: NextRequest) {
	try {
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
