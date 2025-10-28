import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import type { AcmeCertificate } from "@/lib/server/cert-parser";
import { setMockCaddyAPIAvailable } from "@/mocks/handlers";
import { server } from "@/test/server";

// Start MSW server before all tests
beforeAll(() => {
	server.listen();
});

afterEach(() => {
	server.resetHandlers();
});

afterAll(() => {
	server.close();
});

describe("GET /api/certificates", () => {
	it("should return certificates from Caddy API when available", async () => {
		setMockCaddyAPIAvailable(true);

		const response = await fetch("http://localhost:3000/api/certificates");
		const data = await response.json();

		expect(response.ok).toBe(true);
		expect(data.success).toBe(true);
		expect(data.source).toBe("api");
		expect(data.certificates).toBeDefined();
		expect(data.certificates.length).toBeGreaterThan(0);
		expect(data.certificatesByType).toBeDefined();
	});

	it("should return wildcard certificate with valid expiry", async () => {
		setMockCaddyAPIAvailable(true);

		const response = await fetch("http://localhost:3000/api/certificates");
		const data = await response.json();

		const wildcardCert = data.certificates.find(
			(cert: AcmeCertificate) => cert.domain === "*.spencewood.com",
		);
		expect(wildcardCert).toBeDefined();
		expect(wildcardCert.certificate.daysUntilExpiry).toBe(60);
		expect(wildcardCert.certPath).toBe("N/A (from Caddy API)");
		expect(wildcardCert.provider).toBe("Let's Encrypt");
	});

	it("should group certificates by type", async () => {
		setMockCaddyAPIAvailable(true);

		const response = await fetch("http://localhost:3000/api/certificates");
		const data = await response.json();

		expect(data.certificatesByType).toBeDefined();
		expect(data.certificatesByType.letsencrypt).toBeDefined();
		expect(data.certificatesByType.zerossl).toBeDefined();
		expect(data.certificatesByType.custom).toBeDefined();
		expect(data.certificatesByType.local).toBeDefined();
		expect(data.certificatesByType.letsencrypt.length).toBeGreaterThan(0);
		expect(data.certificatesByType.zerossl.length).toBeGreaterThan(0);
	});

	it("should return empty certificates when Caddy API is unavailable", async () => {
		setMockCaddyAPIAvailable(false);

		const response = await fetch("http://localhost:3000/api/certificates");
		const data = await response.json();

		expect(response.ok).toBe(true);
		expect(data.success).toBe(true);
		expect(data.source).toBe("none");
		expect(data.certificates).toEqual([]);
		expect(data.error).toBe("Caddy API not available");
	});

	it("should include certificate expiry information", async () => {
		setMockCaddyAPIAvailable(true);

		const response = await fetch("http://localhost:3000/api/certificates");
		const data = await response.json();

		for (const cert of data.certificates) {
			expect(cert.certificate).toBeDefined();
			expect(cert.certificate.validFrom).toBeDefined();
			expect(cert.certificate.validTo).toBeDefined();
			expect(cert.certificate.daysUntilExpiry).toBeTypeOf("number");
			expect(cert.certificate.daysUntilExpiry).toBeGreaterThan(0); // Should be valid
		}
	});

	it("should include subject alternative names", async () => {
		setMockCaddyAPIAvailable(true);

		const response = await fetch("http://localhost:3000/api/certificates");
		const data = await response.json();

		const exampleCert = data.certificates.find(
			(cert: AcmeCertificate) => cert.domain === "example.com",
		);
		expect(exampleCert).toBeDefined();
		expect(exampleCert.certificate.subjectAltNames).toEqual([
			"example.com",
			"www.example.com",
		]);
	});
});
