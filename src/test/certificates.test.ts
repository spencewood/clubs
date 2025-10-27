import { beforeEach, describe, expect, it } from "vitest";
import { getCaddyPKICA } from "@/lib/api";
import {
	getCertificateStatus,
	parseCertificate,
} from "@/lib/server/cert-parser";
import { setMockCaddyAPIAvailable } from "../mocks/handlers";

describe("PKI Certificates", () => {
	beforeEach(() => {
		setMockCaddyAPIAvailable(true);
	});

	describe("getCaddyPKICA", () => {
		it("should fetch PKI CA data successfully", async () => {
			const result = await getCaddyPKICA();

			expect(result.success).toBe(true);
			expect(result.ca).toBeDefined();
			expect(result.error).toBeUndefined();
		});

		it("should return CA data with correct structure", async () => {
			const result = await getCaddyPKICA();

			expect(result.success).toBe(true);
			expect(result.ca).toBeDefined();

			if (result.ca) {
				// Check required fields exist
				expect(result.ca).toHaveProperty("id");
				expect(result.ca).toHaveProperty("name");
				expect(result.ca).toHaveProperty("root_common_name");
				expect(result.ca).toHaveProperty("intermediate_common_name");
				expect(result.ca).toHaveProperty("root_certificate");
				expect(result.ca).toHaveProperty("intermediate_certificate");

				// Check types
				expect(typeof result.ca.id).toBe("string");
				expect(typeof result.ca.name).toBe("string");
				expect(typeof result.ca.root_common_name).toBe("string");
				expect(typeof result.ca.intermediate_common_name).toBe("string");
				expect(typeof result.ca.root_certificate).toBe("string");
				expect(typeof result.ca.intermediate_certificate).toBe("string");
			}
		});

		it("should default to 'local' CA when no ID specified", async () => {
			const result = await getCaddyPKICA();

			expect(result.success).toBe(true);
			expect(result.ca).toBeDefined();

			if (result.ca) {
				expect(result.ca.id).toBe("local");
			}
		});

		it("should accept custom CA ID", async () => {
			const result = await getCaddyPKICA("custom-ca");

			expect(result.success).toBe(true);
			expect(result.ca).toBeDefined();

			if (result.ca) {
				expect(result.ca.id).toBe("custom-ca");
			}
		});

		it("should return valid PEM certificates", async () => {
			const result = await getCaddyPKICA();

			expect(result.success).toBe(true);
			expect(result.ca).toBeDefined();

			if (result.ca) {
				// Check root certificate is PEM format
				expect(result.ca.root_certificate).toContain(
					"-----BEGIN CERTIFICATE-----",
				);
				expect(result.ca.root_certificate).toContain(
					"-----END CERTIFICATE-----",
				);

				// Check intermediate certificate is PEM format
				expect(result.ca.intermediate_certificate).toContain(
					"-----BEGIN CERTIFICATE-----",
				);
				expect(result.ca.intermediate_certificate).toContain(
					"-----END CERTIFICATE-----",
				);
			}
		});

		it("should fail when Caddy API is unavailable", async () => {
			setMockCaddyAPIAvailable(false);

			const result = await getCaddyPKICA();

			expect(result.success).toBe(false);
			expect(result.error).toBeDefined();
			expect(result.error).toContain("Caddy API not available");
			expect(result.ca).toBeUndefined();
		});

		it("should include year in root common name", async () => {
			const result = await getCaddyPKICA();

			expect(result.success).toBe(true);
			expect(result.ca).toBeDefined();

			if (result.ca) {
				const currentYear = new Date().getFullYear();
				expect(result.ca.root_common_name).toContain(currentYear.toString());
			}
		});

		it("should have 'Caddy Local Authority' as default CA name", async () => {
			const result = await getCaddyPKICA();

			expect(result.success).toBe(true);
			expect(result.ca).toBeDefined();

			if (result.ca) {
				expect(result.ca.name).toBe("Caddy Local Authority");
			}
		});

		it("should distinguish between root and intermediate certificates", async () => {
			const result = await getCaddyPKICA();

			expect(result.success).toBe(true);
			expect(result.ca).toBeDefined();

			if (result.ca) {
				// Common names should be different
				expect(result.ca.root_common_name).not.toBe(
					result.ca.intermediate_common_name,
				);

				// Root should mention "Root"
				expect(result.ca.root_common_name).toContain("Root");

				// Intermediate should mention "Intermediate"
				expect(result.ca.intermediate_common_name).toContain("Intermediate");
			}
		});
	});

	describe("Certificate Format Validation", () => {
		it("should have properly formatted PEM certificates", async () => {
			const result = await getCaddyPKICA();

			expect(result.success).toBe(true);
			if (result.ca) {
				// Root cert should have proper PEM structure
				const rootLines = result.ca.root_certificate.split("\n");
				expect(rootLines[0]).toBe("-----BEGIN CERTIFICATE-----");
				expect(rootLines[rootLines.length - 1]).toBe(
					"-----END CERTIFICATE-----",
				);

				// Intermediate cert should have proper PEM structure
				const intLines = result.ca.intermediate_certificate.split("\n");
				expect(intLines[0]).toBe("-----BEGIN CERTIFICATE-----");
				expect(intLines[intLines.length - 1]).toBe("-----END CERTIFICATE-----");
			}
		});

		it("should have base64-encoded certificate data", async () => {
			const result = await getCaddyPKICA();

			expect(result.success).toBe(true);
			if (result.ca) {
				// Get middle lines (between BEGIN and END)
				const rootLines = result.ca.root_certificate.split("\n").slice(1, -1);
				const intLines = result.ca.intermediate_certificate
					.split("\n")
					.slice(1, -1);

				// Should have content
				expect(rootLines.length).toBeGreaterThan(0);
				expect(intLines.length).toBeGreaterThan(0);

				// Base64 regex (alphanumeric + / + =)
				const base64Regex = /^[A-Za-z0-9+/=]+$/;

				// Check at least one line is base64
				const hasValidBase64Root = rootLines.some((line) =>
					base64Regex.test(line.trim()),
				);
				const hasValidBase64Int = intLines.some((line) =>
					base64Regex.test(line.trim()),
				);

				expect(hasValidBase64Root).toBe(true);
				expect(hasValidBase64Int).toBe(true);
			}
		});
	});

	describe("Error Handling", () => {
		it("should provide clear error messages", async () => {
			setMockCaddyAPIAvailable(false);

			const result = await getCaddyPKICA();

			expect(result.success).toBe(false);
			expect(result.error).toBeDefined();
			expect(typeof result.error).toBe("string");
			expect(result.error?.length).toBeGreaterThan(0);
		});

		it("should handle network errors gracefully", async () => {
			setMockCaddyAPIAvailable(false);

			const result = await getCaddyPKICA();

			expect(result.success).toBe(false);
			expect(result.ca).toBeUndefined();
			// Should not throw
		});
	});
});

