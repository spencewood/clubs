import { NextResponse } from "next/server";
import {
	groupCertificatesByType,
	mockAcmeCertificates,
	scanAcmeCertificates,
} from "@/lib/server/cert-parser";

/**
 * GET /api/certificates
 * Scans and returns all ACME certificates from Caddy's certificate directory
 * In development (when directory doesn't exist), returns mock data for testing
 * Returns certificates grouped by type (letsencrypt, zerossl, custom, local)
 */
export async function GET() {
	// Path to Caddy's certificate directory
	// This should be mounted as a volume in Docker
	const certificatesPath =
		process.env.CADDY_CERTIFICATES_PATH || "/data/caddy/certificates";

	const certificates = await scanAcmeCertificates(certificatesPath);

	// If no certificates found and we're in development, return mock data
	const isDevelopment = process.env.NODE_ENV === "development";
	const finalCertificates =
		certificates.length === 0 && isDevelopment
			? mockAcmeCertificates
			: certificates;

	// Group certificates by type
	const grouped = groupCertificatesByType(finalCertificates);

	return NextResponse.json({
		success: true,
		certificates: finalCertificates, // Keep flat list for backwards compatibility
		certificatesByType: grouped, // New grouped format
		certificatesPath,
		mock: certificates.length === 0 && isDevelopment,
	});
}
