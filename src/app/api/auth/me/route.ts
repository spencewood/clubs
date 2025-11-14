import { type NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";

/**
 * GET /api/auth/me
 * Me endpoint - returns current authenticated user info
 */
export async function GET(_request: NextRequest) {
	try {
		const currentUser = await getCurrentUser();

		if (!currentUser) {
			return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
		}

		return NextResponse.json({
			user: {
				id: currentUser.id,
				username: currentUser.username,
				created_at: currentUser.created_at,
			},
		});
	} catch (error) {
		console.error("Me error:", error);
		return NextResponse.json(
			{ error: "An error occurred while fetching user info" },
			{ status: 500 },
		);
	}
}
