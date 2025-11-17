import { setupServer } from "msw/node";
import { handlers } from "../src/mocks/handlers";

/**
 * Playwright global setup - starts MSW server for E2E tests
 * Auth is handled by real API routes with E2E_TEST mode (in-memory state)
 * MSW only mocks external services like Caddy API
 */
export default function globalSetup() {
	// Filter out auth handlers - E2E tests use real Next.js API routes for auth
	// Only mock external services like Caddy API (localhost:2019)
	const e2eHandlers = handlers.filter(
		(handler) =>
			!handler.info.path?.includes("/api/auth") &&
			!handler.info.path?.includes("/api/certificates"),
	);

	const server = setupServer(...e2eHandlers);

	// Start MSW server before all tests (for Caddy API mocks only)
	server.listen({ onUnhandledRequest: "warn" });
	console.log("✓ MSW server started for E2E tests (Caddy API mocks only)");

	return () => {
		// Clean up after all tests complete
		server.close();
		console.log("✓ MSW server closed");
	};
}
