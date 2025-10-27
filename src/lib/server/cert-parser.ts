import { X509Certificate } from "node:crypto";
import * as fs from "node:fs/promises";
import * as path from "node:path";

export interface CertificateInfo {
	subject: string;
	issuer: string;
	validFrom: string;
	validTo: string;
	daysUntilExpiry: number;
	serialNumber: string;
	fingerprint: string;
	subjectAltNames: string[];
	keyAlgorithm: string;
	signatureAlgorithm: string;
}

export type CertificateType = "letsencrypt" | "zerossl" | "custom" | "local";

export interface AcmeCertificate {
	domain: string;
	certificate: CertificateInfo;
	certPath: string;
	hasPrivateKey: boolean;
	type: CertificateType;
	provider: string; // e.g., "Let's Encrypt", "ZeroSSL", "Custom"
}

export interface CertificatesByType {
	letsencrypt: AcmeCertificate[];
	zerossl: AcmeCertificate[];
	custom: AcmeCertificate[];
	local: AcmeCertificate[];
}

/**
 * Mock certificates for development
 * These show up when the certificates directory doesn't exist
 */
export const mockAcmeCertificates: AcmeCertificate[] = [
	{
		domain: "example.com",
		certPath:
			"/data/caddy/certificates/acme-v02.api.letsencrypt.org-directory/example.com/example.com.crt",
		hasPrivateKey: true,
		type: "letsencrypt",
		provider: "Let's Encrypt",
		certificate: {
			subject: "CN=example.com",
			issuer: "C=US, O=Let's Encrypt, CN=R3",
			validFrom: "Jan 15 00:00:00 2025 GMT",
			validTo: "Apr 15 23:59:59 2025 GMT",
			daysUntilExpiry: 75,
			serialNumber: "03:AB:CD:EF:12:34:56:78:90",
			fingerprint:
				"A1:B2:C3:D4:E5:F6:07:08:09:0A:1B:2C:3D:4E:5F:60:71:82:93:A4:B5:C6:D7:E8:F9:0A:1B:2C:3D:4E:5F:60",
			subjectAltNames: ["example.com", "www.example.com"],
			keyAlgorithm: "rsa",
			signatureAlgorithm: "RSA-SHA256",
		},
	},
	{
		domain: "api.example.com",
		certPath:
			"/data/caddy/certificates/acme-v02.api.letsencrypt.org-directory/api.example.com/api.example.com.crt",
		hasPrivateKey: true,
		type: "letsencrypt",
		provider: "Let's Encrypt",
		certificate: {
			subject: "CN=api.example.com",
			issuer: "C=US, O=Let's Encrypt, CN=R3",
			validFrom: "Feb 1 00:00:00 2025 GMT",
			validTo: "May 1 23:59:59 2025 GMT",
			daysUntilExpiry: 90,
			serialNumber: "04:12:34:56:78:90:AB:CD:EF",
			fingerprint:
				"B2:C3:D4:E5:F6:07:08:09:0A:1B:2C:3D:4E:5F:60:71:82:93:A4:B5:C6:D7:E8:F9:0A:1B:2C:3D:4E:5F:60:71",
			subjectAltNames: ["api.example.com"],
			keyAlgorithm: "rsa",
			signatureAlgorithm: "RSA-SHA256",
		},
	},
	{
		domain: "expiring-soon.example.com",
		certPath:
			"/data/caddy/certificates/acme-v02.api.letsencrypt.org-directory/expiring-soon.example.com/expiring-soon.example.com.crt",
		hasPrivateKey: true,
		type: "letsencrypt",
		provider: "Let's Encrypt",
		certificate: {
			subject: "CN=expiring-soon.example.com",
			issuer: "C=US, O=Let's Encrypt, CN=R3",
			validFrom: "Jan 1 00:00:00 2025 GMT",
			validTo: "Feb 5 23:59:59 2025 GMT",
			daysUntilExpiry: 5, // Expiring soon - should show warning
			serialNumber: "05:FE:DC:BA:98:76:54:32:10",
			fingerprint:
				"C3:D4:E5:F6:07:08:09:0A:1B:2C:3D:4E:5F:60:71:82:93:A4:B5:C6:D7:E8:F9:0A:1B:2C:3D:4E:5F:60:71:82",
			subjectAltNames: ["expiring-soon.example.com"],
			keyAlgorithm: "rsa",
			signatureAlgorithm: "RSA-SHA256",
		},
	},
	{
		domain: "secure.example.com",
		certPath:
			"/data/caddy/certificates/acme.zerossl.com-v2-DV90/secure.example.com/secure.example.com.crt",
		hasPrivateKey: true,
		type: "zerossl",
		provider: "ZeroSSL",
		certificate: {
			subject: "CN=secure.example.com",
			issuer: "C=AT, O=ZeroSSL, CN=ZeroSSL RSA Domain Secure Site CA",
			validFrom: "Mar 1 00:00:00 2025 GMT",
			validTo: "Jun 1 23:59:59 2025 GMT",
			daysUntilExpiry: 120,
			serialNumber: "06:11:22:33:44:55:66:77:88",
			fingerprint:
				"D4:E5:F6:07:08:09:0A:1B:2C:3D:4E:5F:60:71:82:93:A4:B5:C6:D7:E8:F9:0A:1B:2C:3D:4E:5F:60:71:82:93",
			subjectAltNames: ["secure.example.com"],
			keyAlgorithm: "rsa",
			signatureAlgorithm: "RSA-SHA256",
		},
	},
	{
		domain: "legacy.example.com",
		certPath:
			"/data/caddy/certificates/custom/legacy.example.com/legacy.example.com.crt",
		hasPrivateKey: true,
		type: "custom",
		provider: "Custom",
		certificate: {
			subject: "CN=legacy.example.com",
			issuer: "CN=Corporate Internal CA",
			validFrom: "Jan 1 00:00:00 2024 GMT",
			validTo: "Jan 1 23:59:59 2026 GMT",
			daysUntilExpiry: 365,
			serialNumber: "07:AA:BB:CC:DD:EE:FF:00:11",
			fingerprint:
				"E5:F6:07:08:09:0A:1B:2C:3D:4E:5F:60:71:82:93:A4:B5:C6:D7:E8:F9:0A:1B:2C:3D:4E:5F:60:71:82:93:A4",
			subjectAltNames: ["legacy.example.com", "old.example.com"],
			keyAlgorithm: "rsa",
			signatureAlgorithm: "RSA-SHA256",
		},
	},
];

