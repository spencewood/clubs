import { NextResponse } from "next/server";

/**
 * Test helper endpoint to reset test auth state
 * Only available during E2E tests
 */
export async function POST() {
	if (process.env.E2E_TEST === "true") {
		const { resetTestState } = await import("../status/route");
		resetTestState();
		return NextResponse.json({ success: true });
	}

	return NextResponse.json({ error: "Not available" }, { status: 404 });
}