describe("ACME Certificate Parsing", () => {
	// Real self-signed test certificate
	const sampleCert = `-----BEGIN CERTIFICATE-----
MIIDFzCCAf+gAwIBAgIUVpZ+t9Zj6yuum7KaHBpXsgY2cbcwDQYJKoZIhvcNAQEL
BQAwGzEZMBcGA1UEAwwQdGVzdC5leGFtcGxlLmNvbTAeFw0yNTEwMjcwMjIzMjNa
Fw0yNjEwMjcwMjIzMjNaMBsxGTAXBgNVBAMMEHRlc3QuZXhhbXBsZS5jb20wggEi
MA0GCSqGSIb3DQEBAQUAA4IBDwAwggEKAoIBAQCS/TG1f9dx9jx8aAtMpXSoNUFV
ptsZo3yIiaIPitWfawgoY0kxfwEh3qflDtNiw3yf8LaYbdMwbWt5m5sOXu5q9GVh
S+mQK/o6syXPcFS6bnBMvqRRH+u7uwILKPvQfox6FFf2J0TMXwqX43IUSSz4RCYQ
UqGwS+CHSHe1fhNesW3FFN2mZRuF4SqkUfOgLySCxBCvCzFblm/art18Ra69ACiF
mwnX4bw3Ifqbpi6xCR/OMYYK5BdabRseZWqmRK8uWxdPB54IBJYtaW45KS25gXYq
syRxwAyuqlgYmPgDIqA1E8utlI+bANnFZoDxICBE9bboNxGrn2k1z5PRGzrNAgMB
AAGjUzBRMB0GA1UdDgQWBBTuGYKVWJLf2N57kdhJooZ0s6TvPDAfBgNVHSMEGDAW
gBTuGYKVWJLf2N57kdhJooZ0s6TvPDAPBgNVHRMBAf8EBTADAQH/MA0GCSqGSIb3
DQEBCwUAA4IBAQA3M3qqGLFqNucC9GhV2v8jKllpaAelTGA2n1x3gJH4zC3ABT3Z
3X7+0Zs8Ne6PutbwJdGH6lYqKoGiSEVrng9jwvkTcS9GAOCZFQjxdb9J/pgcTB0K
6ELXUOZkP82EvIW8bi/3+vXe4ycNjzOHmQ9CzYTPUA7HLc//glao9AztDsR1LWT8
mYPsFfxcPHaF6qZdnB+1xnqSR+OuiERsE+vpMp0N39K3KktnVnZqRchPNtSx3CzV
t2w0uxNtvqo929q1g2ytl0GHwyvaMLGqkmpsoPbk/meintDoWk1l+7rFp/qLYJLc
qPOKQx4xFMbdGfwnXpE4mCOXmE/m8H5a6uoI
-----END CERTIFICATE-----`;

	describe("parseCertificate", () => {
		it("should parse a valid X.509 certificate", () => {
			const result = parseCertificate(sampleCert);

			expect(result).toBeDefined();
			expect(result.subject).toBeDefined();
			expect(result.issuer).toBeDefined();
			expect(result.validFrom).toBeDefined();
			expect(result.validTo).toBeDefined();
			expect(result.serialNumber).toBeDefined();
			expect(result.fingerprint).toBeDefined();
		});

		it("should extract subject information", () => {
			const result = parseCertificate(sampleCert);

			expect(result.subject).toBeDefined();
			expect(typeof result.subject).toBe("string");
			expect(result.subject.length).toBeGreaterThan(0);
		});

		it("should extract issuer information", () => {
			const result = parseCertificate(sampleCert);

			expect(result.issuer).toBeDefined();
			expect(typeof result.issuer).toBe("string");
			expect(result.issuer.length).toBeGreaterThan(0);
		});

		it("should calculate days until expiry correctly", () => {
			const result = parseCertificate(sampleCert);

			expect(result.daysUntilExpiry).toBeDefined();
			expect(typeof result.daysUntilExpiry).toBe("number");
			// This test cert is valid for 365 days from Oct 2025
			expect(result.daysUntilExpiry).toBeGreaterThan(300);
		});

		it("should extract serial number", () => {
			const result = parseCertificate(sampleCert);

			expect(result.serialNumber).toBeDefined();
			expect(typeof result.serialNumber).toBe("string");
			expect(result.serialNumber.length).toBeGreaterThan(0);
		});

		it("should extract fingerprint", () => {
			const result = parseCertificate(sampleCert);

			expect(result.fingerprint).toBeDefined();
			expect(typeof result.fingerprint).toBe("string");
			expect(result.fingerprint.length).toBeGreaterThan(0);
			// SHA-256 fingerprint should contain colons
			expect(result.fingerprint).toContain(":");
		});

		it("should extract subject alternative names", () => {
			const result = parseCertificate(sampleCert);

			expect(result.subjectAltNames).toBeDefined();
			expect(Array.isArray(result.subjectAltNames)).toBe(true);
		});

		it("should extract key algorithm", () => {
			const result = parseCertificate(sampleCert);

			expect(result.keyAlgorithm).toBeDefined();
			expect(typeof result.keyAlgorithm).toBe("string");
		});

		it("should have valid date strings", () => {
			const result = parseCertificate(sampleCert);

			// Should be parseable as dates
			const validFrom = new Date(result.validFrom);
			const validTo = new Date(result.validTo);

			expect(validFrom.toString()).not.toBe("Invalid Date");
			expect(validTo.toString()).not.toBe("Invalid Date");

			// validTo should be after validFrom
			expect(validTo.getTime()).toBeGreaterThan(validFrom.getTime());
		});
	});

	describe("getCertificateStatus", () => {
		it("should return 'expired' status for negative days", () => {
			const result = getCertificateStatus(-1);

			expect(result.status).toBe("expired");
			expect(result.message).toContain("expired");
		});

		it("should return 'expiring-soon' status for 7 days or less", () => {
			const result = getCertificateStatus(7);

			expect(result.status).toBe("expiring-soon");
			expect(result.message).toContain("7 days");
		});

		it("should return 'expiring-soon' status for 1 day", () => {
			const result = getCertificateStatus(1);

			expect(result.status).toBe("expiring-soon");
			expect(result.message).toContain("1 day");
		});

		it("should return 'expiring-soon' status for 30 days or less", () => {
			const result = getCertificateStatus(30);

			expect(result.status).toBe("expiring-soon");
			expect(result.message).toContain("30 days");
		});

		it("should return 'valid' status for more than 30 days", () => {
			const result = getCertificateStatus(60);

			expect(result.status).toBe("valid");
			expect(result.message).toContain("60 days");
		});

		it("should return 'valid' status for 90 days", () => {
			const result = getCertificateStatus(90);

			expect(result.status).toBe("valid");
			expect(result.message).toContain("90 days");
		});

		it("should have descriptive messages", () => {
			const expired = getCertificateStatus(-5);
			const expiringSoon = getCertificateStatus(5);
			const valid = getCertificateStatus(60);

			expect(expired.message.length).toBeGreaterThan(0);
			expect(expiringSoon.message.length).toBeGreaterThan(0);
			expect(valid.message.length).toBeGreaterThan(0);
		});
	});
});
