import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getUserByUsername, setAuthCookies, verifyPassword } from "@/lib/auth";

// Validation schema
const loginSchema = z.object({
	username: z.string().min(1, "Username is required"),
	password: z.string().min(1, "Password is required"),
});

/**
 * POST /api/auth/login
 * Login endpoint - authenticates user and sets cookies
 */
export async function POST(request: NextRequest) {
	try {
		// Parse and validate request body
		const body = await request.json();
		const validation = loginSchema.safeParse(body);

		if (!validation.success) {
			return NextResponse.json(
				{
					error: "Validation failed",
					details: validation.error.issues,
				},
				{ status: 400 },
			);
		}

		const { username, password } = validation.data;

		// Get user by username
		const user = getUserByUsername(username);

		if (!user) {
			return NextResponse.json(
				{ error: "Invalid username or password" },
				{ status: 401 },
			);
		}

		// Verify password
		const isValid = await verifyPassword(password, user.password_hash);

		if (!isValid) {
			return NextResponse.json(
				{ error: "Invalid username or password" },
				{ status: 401 },
			);
		}

		// Set auth cookies
		await setAuthCookies(user.id, user.username);

		return NextResponse.json({
			success: true,
			user: {
				id: user.id,
				username: user.username,
			},
		});
	} catch (error) {
		console.error("Login error:", error);
		return NextResponse.json(
			{ error: "An error occurred during login" },
			{ status: 500 },
		);
	}
}
