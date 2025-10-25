import { CaddyDashboard } from "@/components/CaddyDashboard";
import { getInitialPageData } from "@/lib/server/data";

/**
 * Upstreams page - Server Component
 * Shows upstream health status and metrics
 */
export default async function UpstreamsPage() {
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
			initialView="upstreams"
			initialUpstreams={initialData.upstreams}
			initialCertificates={initialData.certificates}
		/>
	);
}
