import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright configuration for Clubs E2E tests
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
	testDir: "./tests",

	/* Global setup to run before all tests */
	globalSetup: "./tests/global-setup.ts",

	/* Run tests in files in parallel */
	fullyParallel: true,

	/* Fail the build on CI if you accidentally left test.only in the source code. */
	forbidOnly: !!process.env.CI,

	/* Retry on CI and locally for flaky tests */
	retries: process.env.CI ? 3 : 2,

	/* Opt out of parallel tests on CI. */
	workers: process.env.CI ? 1 : undefined,

	/* Reporter to use. See https://playwright.dev/docs/test-reporters */
	reporter: "html",

	/* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
	use: {
		/* Base URL to use in actions like `await page.goto('/')`. */
		baseURL: "http://localhost:3000",

		/* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
		trace: "on-first-retry",

		/* Screenshot on failure */
		screenshot: "only-on-failure",

		/* Increased timeout for actions to handle slower environments */
		actionTimeout: 15000, // 15 seconds for individual actions
	},

	/* Configure projects for major browsers */
	projects: [
		{
			name: "chromium",
			use: { ...devices["Desktop Chrome"] },
		},

		/* Test against mobile viewports. */
		{
			name: "mobile",
			use: { ...devices["Pixel 5"] },
		},
	],

	/* Run your local dev server before starting the tests */
	webServer: {
		command: "pnpm dev",
		url: "http://localhost:3000",
		reuseExistingServer: false,
		stdout: "pipe",
		stderr: "pipe",
		env: {
			E2E_TEST: "true", // Enable MSW in Next.js server for E2E tests
		},
	},
});
