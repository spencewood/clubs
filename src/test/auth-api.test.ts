import { beforeEach, describe, expect, it } from "vitest";
import { resetMockAuthState } from "../mocks/handlers";

describe("Auth API", () => {
	beforeEach(() => {
		// Reset mock auth state before each test
		resetMockAuthState();
	});

	describe("GET /api/auth/status", () => {
		it("should return guest mode enabled by default", async () => {
			const response = await fetch("/api/auth/status");
			const data = await response.json();

			expect(response.ok).toBe(true);
			expect(data.guestModeEnabled).toBe(true);
			expect(data.isAuthenticated).toBe(false);
			expect(data.user).toBeNull();
		});

		it("should have correct structure", async () => {
			const response = await fetch("/api/auth/status");
			const data = await response.json();

			expect(data).toHaveProperty("guestModeEnabled");
			expect(data).toHaveProperty("isAuthenticated");
			expect(data).toHaveProperty("user");
		});
	});

	describe("POST /api/auth/setup", () => {
		it("should create first user and disable guest mode", async () => {
			const response = await fetch("/api/auth/setup", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					username: "admin",
					password: "password123",
					confirmPassword: "password123",
				}),
			});

			const data = await response.json();

			expect(response.ok).toBe(true);
			expect(data.success).toBe(true);
			expect(data.user).toBeDefined();
			expect(data.user.username).toBe("admin");
			expect(data.user.id).toBeDefined();
		});

		it("should fail if setup already completed", async () => {
			// First setup
			await fetch("/api/auth/setup", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					username: "admin",
					password: "password123",
					confirmPassword: "password123",
				}),
			});

			// Second setup should fail
			const response = await fetch("/api/auth/setup", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					username: "admin2",
					password: "password123",
					confirmPassword: "password123",
				}),
			});

			const data = await response.json();

			expect(response.status).toBe(400);
			expect(data.error).toBe("Setup has already been completed");
		});

		it("should validate username length", async () => {
			const response = await fetch("/api/auth/setup", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					username: "ab",
					password: "password123",
					confirmPassword: "password123",
				}),
			});

			const data = await response.json();

			expect(response.status).toBe(400);
			expect(data.error).toBe("Validation failed");
			expect(data.details).toBeDefined();
		});

		it("should validate password length", async () => {
			const response = await fetch("/api/auth/setup", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					username: "admin",
					password: "short",
					confirmPassword: "short",
				}),
			});

			const data = await response.json();

			expect(response.status).toBe(400);
			expect(data.error).toBe("Validation failed");
		});

		it("should validate password confirmation", async () => {
			const response = await fetch("/api/auth/setup", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					username: "admin",
					password: "password123",
					confirmPassword: "different123",
				}),
			});

			const data = await response.json();

			expect(response.status).toBe(400);
			expect(data.error).toBe("Validation failed");
			expect(data.details[0].message).toContain("do not match");
		});

		it("should update status after setup", async () => {
			// Setup
			await fetch("/api/auth/setup", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					username: "admin",
					password: "password123",
					confirmPassword: "password123",
				}),
			});

			// Check status
			const statusResponse = await fetch("/api/auth/status");
			const statusData = await statusResponse.json();

			expect(statusData.guestModeEnabled).toBe(false);
			expect(statusData.isAuthenticated).toBe(true);
			expect(statusData.user.username).toBe("admin");
		});
	});

	describe("POST /api/auth/login", () => {
		beforeEach(async () => {
			// Create a user for login tests
			await fetch("/api/auth/setup", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					username: "testuser",
					password: "testpass123",
					confirmPassword: "testpass123",
				}),
			});

			// Logout to test fresh login
			await fetch("/api/auth/logout", { method: "POST" });
		});

		it("should login with correct credentials", async () => {
			const response = await fetch("/api/auth/login", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					username: "testuser",
					password: "testpass123",
				}),
			});

			const data = await response.json();

			expect(response.ok).toBe(true);
			expect(data.success).toBe(true);
			expect(data.user.username).toBe("testuser");
		});

		it("should fail with incorrect password", async () => {
			const response = await fetch("/api/auth/login", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					username: "testuser",
					password: "wrongpassword",
				}),
			});

			const data = await response.json();

			expect(response.status).toBe(401);
			expect(data.error).toBe("Invalid username or password");
		});

		it("should fail with non-existent username", async () => {
			const response = await fetch("/api/auth/login", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					username: "nonexistent",
					password: "password123",
				}),
			});

			const data = await response.json();

			expect(response.status).toBe(401);
			expect(data.error).toBe("Invalid username or password");
		});

		it("should update auth status after login", async () => {
			// Login
			await fetch("/api/auth/login", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					username: "testuser",
					password: "testpass123",
				}),
			});

			// Check status
			const statusResponse = await fetch("/api/auth/status");
			const statusData = await statusResponse.json();

			expect(statusData.isAuthenticated).toBe(true);
			expect(statusData.user.username).toBe("testuser");
		});
	});

	describe("POST /api/auth/logout", () => {
		beforeEach(async () => {
			// Setup and login
			await fetch("/api/auth/setup", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					username: "testuser",
					password: "testpass123",
					confirmPassword: "testpass123",
				}),
			});
		});

		it("should logout successfully", async () => {
			const response = await fetch("/api/auth/logout", {
				method: "POST",
			});

			const data = await response.json();

			expect(response.ok).toBe(true);
			expect(data.success).toBe(true);
			expect(data.message).toBe("Logged out successfully");
		});

		it("should update auth status after logout", async () => {
			// Logout
			await fetch("/api/auth/logout", { method: "POST" });

			// Check status
			const statusResponse = await fetch("/api/auth/status");
			const statusData = await statusResponse.json();

			expect(statusData.isAuthenticated).toBe(false);
			expect(statusData.user).toBeNull();
		});
	});

	describe("POST /api/auth/refresh", () => {
		beforeEach(async () => {
			// Setup and login
			await fetch("/api/auth/setup", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					username: "testuser",
					password: "testpass123",
					confirmPassword: "testpass123",
				}),
			});
		});

		it("should refresh token when authenticated", async () => {
			const response = await fetch("/api/auth/refresh", {
				method: "POST",
			});

			const data = await response.json();

			expect(response.ok).toBe(true);
			expect(data.success).toBe(true);
			expect(data.user).toBeDefined();
			expect(data.user.username).toBe("testuser");
		});

		it("should fail when not authenticated", async () => {
			// Logout first
			await fetch("/api/auth/logout", { method: "POST" });

			const response = await fetch("/api/auth/refresh", {
				method: "POST",
			});

			const data = await response.json();

			expect(response.status).toBe(401);
			expect(data.error).toBe("Refresh token not found");
		});
	});

	describe("GET /api/auth/me", () => {
		beforeEach(async () => {
			// Setup and login
			await fetch("/api/auth/setup", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					username: "testuser",
					password: "testpass123",
					confirmPassword: "testpass123",
				}),
			});
		});

		it("should return current user info when authenticated", async () => {
			const response = await fetch("/api/auth/me");
			const data = await response.json();

			expect(response.ok).toBe(true);
			expect(data.user).toBeDefined();
			expect(data.user.username).toBe("testuser");
			expect(data.user.id).toBeDefined();
			expect(data.user.created_at).toBeDefined();
		});

		it("should fail when not authenticated", async () => {
			// Logout first
			await fetch("/api/auth/logout", { method: "POST" });

			const response = await fetch("/api/auth/me");
			const data = await response.json();

			expect(response.status).toBe(401);
			expect(data.error).toBe("Not authenticated");
		});
	});

	describe("Complete Auth Flow", () => {
		it("should handle complete setup -> login -> logout flow", async () => {
			// 1. Initial status - guest mode
			const initialStatus = await fetch("/api/auth/status");
			const initialData = await initialStatus.json();
			expect(initialData.guestModeEnabled).toBe(true);
			expect(initialData.isAuthenticated).toBe(false);

			// 2. Setup - create first user
			const setupResponse = await fetch("/api/auth/setup", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					username: "admin",
					password: "securepass123",
					confirmPassword: "securepass123",
				}),
			});
			const setupData = await setupResponse.json();
			expect(setupData.success).toBe(true);

			// 3. Status after setup - authenticated, guest mode off
			const afterSetupStatus = await fetch("/api/auth/status");
			const afterSetupData = await afterSetupStatus.json();
			expect(afterSetupData.guestModeEnabled).toBe(false);
			expect(afterSetupData.isAuthenticated).toBe(true);

			// 4. Logout
			await fetch("/api/auth/logout", { method: "POST" });

			// 5. Status after logout - not authenticated, guest mode still off
			const afterLogoutStatus = await fetch("/api/auth/status");
			const afterLogoutData = await afterLogoutStatus.json();
			expect(afterLogoutData.guestModeEnabled).toBe(false);
			expect(afterLogoutData.isAuthenticated).toBe(false);

			// 6. Login again
			const loginResponse = await fetch("/api/auth/login", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					username: "admin",
					password: "securepass123",
				}),
			});
			const loginData = await loginResponse.json();
			expect(loginData.success).toBe(true);

			// 7. Final status - authenticated again
			const finalStatus = await fetch("/api/auth/status");
			const finalData = await finalStatus.json();
			expect(finalData.isAuthenticated).toBe(true);
			expect(finalData.user.username).toBe("admin");
		});
	});
});
