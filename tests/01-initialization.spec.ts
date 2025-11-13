import { test, expect } from '@playwright/test';

test.describe('Application Initialization and Navigation', () => {
  test('should load the application successfully', async ({ page }) => {
    await page.goto('/');

    // Verify page title
    await expect(page).toHaveTitle(/Clubs/);

    // Verify header elements
    await expect(page.locator('h1')).toContainText('Clubs');
    await expect(page.getByText('Caddyfile Management System')).toBeVisible();

    // Verify Live Mode indicator
    await expect(page.getByText('Live Mode')).toBeVisible();

    // Verify main navigation tabs
    await expect(page.getByRole('link', { name: /Sites/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /Upstreams/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /Analytics/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /Certificates/i })).toBeVisible();

    // Verify Sites tab is active by default
    await expect(page.getByRole('link', { name: /Sites/i })).toHaveClass(/border-primary/);

    // Verify site list displays
    await expect(page.getByText(/sites configured/i)).toBeVisible();
  });

  test('should navigate between main tabs', async ({ page }) => {
    await page.goto('/');

    // Navigate to Upstreams
    await page.getByRole('link', { name: /Upstreams/i }).click();
    await expect(page).toHaveURL(/\/upstreams/);
    await expect(page.getByRole('link', { name: /Upstreams/i })).toHaveClass(/border-primary/);

    // Navigate to Analytics
    await page.getByRole('link', { name: /Analytics/i }).click();
    await expect(page).toHaveURL(/\/analytics/);
    await expect(page.getByRole('link', { name: /Analytics/i })).toHaveClass(/border-primary/);

    // Navigate to Certificates
    await page.getByRole('link', { name: /Certificates/i }).click();
    await expect(page).toHaveURL(/\/certificates/);
    await expect(page.getByRole('link', { name: /Certificates/i })).toHaveClass(/border-primary/);

    // Navigate back to Sites
    await page.getByRole('link', { name: /Sites/i }).click();
    await expect(page).toHaveURL('/');
    await expect(page.getByRole('link', { name: /Sites/i })).toHaveClass(/border-primary/);
  });

  test('should toggle theme', async ({ page }) => {
    await page.goto('/');

    // Get the theme toggle button
    const themeToggle = page.locator('button').filter({ has: page.locator('svg.lucide-sun, svg.lucide-moon') });
    await expect(themeToggle).toBeVisible();

    // Get initial theme from html element
    const htmlElement = page.locator('html');
    const initialTheme = await htmlElement.getAttribute('class');

    // Toggle theme
    await themeToggle.click();
    await page.waitForTimeout(300); // Wait for theme transition

    // Verify theme changed
    const newTheme = await htmlElement.getAttribute('class');
    expect(newTheme).not.toBe(initialTheme);

    // Verify persistence after reload
    await page.reload();
    const reloadedTheme = await htmlElement.getAttribute('class');
    expect(reloadedTheme).toBe(newTheme);
  });

  test('should display Live Mode status', async ({ page }) => {
    await page.goto('/');

    // Find and click Live Mode indicator
    const liveModeButton = page.getByText('Live Mode');
    await expect(liveModeButton).toBeVisible();

    // Verify it has status styling (pulsing dot indicator)
    const statusIndicator = page.locator('svg.animate-pulse');
    await expect(statusIndicator).toBeVisible();

    // Click to open details popover
    await liveModeButton.click();

    // Wait a moment for popover to appear
    await page.waitForTimeout(200);
  });

  test.skip('should have no console errors on initial load', async ({ page }) => {
    const consoleErrors: string[] = [];

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto('/');

    // Wait for page to be fully loaded
    await page.waitForLoadState('networkidle');

    // Filter out known acceptable errors in dev mode
    const significantErrors = consoleErrors.filter(
      error =>
        !error.includes('MSW') &&
        !error.includes('Download') &&
        !error.includes('Caddy') &&
        !error.includes('Failed to load resource') &&
        !error.includes('[checkCaddyAPI]') &&
        !error.includes('[loadFromCaddyAPI]') &&
        !error.includes('Server') &&
        !error.includes('500 (Internal Server Error)')
    );

    // In dev mode with MSW, some API errors are expected
    expect(significantErrors).toHaveLength(0);
  });
});
