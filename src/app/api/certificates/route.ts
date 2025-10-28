import { NextResponse } from "next/server";
import { createCaddyAPIClient } from "@/lib/server/caddy-api-client";
import {
	type AcmeCertificate,
	groupCertificatesByType,
	mockAcmeCertificates,
} from "@/lib/server/cert-parser";

/**
 * GET /api/certificates
 * Returns ACME certificates from Caddy's API (active certificates only)
 * Filesystem scanning is not used as those certificates may be stale/expired
 * In development (when no certs found), returns mock data for testing
 * Returns certificates grouped by type (letsencrypt, zerossl, custom, local)
 */
export async function GET() {
	try {
		const CADDY_API_URL = process.env.CADDY_API_URL || "http://localhost:2019";
		const caddyAPI = createCaddyAPIClient(CADDY_API_URL);

		const isAvailable = await caddyAPI.isAvailable();
		if (!isAvailable) {
			// API not available - return mock data in development
			const isDevelopment = process.env.NODE_ENV === "development";
			if (isDevelopment) {
				const grouped = groupCertificatesByType(mockAcmeCertificates);
				return NextResponse.json({
					success: true,
					certificates: mockAcmeCertificates,
					certificatesByType: grouped,
					source: "mock",
					mock: true,
				});
			}

			return NextResponse.json({
				success: true,
				certificates: [],
				certificatesByType: {
					letsencrypt: [],
					zerossl: [],
					custom: [],
					local: [],
				},
				source: "none",
				error: "Caddy API not available",
			});
		}

		const result = await caddyAPI.getTLSCertificates();
		if (!result.success || !result.certificates) {
			// API failed - return mock data in development
			const isDevelopment = process.env.NODE_ENV === "development";
			if (isDevelopment) {
				const grouped = groupCertificatesByType(mockAcmeCertificates);
				return NextResponse.json({
					success: true,
					certificates: mockAcmeCertificates,
					certificatesByType: grouped,
					source: "mock",
					mock: true,
				});
			}

			return NextResponse.json({
				success: true,
				certificates: [],
				certificatesByType: {
					letsencrypt: [],
					zerossl: [],
					custom: [],
					local: [],
				},
				source: "none",
				error: result.error || "Failed to fetch certificates",
			});
		}

		// Convert to our format
		const certificates: AcmeCertificate[] = result.certificates.map((cert) => {
			const domain = cert.subjects[0] || "unknown";
			const validTo = new Date(cert.notAfter);
			const now = new Date();
			const daysUntilExpiry = Math.ceil(
				(validTo.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
			);

			let provider = "Custom";
			let type: "letsencrypt" | "zerossl" | "custom" | "local" = "custom";

			if (cert.issuer.commonName?.includes("Let's Encrypt")) {
				provider = "Let's Encrypt";
				type = "letsencrypt";
			} else if (cert.issuer.commonName?.includes("ZeroSSL")) {
				provider = "ZeroSSL";
				type = "zerossl";
			}

			return {
				domain,
				certificate: {
					subject: `CN=${domain}`,
					issuer: cert.issuer.organization
						? `O=${cert.issuer.organization}, CN=${cert.issuer.commonName}`
						: `CN=${cert.issuer.commonName}`,
					validFrom: cert.notBefore,
					validTo: cert.notAfter,
					daysUntilExpiry,
					serialNumber: cert.serialNumber || "unknown",
					fingerprint: "N/A",
					subjectAltNames: cert.subjects,
					keyAlgorithm: "N/A",
					signatureAlgorithm: "RSA-SHA256",
				},
				certPath: "N/A (from Caddy API)",
				hasPrivateKey: true,
				type,
				provider,
			};
		});

		const grouped = groupCertificatesByType(certificates);

		return NextResponse.json({
			success: true,
			certificates,
			certificatesByType: grouped,
			source: "api",
			mock: false,
		});
	} catch (error) {
		console.error("Error fetching certificates:", error);

		// Return mock data in development on error
		const isDevelopment = process.env.NODE_ENV === "development";
		if (isDevelopment) {
			const grouped = groupCertificatesByType(mockAcmeCertificates);
			return NextResponse.json({
				success: true,
				certificates: mockAcmeCertificates,
				certificatesByType: grouped,
				source: "mock",
				mock: true,
			});
		}

		return NextResponse.json({
			success: false,
			certificates: [],
			certificatesByType: {
				letsencrypt: [],
				zerossl: [],
				custom: [],
				local: [],
			},
			source: "none",
			error: error instanceof Error ? error.message : "Unknown error",
		});
	}
}
