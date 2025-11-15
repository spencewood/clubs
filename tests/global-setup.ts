import { server } from "../src/test/server";

/**
 * Playwright global setup - starts MSW server for E2E tests
 * Auth is handled by real API routes with E2E_TEST mode (in-memory state)
 * MSW only mocks external services like Caddy API
 */
export default function globalSetup() {
	// Start MSW server before all tests (for Caddy API mocks)
	server.listen({ onUnhandledRequest: "warn" });
	console.log("✓ MSW server started for E2E tests");

	return () => {
		// Clean up after all tests complete
		server.close();
		console.log("✓ MSW server closed");
	};
}
