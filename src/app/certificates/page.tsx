import { AuthGuard } from "@/components/AuthGuard";
import { CaddyDashboard } from "@/components/CaddyDashboard";
import { getInitialPageData } from "@/lib/server/data";

// Force dynamic rendering - this page fetches live data from Caddy API
export const dynamic = "force-dynamic";

/**
 * Certificates page - Server Component
 * Shows PKI certificates and CA information
 */
export default async function CertificatesPage() {
	const initialData = await getInitialPageData();

	return (
		<AuthGuard>
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
				initialAcmeCertificates={initialData.acmeCertificates}
			/>
		</AuthGuard>
	);
}
