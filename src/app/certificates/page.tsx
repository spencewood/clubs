import { CaddyDashboard } from "@/components/CaddyDashboard";
import { getInitialPageData } from "@/lib/server/data";

/**
 * Certificates page - Server Component
 * Shows PKI certificates and CA information
 */
export default async function CertificatesPage() {
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
			initialView="certificates"
			initialUpstreams={initialData.upstreams}
			initialCertificates={initialData.certificates}
		/>
	);
}
