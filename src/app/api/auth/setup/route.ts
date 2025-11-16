import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createUser, hasUsers, setAuthCookies } from "@/lib/auth";
import { setSetting } from "@/lib/db";

// Validation schema
const setupSchema = z
	.object({
		username: z
			.string()
			.min(3, "Username must be at least 3 characters")
			.max(50, "Username must be at most 50 characters"),
		password: z
			.string()
			.min(8, "Password must be at least 8 characters")
			.max(100, "Password must be at most 100 characters"),
		confirmPassword: z.string(),
	})
	.refine((data) => data.password === data.confirmPassword, {
		message: "Passwords do not match",
		path: ["confirmPassword"],
	});

/**
 * POST /api/auth/setup
 * Initial setup endpoint - creates first user and disables guest mode
 */
export async function POST(request: NextRequest) {
	try {
		// Check if users already exist
		if (hasUsers()) {
			return NextResponse.json(
				{ error: "Setup has already been completed" },
				{ status: 400 },
			);
		}

		// Parse and validate request body
		const body = await request.json();
		const validation = setupSchema.safeParse(body);

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

		// Create the first user
		const user = await createUser(username, password);

		// Disable guest mode
		setSetting("guest_mode_enabled", "false");

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
		console.error("Setup error:", error);
		return NextResponse.json(
			{ error: "An error occurred during setup" },
			{ status: 500 },
		);
	}
}
