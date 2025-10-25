import { CaddyDashboard } from "@/components/CaddyDashboard";
import { getInitialPageData } from "@/lib/server/data";

/**
 * Main page - Server Component
 * Fetches all initial data on the server, eliminating the loading screen
 */
export default async function Page() {
	// Fetch all data on the server - no loading state needed!
	const initialData = await getInitialPageData();

	return (
		<CaddyDashboard
			initialConfig={initialData.config}
			initialRawContent={initialData.rawContent}
			initialIsLiveMode={initialData.isLiveMode}
			initialCaddyStatus={{
				available: initialData.caddyStatus.available,
				version: initialData.caddyStatus.version,
				running: initialData.caddyStatus.available,
				url: process.env.CADDY_API_URL || "http://localhost:2019",
			}}
			initialView="sites"
			initialUpstreams={initialData.upstreams}
			initialCertificates={initialData.certificates}
		/>
	);
}
