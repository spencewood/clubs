import { test, expect } from '@playwright/test';

test.describe('Clubs - Caddy Configuration Manager', () => {
  test('seed', async ({ page }) => {
    // Navigate to the Clubs application
    await page.goto('http://localhost:3000');

    // Wait for the page to load - look for the main heading
    await page.waitForSelector('h1, [role="heading"]', { timeout: 10000 });

    // Verify we're on the Clubs application
    await expect(page).toHaveTitle(/Clubs/);
  });
});
