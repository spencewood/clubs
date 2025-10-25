// Next.js instrumentation hook - runs once when the server starts
// https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation

export async function register() {
	// Only run MSW in development mode
	if (process.env.NODE_ENV === "development") {
		const { server } = await import("@/mocks/node");
		server.listen({
			onUnhandledRequest: "bypass", // Don't error on unhandled requests in dev
		});
		console.log("🔶 MSW enabled for development");
	}
}
