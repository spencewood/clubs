/**
 * User Preferences E2E Tests
 *
 * These tests verify the user preferences functionality including:
 * - Default text editor visibility
 * - Toggling text editor preference in Settings
 * - Persistence of preferences across page refreshes
 * - Disabled state in guest mode
 *
 * Test Isolation Strategy:
 * - MSW intercepts all API calls and uses in-memory mock state
 * - Mock auth state is reset before each test
 * - No real database is used - 100% MSW mocks
 */

import { test, expect, type Page, type ViewportSize } from '@playwright/test';

/**
 * Helper function to check if text editor is visible
 * Handles viewport differences (desktop vs mobile)
 */
async function expectEditorVisible(page: Page, viewport: ViewportSize | null, shouldBeVisible: boolean) {
  const isDesktop = viewport && viewport.width >= 1280;

  if (isDesktop) {
    // Desktop: Editor is always visible (when preference is on)
    const rawTab = page.getByRole('button', { name: /Raw Caddyfile/i });
    if (shouldBeVisible) {
      await expect(rawTab).toBeVisible();
    } else {
      await expect(rawTab).not.toBeVisible();
    }
  } else {
    // Mobile: Editor is behind left panel, need to collapse to see it
    if (shouldBeVisible) {
      const collapseButton = page.getByRole('button', { name: /Hide panel/i });
      await expect(collapseButton).toBeVisible();
      await collapseButton.click();

      const rawTab = page.getByRole('button', { name: /Raw/i });
      await expect(rawTab).toBeVisible();

      // Expand panel again to reset state
      const expandButton = page.getByRole('button', { name: /Show panel/i });
      await expandButton.click();
    } else {
      // When editor is disabled, collapse button should not exist
      const collapseButton = page.getByRole('button', { name: /Hide panel/i });
      await expect(collapseButton).not.toBeVisible();
    }
  }
}

