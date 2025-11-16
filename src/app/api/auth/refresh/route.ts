import { cookies } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";
import {
	ACCESS_TOKEN_COOKIE,
	generateAccessToken,
	getUserById,
	REFRESH_TOKEN_COOKIE,
	verifyRefreshToken,
} from "@/lib/auth";

/**
 * POST /api/auth/refresh
 * Refresh endpoint - generates new access token using refresh token
 */
export async function POST(_request: NextRequest) {
	try {
		const cookieStore = await cookies();
		const refreshToken = cookieStore.get(REFRESH_TOKEN_COOKIE)?.value;

		if (!refreshToken) {
			return NextResponse.json(
				{ error: "Refresh token not found" },
				{ status: 401 },
			);
		}

		// Verify refresh token
		const userId = verifyRefreshToken(refreshToken);

		if (!userId) {
			return NextResponse.json(
				{ error: "Invalid or expired refresh token" },
				{ status: 401 },
			);
		}

		// Get user
		const user = getUserById(userId);

		if (!user) {
			return NextResponse.json({ error: "User not found" }, { status: 401 });
		}

		// Generate new access token
		const accessToken = generateAccessToken({
			userId: user.id,
			username: user.username,
		});

		// Set new access token cookie
		cookieStore.set(ACCESS_TOKEN_COOKIE, accessToken, {
			httpOnly: true,
			secure: process.env.NODE_ENV === "production",
			sameSite: "lax",
			maxAge: 15 * 60, // 15 minutes
			path: "/",
		});

		return NextResponse.json({
			success: true,
			user: {
				id: user.id,
				username: user.username,
			},
		});
	} catch (error) {
		console.error("Refresh error:", error);
		return NextResponse.json(
			{ error: "An error occurred during token refresh" },
			{ status: 500 },
		);
	}
}
