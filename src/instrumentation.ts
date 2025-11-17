// Next.js instrumentation hook - runs once when the server starts
// https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation

export async function register() {
	// Enable MSW for development and E2E tests
	if (
		process.env.NODE_ENV === "development" ||
		process.env.E2E_TEST === "true"
	) {
		const { server } = await import("@/mocks/node");
		server.listen({ onUnhandledRequest: "bypass" });
		const context =
			process.env.E2E_TEST === "true" ? "E2E tests" : "development";
		console.log(`🔶 MSW enabled in Next.js server for ${context}`);
	}
}