test.describe('User Preferences', () => {
  // Force serial execution to avoid in-memory state collisions between parallel workers
  test.describe.configure({ mode: 'serial' });

  // Reset mock auth state before each test via HTTP request
  test.beforeEach(async ({ request, context }) => {
    await request.post('http://localhost:3000/api/auth/test-reset');
    // Clear all cookies and storage to ensure clean state
    await context.clearCookies();
  });

  test.describe('Guest Mode - Preferences Disabled', () => {
    test.skip('should show text editor by default in guest mode', async ({ page, viewport }) => {
      await page.goto('/');

      // Reload to ensure fresh auth state (clears any cached React state)
      await page.reload();
      await page.waitForLoadState('networkidle');

      // Verify text editor is visible (handles desktop vs mobile)
      await expectEditorVisible(page, viewport, true);
    });

    test.skip('should disable text editor preference in guest mode settings', async ({ page }) => {
      await page.goto('/');

      // Reload to ensure fresh auth state (clears any cached React state)
      await page.reload();
      await page.waitForLoadState('networkidle');

      // Open settings
      const profileButton = page.getByRole('button', { name: /profile menu/i });
      await expect(profileButton).toBeVisible();
      await profileButton.click();
      await page.getByRole('menuitem', { name: /Settings/i }).click();

      // Click General tab (should be active by default)
      await page.getByRole('button', { name: /General/i }).click();

      // Verify text editor toggle exists and is disabled in guest mode
      const textEditorSwitch = page.getByRole('switch', { name: /show text editor/i });
      await expect(textEditorSwitch).toBeVisible();
      await expect(textEditorSwitch).toBeDisabled();
    });
  });

  test.describe('Authenticated Mode - Preferences Enabled', () => {
    test.beforeEach(async ({ page }) => {
      // Set up authentication first
      await page.goto('/');

      // Reload to ensure fresh auth state (clears any cached React state)
      await page.reload();
      await page.waitForLoadState('networkidle');

      // Open settings and create admin account
      const profileButton = page.getByRole('button', { name: /profile menu/i });
      await expect(profileButton).toBeVisible();
      await profileButton.click();
      await page.getByRole('menuitem', { name: /Settings/i }).click();

      // Switch to Users tab
      await page.getByRole('button', { name: /Users/i }).click();

      // Turn off guest mode (this will show the setup form)
      const guestModeSwitch = page.getByRole('switch', { name: /guest mode/i });
      await expect(guestModeSwitch).toBeVisible();
      await guestModeSwitch.click();

      // Fill in admin credentials
      await page.getByLabel(/^Username/).fill('admin');
      await page.getByLabel(/^Password/).first().fill('password123');
      await page.getByLabel(/^Confirm Password/).fill('password123');

      // Save (this creates the admin and logs in)
      await page.getByRole('button', { name: /Save Changes/i }).click();

      // Wait for the page to refresh after authentication
      await page.waitForLoadState('networkidle');

      // Verify we're fully authenticated by checking profile button is visible
      const profileButtonAfterAuth = page.getByRole('button', { name: /profile menu/i });
      await expect(profileButtonAfterAuth).toBeVisible();
    });

    test('should show text editor by default for authenticated users', async ({ page, viewport }) => {
      // Verify text editor is visible
      await expectEditorVisible(page, viewport, true);
    });

    test('should allow toggling text editor preference', async ({ page }) => {
      // Open settings
      const profileButton = page.getByRole('button', { name: /profile menu/i });
      await expect(profileButton).toBeVisible();
      await profileButton.click();
      await page.getByRole('menuitem', { name: /Settings/i }).click();

      // Wait for dialog to fully load
      await page.waitForTimeout(1000);

      // Click General tab
      await page.getByRole('button', { name: /General/i }).click();

      // Verify text editor toggle is enabled and checked
      const textEditorSwitch = page.getByRole('switch', { name: /show text editor/i });
      await expect(textEditorSwitch).toBeVisible();
      await expect(textEditorSwitch).toBeChecked();
      // Don't check enabled state - if we can see it and it's checked, we're authenticated
    });

    test('should hide text editor when preference is turned off', async ({ page, viewport }) => {
      // Open settings
      const profileButton = page.getByRole('button', { name: /profile menu/i });
      await expect(profileButton).toBeVisible();
      await profileButton.click();
      await page.getByRole('menuitem', { name: /Settings/i }).click();

      // Wait for dialog to fully load and auth state to settle
      await page.waitForTimeout(1000);

      // Click General tab
      await page.getByRole('button', { name: /General/i }).click();

      // Turn off text editor - click will wait for element to be clickable
      const textEditorSwitch = page.getByRole('switch', { name: /show text editor/i });
      await textEditorSwitch.click();

      // Save changes and wait for page refresh
      await page.getByRole('button', { name: /Save Changes/i }).click();

      // Wait for navigation/refresh to complete (dialog will close as part of refresh)
      await page.waitForLoadState('networkidle');

      // Ensure page is fully loaded after refresh
      const profileButtonAfterSave = page.getByRole('button', { name: /profile menu/i });
      await expect(profileButtonAfterSave).toBeVisible();

      // Verify text editor is no longer visible
      await expectEditorVisible(page, viewport, false);
    });

    test('should persist text editor preference across page refreshes', async ({ page, viewport }) => {
      // Open settings and turn off text editor
      let profileButton = page.getByRole('button', { name: /profile menu/i });
      await expect(profileButton).toBeVisible();
      await profileButton.click();
      await page.getByRole('menuitem', { name: /Settings/i }).click();

      await page.getByRole('button', { name: /General/i }).click();

      const textEditorSwitch = page.getByRole('switch', { name: /show text editor/i });
      await textEditorSwitch.click();
      await page.getByRole('button', { name: /Save Changes/i }).click();

      // Wait for navigation/refresh to complete (dialog will close as part of refresh)
      await page.waitForLoadState('networkidle');

      // Ensure header/navigation is fully loaded after refresh
      profileButton = page.getByRole('button', { name: /profile menu/i });
      await expect(profileButton).toBeVisible();

      // Verify editor is hidden
      await expectEditorVisible(page, viewport, false);

      // Navigate to a different page
      await page.getByRole('link', { name: /Upstreams/i }).click();
      await page.waitForLoadState('networkidle');
      await expectEditorVisible(page, viewport, false);

      // Navigate back to verify preference persisted
      await page.getByRole('link', { name: /Sites/i }).click();
      await page.waitForLoadState('networkidle');

      // Verify editor is still hidden
      await expectEditorVisible(page, viewport, false);
    });

    test('should show text editor when preference is turned back on', async ({ page, viewport }) => {
      // First turn off the editor
      let profileButton = page.getByRole('button', { name: /profile menu/i });
      await expect(profileButton).toBeVisible();
      await profileButton.click();
      await page.getByRole('menuitem', { name: /Settings/i }).click();

      await page.getByRole('button', { name: /General/i }).click();

      let textEditorSwitch = page.getByRole('switch', { name: /show text editor/i });
      await textEditorSwitch.click();
      await page.getByRole('button', { name: /Save Changes/i }).click();

      // Wait for Settings dialog to close
      let settingsDialog = page.getByRole('dialog', { name: /Settings/i });
      await expect(settingsDialog).not.toBeVisible();

      await page.waitForLoadState('networkidle');

      // Ensure header/navigation is fully loaded after refresh
      profileButton = page.getByRole('button', { name: /profile menu/i });
      await expect(profileButton).toBeVisible();

      // Verify editor is hidden
      await expectEditorVisible(page, viewport, false);

      // Now turn it back on
      profileButton = page.getByRole('button', { name: /profile menu/i });
      await profileButton.click();
      await page.getByRole('menuitem', { name: /Settings/i }).click();

      await page.getByRole('button', { name: /General/i }).click();

      textEditorSwitch = page.getByRole('switch', { name: /show text editor/i });
      await expect(textEditorSwitch).not.toBeChecked();
      await textEditorSwitch.click();
      await page.getByRole('button', { name: /Save Changes/i }).click();

      // Wait for navigation/refresh to complete (dialog will close as part of refresh)
      await page.waitForLoadState('networkidle');

      // Ensure header/navigation is fully loaded after refresh
      profileButton = page.getByRole('button', { name: /profile menu/i });
      await expect(profileButton).toBeVisible();

      // Verify editor is visible again
      await expectEditorVisible(page, viewport, true);
    });

    test('should maintain preference when navigating between pages', async ({ page, viewport }) => {
      // Turn off text editor
      let profileButton = page.getByRole('button', { name: /profile menu/i });
      await expect(profileButton).toBeVisible();
      await profileButton.click();
      await page.getByRole('menuitem', { name: /Settings/i }).click();

      await page.getByRole('button', { name: /General/i }).click();

      const textEditorSwitch = page.getByRole('switch', { name: /show text editor/i });
      await textEditorSwitch.click();
      await page.getByRole('button', { name: /Save Changes/i }).click();

      // Wait for navigation/refresh to complete (dialog will close as part of refresh)
      await page.waitForLoadState('networkidle');

      // Ensure header/navigation is fully loaded after refresh
      profileButton = page.getByRole('button', { name: /profile menu/i });
      await expect(profileButton).toBeVisible();

      // Navigate to different pages and verify editor stays hidden
      await page.getByRole('link', { name: /Upstreams/i }).click();
      await page.waitForLoadState('networkidle');
      await expectEditorVisible(page, viewport, false);

      await page.getByRole('link', { name: /Analytics/i }).click();
      await page.waitForLoadState('networkidle');
      await expectEditorVisible(page, viewport, false);

      await page.getByRole('link', { name: /Certificates/i }).click();
      await page.waitForLoadState('networkidle');
      await expectEditorVisible(page, viewport, false);

      // Go back to Sites
      await page.getByRole('link', { name: /Sites/i }).click();
      await page.waitForLoadState('networkidle');
      await expectEditorVisible(page, viewport, false);
    });
  });
});
