import { beforeEach, describe, expect, it } from "vitest";
import { formatCaddyfile } from "@/lib/api";
import { setMockCaddyAPIAvailable } from "../mocks/handlers";

describe("Format Functionality", () => {
	beforeEach(() => {
		setMockCaddyAPIAvailable(true);
	});

	describe("formatCaddyfile", () => {
		it("should return warning when format is not available", async () => {
			const content = `
app.example.com {
  reverse_proxy localhost:3000
}
      `.trim();

			const result = await formatCaddyfile(content);

			expect(result.success).toBe(true);
			expect(result.formatted).toBe(content);
			expect(result.warning).toBeDefined();
			expect(result.warning).toContain("Caddy fmt not available");
			expect(result.error).toBeUndefined();
		});

		it("should reject invalid Caddyfile syntax", async () => {
			const content = `
app.example.com {
  INVALID directive here
}
      `.trim();

			const result = await formatCaddyfile(content);

			expect(result.success).toBe(false);
			expect(result.error).toBeDefined();
			expect(result.error).toContain("Invalid Caddyfile");
		});

		it("should reject empty Caddyfile", async () => {
			const result = await formatCaddyfile("");

			expect(result.success).toBe(false);
			expect(result.error).toBeDefined();
			expect(result.error).toContain("Cannot format empty Caddyfile");
		});

		it("should handle valid Caddyfile content", async () => {
			const content = `
localhost:8080 {
  root * /var/www
  file_server
}
      `.trim();

			const result = await formatCaddyfile(content);

			expect(result.success).toBe(true);
			expect(result.formatted).toBe(content);
		});

		it("should handle complex Caddyfile with multiple blocks", async () => {
			const content = `
app.example.com {
  reverse_proxy localhost:3000
}

api.example.com {
  reverse_proxy localhost:4000
  header * X-Custom "value"
}
      `.trim();

			const result = await formatCaddyfile(content);

			expect(result.success).toBe(true);
			expect(result.formatted).toBeDefined();
			expect(result.formatted).toBe(content);
		});
	});
});
