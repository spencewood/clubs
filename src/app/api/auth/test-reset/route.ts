import { NextResponse } from "next/server";

/**
 * Test helper endpoint to reset MSW mock auth state
 * Only available during E2E tests
 *
 * Note: This route is actually handled by MSW in E2E mode (see handlers.ts),
 * but we keep this file for type safety and documentation
 */
export async function POST() {
	// In E2E mode, MSW intercepts this request and resets mock auth state
	// This code path is only reached if MSW is not running
	return NextResponse.json({
		error: "MSW should handle this endpoint in E2E mode"
	}, { status: 500 });
}
