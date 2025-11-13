import { test, expect } from '@playwright/test';

test.describe('Navigation and Views', () => {
  test('should load upstreams view', async ({ page }) => {
    await page.goto('/upstreams');

    // Verify we're on upstreams page
    await expect(page).toHaveURL(/\/upstreams/);
    await expect(page.getByRole('link', { name: /Upstreams/i })).toHaveClass(/border-primary/);

    // Verify upstreams content is visible
    await expect(page.getByText(/Upstreams/i).first()).toBeVisible();
  });

  test('should load analytics view', async ({ page }) => {
    await page.goto('/analytics');

    // Verify we're on analytics page
    await expect(page).toHaveURL(/\/analytics/);
    await expect(page.getByRole('link', { name: /Analytics/i })).toHaveClass(/border-primary/);

    // Verify analytics content is visible
    await expect(page.getByText(/Analytics/i).first()).toBeVisible();
  });

  test('should load certificates view', async ({ page }) => {
    await page.goto('/certificates');

    // Verify we're on certificates page
    await expect(page).toHaveURL(/\/certificates/);
    await expect(page.getByRole('link', { name: /Certificates/i })).toHaveClass(/border-primary/);

    // Verify certificates content is visible
    await expect(page.getByText(/Certificates/i).first()).toBeVisible();
  });

  test('should persist navigation state on refresh', async ({ page }) => {
    // Navigate to analytics
    await page.goto('/analytics');
    await expect(page).toHaveURL(/\/analytics/);

    // Reload page
    await page.reload();

    // Verify still on analytics page
    await expect(page).toHaveURL(/\/analytics/);
    await expect(page.getByRole('link', { name: /Analytics/i })).toHaveClass(/border-primary/);
  });

  test('should handle direct URL navigation', async ({ page }) => {
    // Navigate directly to certificates
    await page.goto('/certificates');
    await expect(page.getByRole('link', { name: /Certificates/i })).toHaveClass(/border-primary/);

    // Navigate directly to upstreams
    await page.goto('/upstreams');
    await expect(page.getByRole('link', { name: /Upstreams/i })).toHaveClass(/border-primary/);

    // Navigate directly to home
    await page.goto('/');
    await expect(page.getByRole('link', { name: /Sites/i })).toHaveClass(/border-primary/);
  });

  test('should show consistent header across all pages', async ({ page }) => {
    const pages = ['/', '/upstreams', '/analytics', '/certificates'];

    for (const url of pages) {
      await page.goto(url);

      // Verify header elements are present
      await expect(page.locator('h1')).toContainText('Clubs');
      await expect(page.getByText('Live Mode')).toBeVisible();

      // Verify all nav tabs are visible
      await expect(page.getByRole('link', { name: /Sites/i })).toBeVisible();
      await expect(page.getByRole('link', { name: /Upstreams/i })).toBeVisible();
      await expect(page.getByRole('link', { name: /Analytics/i })).toBeVisible();
      await expect(page.getByRole('link', { name: /Certificates/i })).toBeVisible();
    }
  });
});
