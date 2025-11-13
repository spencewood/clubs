import { test, expect } from '@playwright/test';

test.describe('Responsive Design', () => {
  test('should display mobile layout correctly', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');

    // Verify page loads
    await expect(page.locator('h1')).toContainText('Clubs');

    // Verify navigation is accessible (may be hamburger menu or tabs)
    await expect(page.getByRole('link', { name: /Sites/i })).toBeVisible();

    // Verify site cards stack vertically
    const siteCards = page.locator('.rounded-lg.border.bg-card').filter({
      has: page.locator('svg.lucide-globe')
    });

    if (await siteCards.count() >= 2) {
      const firstCard = siteCards.first();
      const secondCard = siteCards.nth(1);

      const firstBox = await firstCard.boundingBox();
      const secondBox = await secondCard.boundingBox();

      // Second card should be below first card (not side by side)
      if (firstBox && secondBox) {
        expect(secondBox.y).toBeGreaterThan(firstBox.y);
      }
    }
  });

  test('should display tablet layout correctly', async ({ page }) => {
    // Set tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/');

    // Verify page loads
    await expect(page.locator('h1')).toContainText('Clubs');

    // Verify all navigation is visible
    await expect(page.getByRole('link', { name: /Sites/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /Upstreams/i })).toBeVisible();
  });

  test('should display desktop layout correctly', async ({ page }) => {
    // Set desktop viewport
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('/');

    // Verify page loads
    await expect(page.locator('h1')).toContainText('Clubs');

    // All navigation should be visible
    await expect(page.getByRole('link', { name: /Sites/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /Upstreams/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /Analytics/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /Certificates/i })).toBeVisible();
  });

  test('should handle viewport changes', async ({ page }) => {
    await page.goto('/');

    // Start with desktop
    await page.setViewportSize({ width: 1920, height: 1080 });
    await expect(page.locator('h1')).toBeVisible();

    // Resize to mobile
    await page.setViewportSize({ width: 375, height: 667 });
    await expect(page.locator('h1')).toBeVisible();

    // Resize back to desktop
    await page.setViewportSize({ width: 1920, height: 1080 });
    await expect(page.locator('h1')).toBeVisible();
  });

  test('should not require horizontal scrolling on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');

    // Wait for page to be fully rendered
    await page.waitForLoadState('networkidle');

    // Get document width
    const documentWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const viewportWidth = 375;

    // Document width should not exceed viewport width significantly (allow 20px tolerance)
    expect(documentWidth).toBeLessThanOrEqual(viewportWidth + 20);
  });

  test('should hide/show mobile-specific elements', async ({ page }) => {
    await page.goto('/');

    // Check mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    // "Live Mode" text is hidden on mobile but button container is visible
    const liveModeButton = page.locator('button').filter({ hasText: 'Live Mode' });
    await expect(liveModeButton).toBeVisible();

    // Check desktop viewport
    await page.setViewportSize({ width: 1920, height: 1080 });

    // On desktop, the "Live Mode" text should be visible
    const liveModeText = page.getByText('Live Mode', { exact: true });
    await expect(liveModeText).toBeVisible();
  });

  test('should maintain functionality on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');

    // Test navigation works on mobile
    await page.getByRole('link', { name: /Upstreams/i }).click();
    await expect(page).toHaveURL(/\/upstreams/);

    await page.getByRole('link', { name: /Sites/i }).click();
    await expect(page).toHaveURL('/');

    // Verify main content is visible (button interaction tested elsewhere)
    await expect(page.getByRole('heading', { name: /Sites/i })).toBeVisible();
  });
});
