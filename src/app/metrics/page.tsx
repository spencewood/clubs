import { CaddyDashboard } from "@/components/CaddyDashboard";
import { getInitialPageData } from "@/lib/server/data";

// Force dynamic rendering - this page fetches live data from Caddy API
export const dynamic = "force-dynamic";

/**
 * Metrics page - Shows Prometheus metrics visualizations
 */
export default async function MetricsPage() {
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
			initialView="metrics"
			initialUpstreams={initialData.upstreams}
			initialCertificates={initialData.certificates}
		/>
	);
}
