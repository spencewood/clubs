// Next.js instrumentation hook - runs once when the server starts
// https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation

export async function register() {
	// Enable MSW for E2E tests only
	// Production uses real API routes and database
	if (process.env.E2E_TEST === "true") {
		const { server } = await import("@/mocks/node");
		server.listen({ onUnhandledRequest: "bypass" });
		console.log("🔶 MSW enabled in Next.js server for E2E tests");
	}
}
