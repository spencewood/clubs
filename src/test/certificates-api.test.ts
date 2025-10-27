import { beforeEach, describe, expect, it } from "vitest";
import type { AcmeCertificate } from "@/lib/server/cert-parser";
import { setMockCaddyAPIAvailable } from "../mocks/handlers";

describe("Certificates API", () => {
	beforeEach(() => {
		setMockCaddyAPIAvailable(true);
	});

	describe("GET /api/certificates", () => {
		it("should return success with certificates array", async () => {
			const response = await fetch("/api/certificates");
			const data = await response.json();

			expect(response.ok).toBe(true);
			expect(data.success).toBe(true);
			expect(data.certificates).toBeDefined();
			expect(Array.isArray(data.certificates)).toBe(true);
		});

		it("should return mock certificate data in development", async () => {
			const response = await fetch("/api/certificates");
			const data = await response.json();

			expect(data.certificates.length).toBeGreaterThan(0);

			// Check structure of first certificate
			const cert = data.certificates[0];
			expect(cert).toHaveProperty("domain");
			expect(cert).toHaveProperty("certPath");
			expect(cert).toHaveProperty("hasPrivateKey");
			expect(cert).toHaveProperty("certificate");
		});

		it("should include certificate details", async () => {
			const response = await fetch("/api/certificates");
			const data = await response.json();

			const cert = data.certificates[0];
			const certInfo = cert.certificate;

			expect(certInfo).toHaveProperty("subject");
			expect(certInfo).toHaveProperty("issuer");
			expect(certInfo).toHaveProperty("validFrom");
			expect(certInfo).toHaveProperty("validTo");
			expect(certInfo).toHaveProperty("daysUntilExpiry");
			expect(certInfo).toHaveProperty("serialNumber");
			expect(certInfo).toHaveProperty("fingerprint");
			expect(certInfo).toHaveProperty("subjectAltNames");
			expect(certInfo).toHaveProperty("keyAlgorithm");
			expect(certInfo).toHaveProperty("signatureAlgorithm");
		});

		it("should include Let's Encrypt issuer", async () => {
			const response = await fetch("/api/certificates");
			const data = await response.json();

			const cert = data.certificates[0];
			expect(cert.certificate.issuer).toContain("Let's Encrypt");
		});

		it("should include multiple domains", async () => {
			const response = await fetch("/api/certificates");
			const data = await response.json();

			expect(data.certificates.length).toBeGreaterThanOrEqual(2);

			const domains = data.certificates.map((c: AcmeCertificate) => c.domain);
			expect(domains).toContain("example.com");
			expect(domains).toContain("api.example.com");
		});

		it("should include Subject Alternative Names", async () => {
			const response = await fetch("/api/certificates");
			const data = await response.json();

			const cert = data.certificates[0];
			expect(Array.isArray(cert.certificate.subjectAltNames)).toBe(true);
			expect(cert.certificate.subjectAltNames.length).toBeGreaterThan(0);
		});

		it("should indicate private key presence", async () => {
			const response = await fetch("/api/certificates");
			const data = await response.json();

			const cert = data.certificates[0];
			expect(typeof cert.hasPrivateKey).toBe("boolean");
			expect(cert.hasPrivateKey).toBe(true);
		});

		it("should include certificate path", async () => {
			const response = await fetch("/api/certificates");
			const data = await response.json();

			const cert = data.certificates[0];
			expect(cert.certPath).toBeDefined();
			expect(cert.certPath).toContain("/data/caddy/certificates");
			expect(cert.certPath).toContain(".crt");
		});

		it("should include certificatesPath in response", async () => {
			const response = await fetch("/api/certificates");
			const data = await response.json();

			expect(data.certificatesPath).toBeDefined();
			expect(data.certificatesPath).toContain("/data/caddy/certificates");
		});

		it("should have positive daysUntilExpiry for valid certs", async () => {
			const response = await fetch("/api/certificates");
			const data = await response.json();

			const cert = data.certificates[0];
			expect(cert.certificate.daysUntilExpiry).toBeGreaterThan(0);
		});

		it("should include type and provider fields", async () => {
			const response = await fetch("/api/certificates");
			const data = await response.json();

			const cert = data.certificates[0];
			expect(cert).toHaveProperty("type");
			expect(cert).toHaveProperty("provider");
			expect(typeof cert.type).toBe("string");
			expect(typeof cert.provider).toBe("string");
		});

		it("should return certificates grouped by type", async () => {
			const response = await fetch("/api/certificates");
			const data = await response.json();

			expect(data).toHaveProperty("certificatesByType");
			expect(data.certificatesByType).toHaveProperty("letsencrypt");
			expect(data.certificatesByType).toHaveProperty("zerossl");
			expect(data.certificatesByType).toHaveProperty("custom");
			expect(data.certificatesByType).toHaveProperty("local");
		});

		it("should group Let's Encrypt certificates correctly", async () => {
			const response = await fetch("/api/certificates");
			const data = await response.json();

			expect(Array.isArray(data.certificatesByType.letsencrypt)).toBe(true);
			expect(data.certificatesByType.letsencrypt.length).toBeGreaterThan(0);

			const leCert = data.certificatesByType.letsencrypt[0];
			expect(leCert.type).toBe("letsencrypt");
			expect(leCert.provider).toBe("Let's Encrypt");
		});

		it("should include multiple certificate types in mock data", async () => {
			const response = await fetch("/api/certificates");
			const data = await response.json();

			const types = new Set(
				data.certificates.map((c: AcmeCertificate) => c.type),
			);
			expect(types.size).toBeGreaterThan(1); // Should have multiple types
			expect(types.has("letsencrypt")).toBe(true);
		});
	});
});
