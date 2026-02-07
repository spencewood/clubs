import { type NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import {
	getUserPreferences,
	type UserPreferences,
	updateUserPreferences,
} from "@/lib/db";

/**
 * GET /api/preferences
 * Get user preferences (requires authentication)
 */
export async function GET() {
	try {
		const currentUser = await getCurrentUser();
		if (!currentUser) {
			return NextResponse.json(
				{ error: "Authentication required" },
				{ status: 401 },
			);
		}

		const preferences = getUserPreferences(currentUser.id);

		return NextResponse.json({
			success: true,
			preferences,
		});
	} catch (error) {
		console.error("Get preferences error:", error);
		return NextResponse.json(
			{ error: "An error occurred while fetching preferences" },
			{ status: 500 },
		);
	}
}

/**
 * PUT /api/preferences
 * Update user preferences (requires authentication)
 */
export async function PUT(request: NextRequest) {
	try {
		const body = (await request.json()) as Partial<UserPreferences>;

		const currentUser = await getCurrentUser();
		if (!currentUser) {
			return NextResponse.json(
				{ error: "Authentication required" },
				{ status: 401 },
			);
		}

		updateUserPreferences(currentUser.id, body);

		return NextResponse.json({
			success: true,
		});
	} catch (error) {
		console.error("Update preferences error:", error);
		return NextResponse.json(
			{ error: "An error occurred while updating preferences" },
			{ status: 500 },
		);
	}
}
