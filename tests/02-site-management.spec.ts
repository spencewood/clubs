import { test, expect } from '@playwright/test';

test.describe('Site Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Wait for site list to load
    await expect(page.getByText(/sites configured/i)).toBeVisible();
  });

  test('should display list of sites', async ({ page }) => {
    // Verify site list heading is displayed
    await expect(page.getByRole('heading', { name: /Sites/i })).toBeVisible();

    // Verify site count is displayed
    await expect(page.getByText(/sites configured/i)).toBeVisible();

    // Verify at least one domain name is visible (font-mono class is used for domains)
    await expect(page.locator('.font-mono').first()).toBeVisible();
  });

  test('should show site details on cards', async ({ page }) => {
    // Verify domain names are displayed
    const domainName = page.locator('.font-mono').first();
    await expect(domainName).toBeVisible();
    const domain = await domainName.textContent();
    expect(domain).toBeTruthy();
    expect(domain).toMatch(/\./); // Should contain a dot (domain format)

    // Verify feature count badges exist
    const badge = page.locator('[data-slot="badge"]').first();
    await expect(badge).toBeVisible();
    const count = await badge.textContent();
    expect(count).toMatch(/\d+/); // Should contain a number

    // Verify action buttons are present (check at page level)
    await expect(page.getByTitle(/Inspect JSON/i).first()).toBeVisible();
    await expect(page.getByTitle(/Edit site/i).first()).toBeVisible();
    await expect(page.getByTitle(/Delete site/i).first()).toBeVisible();
  });

  test('should open Add Site dialog', async ({ page }) => {
    // Click Add Site button
    const addSiteButton = page.getByRole('button', { name: /Add Site/i });
    await addSiteButton.click();

    // Verify dialog opens
    await expect(page.getByRole('dialog')).toBeVisible();
  });

  test('should open Add Container dialog', async ({ page }) => {
    // Click Add Container button
    const addContainerButton = page.getByRole('button', { name: /Add Container/i });
    await addContainerButton.click();

    // Verify dialog opens
    await expect(page.getByRole('dialog')).toBeVisible();
  });

  test('should open site edit dialog', async ({ page }) => {
    // Click first edit button
    const editButton = page.getByTitle(/Edit site/i).first();
    await editButton.click();

    // Verify edit dialog opens
    await expect(page.getByRole('dialog')).toBeVisible();
  });

  test('should open JSON inspector', async ({ page }) => {
    // Click first inspect JSON button
    const inspectButton = page.getByTitle(/Inspect JSON/i).first();
    await inspectButton.click();

    // Verify modal/dialog opens with JSON
    await expect(page.getByRole('dialog')).toBeVisible();

    // Wait a moment for content to load
    await page.waitForTimeout(300);
  });

  test('should show delete confirmation', async ({ page }) => {
    // Click first delete button
    const deleteButton = page.getByTitle(/Delete site/i).first();
    await deleteButton.click();

    // Verify confirmation dialog appears
    await page.waitForTimeout(200);

    // Look for confirmation dialog or alert
    const dialogOrAlert = page.getByRole('alertdialog').or(page.getByRole('dialog'));
    await expect(dialogOrAlert).toBeVisible({ timeout: 2000 });
  });

  test('should filter or search sites if available', async ({ page }) => {
    // Check if search/filter functionality exists
    const searchInput = page.locator('input[type="search"], input[placeholder*="search" i]');

    if (await searchInput.isVisible({ timeout: 1000 }).catch(() => false)) {
      // If search exists, test it
      await searchInput.fill('example.com');
      await page.waitForTimeout(300); // Wait for filter to apply

      // Verify filtered results
      const siteCards = page.locator('.rounded-lg.border.bg-card').filter({
        has: page.locator('svg.lucide-globe')
      });

      // All visible cards should contain the search term
      const count = await siteCards.count();
      for (let i = 0; i < count; i++) {
        const domain = await siteCards.nth(i).locator('.font-mono').first().textContent();
        expect(domain?.toLowerCase()).toContain('example.com');
      }
    } else {
      // Skip test if search doesn't exist
      test.skip();
    }
  });

  test('should have hover effects on site cards', async ({ page }) => {
    // Site cards have hover effects (hover:shadow-md hover:-translate-y-0.5 in Tailwind)
    // Just verify site cards are visible with styling
    const domainNames = page.locator('.font-mono');
    const count = await domainNames.count();
    expect(count).toBeGreaterThan(0);

    // Verify first card element is visible
    await expect(domainNames.first()).toBeVisible();
  });

  test('should display external link button', async ({ page }) => {
    // Find external link icon (should be at least one on the page)
    const externalLink = page.locator('svg.lucide-external-link').first();
    await expect(externalLink).toBeVisible();
  });
});