/**
 * Detect certificate type and provider from directory name and issuer
 */
export function detectCertificateType(
	directoryName: string,
	issuer?: string,
): { type: CertificateType; provider: string } {
	// Check directory name first
	if (directoryName.includes("letsencrypt")) {
		return { type: "letsencrypt", provider: "Let's Encrypt" };
	}
	if (directoryName.includes("zerossl")) {
		return { type: "zerossl", provider: "ZeroSSL" };
	}
	if (directoryName.includes("local")) {
		return { type: "local", provider: "Local/Self-Signed" };
	}

	// Check issuer if available
	if (issuer) {
		if (issuer.includes("Let's Encrypt")) {
			return { type: "letsencrypt", provider: "Let's Encrypt" };
		}
		if (issuer.includes("ZeroSSL")) {
			return { type: "zerossl", provider: "ZeroSSL" };
		}
	}

	// Default to custom
	return { type: "custom", provider: "Custom" };
}

/**
 * Parse a PEM-encoded X.509 certificate
 */
export function parseCertificate(pemContent: string): CertificateInfo {
	const cert = new X509Certificate(pemContent);

	// Calculate days until expiry
	const validTo = new Date(cert.validTo);
	const now = new Date();
	const daysUntilExpiry = Math.ceil(
		(validTo.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
	);

	// Extract subject alt names (SANs)
	const subjectAltNames: string[] = [];
	const sanExtension = cert.subjectAltName;
	if (sanExtension) {
		// Parse the SAN extension (format: "DNS:example.com, DNS:www.example.com")
		const sans = sanExtension.split(",").map((s) => s.trim());
		for (const san of sans) {
			if (san.startsWith("DNS:")) {
				subjectAltNames.push(san.substring(4));
			}
		}
	}

	return {
		subject: cert.subject,
		issuer: cert.issuer,
		validFrom: cert.validFrom,
		validTo: cert.validTo,
		daysUntilExpiry,
		serialNumber: cert.serialNumber,
		fingerprint: cert.fingerprint256,
		subjectAltNames,
		keyAlgorithm: cert.publicKey.asymmetricKeyType || "unknown",
		signatureAlgorithm: "RSA-SHA256", // X509Certificate doesn't expose this directly
	};
}

/**
 * Scan Caddy's certificate directory for ACME certificates
 * Expected structure: /data/caddy/certificates/acme-v02.api.letsencrypt.org-directory/domain.com/domain.com.crt
 */
export async function scanAcmeCertificates(
	certificatesPath: string,
): Promise<AcmeCertificate[]> {
	const certificates: AcmeCertificate[] = [];

	try {
		// Check if the certificates directory exists
		const stat = await fs.stat(certificatesPath);
		if (!stat.isDirectory()) {
			return certificates;
		}
	} catch (_error) {
		// Directory doesn't exist or isn't accessible - this is fine, just return empty array
		// This happens when the user hasn't mounted the certificates volume
		return certificates;
	}

	try {
		// Look for all certificate directories
		const entries = await fs.readdir(certificatesPath, {
			withFileTypes: true,
		});

		for (const entry of entries) {
			// Look for certificate provider directories
			// (e.g., "acme-v02.api.letsencrypt.org-directory", "acme.zerossl.com-v2-DV90", "local", "custom")
			if (entry.isDirectory()) {
				const providerDir = path.join(certificatesPath, entry.name);

				// Scan domain directories inside provider directory
				const domainEntries = await fs.readdir(providerDir, {
					withFileTypes: true,
				});

				for (const domainEntry of domainEntries) {
					if (domainEntry.isDirectory()) {
						const domainDir = path.join(providerDir, domainEntry.name);
						const certPath = path.join(domainDir, `${domainEntry.name}.crt`);
						const keyPath = path.join(domainDir, `${domainEntry.name}.key`);

						// Check if certificate file exists
						try {
							const certContent = await fs.readFile(certPath, "utf-8");
							const hasPrivateKey = await fs
								.access(keyPath)
								.then(() => true)
								.catch(() => false);

							const certInfo = parseCertificate(certContent);

							// Detect certificate type based on directory and issuer
							const { type, provider } = detectCertificateType(
								entry.name,
								certInfo.issuer,
							);

							certificates.push({
								domain: domainEntry.name,
								certificate: certInfo,
								certPath,
								hasPrivateKey,
								type,
								provider,
							});
						} catch (error) {
							// Certificate file doesn't exist or can't be read, skip
							console.warn(
								`Could not read certificate for ${domainEntry.name}:`,
								error,
							);
						}
					}
				}
			}
		}
	} catch (error) {
		console.error("Error scanning certificates directory:", error);
	}

	return certificates;
}

/**
 * Group certificates by type
 */
export function groupCertificatesByType(
	certificates: AcmeCertificate[],
): CertificatesByType {
	return certificates.reduce(
		(acc, cert) => {
			acc[cert.type].push(cert);
			return acc;
		},
		{
			letsencrypt: [],
			zerossl: [],
			custom: [],
			local: [],
		} as CertificatesByType,
	);
}

/**
 * Get certificate status based on days until expiry
 */
export function getCertificateStatus(daysUntilExpiry: number): {
	status: "valid" | "expiring-soon" | "expired";
	message: string;
} {
	if (daysUntilExpiry < 0) {
		return {
			status: "expired",
			message: "Certificate has expired",
		};
	} else if (daysUntilExpiry <= 7) {
		return {
			status: "expiring-soon",
			message: `Expires in ${daysUntilExpiry} day${daysUntilExpiry === 1 ? "" : "s"}`,
		};
	} else if (daysUntilExpiry <= 30) {
		return {
			status: "expiring-soon",
			message: `Expires in ${daysUntilExpiry} days`,
		};
	} else {
		return {
			status: "valid",
			message: `Valid for ${daysUntilExpiry} days`,
		};
	}
}
