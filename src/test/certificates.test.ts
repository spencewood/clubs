import { beforeEach, describe, expect, it } from "vitest";
import { getCaddyPKICA } from "@/lib/api";
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
