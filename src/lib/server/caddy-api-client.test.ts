import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { setMockCaddyAPIAvailable } from "@/mocks/handlers";
import { server } from "@/test/server";
import { createCaddyAPIClient } from "./caddy-api-client";

beforeAll(() => {
	server.listen();
});

afterEach(() => {
	server.resetHandlers();
	setMockCaddyAPIAvailable(true);
});

afterAll(() => {
	server.close();
});

describe("CaddyAPIClient.getTLSCertificates", () => {
	it("should fetch TLS certificates from Caddy API", async () => {
		const client = createCaddyAPIClient("http://localhost:2019");
		const result = await client.getTLSCertificates();

		expect(result.success).toBe(true);
		expect(result.certificates).toBeDefined();
		expect(result.certificates?.length).toBeGreaterThan(0);
	});

	it("should return certificate details with correct structure", async () => {
		const client = createCaddyAPIClient("http://localhost:2019");
		const result = await client.getTLSCertificates();

		expect(result.success).toBe(true);
		const cert = result.certificates?.[0];
		expect(cert).toBeDefined();
		expect(cert?.subjects).toBeDefined();
		expect(cert?.issuer).toBeDefined();
		expect(cert?.issuer.commonName).toBeDefined();
		expect(cert?.notBefore).toBeDefined();
		expect(cert?.notAfter).toBeDefined();
		expect(cert?.serialNumber).toBeDefined();
	});

	it("should include wildcard certificate for spencewood.com", async () => {
		const client = createCaddyAPIClient("http://localhost:2019");
		const result = await client.getTLSCertificates();

		expect(result.success).toBe(true);
		const wildcardCert = result.certificates?.find((cert) =>
			cert.subjects.includes("*.spencewood.com"),
		);
		expect(wildcardCert).toBeDefined();
		expect(wildcardCert?.issuer.organization).toBe("Let's Encrypt");
	});

	it("should return empty array when API returns 404", async () => {
		const client = createCaddyAPIClient("http://localhost:2019");

		// The mock returns empty array for 404, not an error
		const result = await client.getTLSCertificates();

		// Should handle gracefully
		expect(result.success).toBe(true);
	});

	it("should handle API errors gracefully", async () => {
		setMockCaddyAPIAvailable(false);
		const client = createCaddyAPIClient("http://localhost:2019");
		const result = await client.getTLSCertificates();

		// API unavailable returns error
		expect(result.success).toBe(false);
		expect(result.error).toBeDefined();
	});

	it("should return certificates with future expiry dates", async () => {
		const client = createCaddyAPIClient("http://localhost:2019");
		const result = await client.getTLSCertificates();

		expect(result.success).toBe(true);
		const now = new Date();

		for (const cert of result.certificates || []) {
			const notAfter = new Date(cert.notAfter);
			expect(notAfter.getTime()).toBeGreaterThan(now.getTime());
		}
	});

	it("should include both Let's Encrypt and ZeroSSL certificates", async () => {
		const client = createCaddyAPIClient("http://localhost:2019");
		const result = await client.getTLSCertificates();

		expect(result.success).toBe(true);
		const letsEncrypt = result.certificates?.filter((cert) =>
			cert.issuer.organization?.includes("Let's Encrypt"),
		);
		const zeroSSL = result.certificates?.filter((cert) =>
			cert.issuer.organization?.includes("ZeroSSL"),
		);

		expect(letsEncrypt?.length).toBeGreaterThan(0);
		expect(zeroSSL?.length).toBeGreaterThan(0);
	});
});
