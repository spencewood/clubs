/**
 * Authentication System E2E Tests
 *
 * These tests verify the complete authentication flow including:
 * - Initial guest mode state
 * - First-time setup (creating admin user)
 * - Login/logout functionality
 * - Session management
 *
 * Test Isolation Strategy:
 * - MSW intercepts all API calls and uses in-memory mock state
 * - Mock auth state is reset before each test
 * - No real database is used - 100% MSW mocks
 * - This avoids Edge Runtime errors and database synchronization issues
 */

import { test, expect } from '@playwright/test';

test.describe('Authentication System', () => {
  // Force serial execution to avoid in-memory state collisions between parallel workers
  test.describe.configure({ mode: 'serial' });

  // Reset mock auth state before each test via HTTP request
  test.beforeEach(async ({ request }) => {
    await request.post('http://localhost:3000/api/auth/test-reset');
  });

  test.describe('Initial Guest Mode State', () => {
    test('should show profile icon in guest mode', async ({ page }) => {
      await page.goto('/');

      // Verify profile icon is visible
      const profileButton = page.getByRole('button', { name: /profile menu/i });
      await expect(profileButton).toBeVisible();
    });

    test('should show Settings option in profile dropdown', async ({ page }) => {
      await page.goto('/');

      // Open profile dropdown
      await page.getByRole('button', { name: /profile menu/i }).click();

      // Verify Settings option is visible
      await expect(page.getByRole('menuitem', { name: /Settings/i })).toBeVisible();

      // In guest mode, Logout should not be visible yet
      const logoutOption = page.getByRole('menuitem', { name: /Logout/i });
      await expect(logoutOption).not.toBeVisible();
    });
  });

  test.describe('Settings Dialog', () => {
    test('should open settings dialog when clicking Settings', async ({ page }) => {
      await page.goto('/');

      // Open profile dropdown
      await page.getByRole('button', { name: /profile menu/i }).click();

      // Click Settings
      await page.getByRole('menuitem', { name: /Settings/i }).click();
      await page.getByRole('button', { name: /Users/i }).click();

      // Verify settings dialog is open
      await expect(page.getByRole('heading', { name: /Settings/i })).toBeVisible();
      await expect(page.getByText(/Configure your Clubs preferences/i)).toBeVisible();
    });

    test('should show guest mode toggle in settings', async ({ page }) => {
      await page.goto('/');

      // Open settings
      await page.getByRole('button', { name: /profile menu/i }).click();
      await page.getByRole('menuitem', { name: /Settings/i }).click();
      await page.getByRole('button', { name: /Users/i }).click();

      // Verify guest mode toggle is visible
      await expect(page.getByText(/Guest mode is currently enabled/i)).toBeVisible();
      await expect(page.getByRole('switch', { name: /Guest Mode/i })).toBeVisible();
    });

    test('should show credentials form when enabling disable guest mode', async ({ page }) => {
      await page.goto('/');

      // Open settings
      await page.getByRole('button', { name: /profile menu/i }).click();
      await page.getByRole('menuitem', { name: /Settings/i }).click();
      await page.getByRole('button', { name: /Users/i }).click();

      // Click to enable "Disable Guest Mode"
      await page.getByRole('switch', { name: /Guest Mode/i }).click();
      // Wait for the admin creation form to appear
      await expect(page.getByLabel(/Username/i)).toBeVisible();
      await expect(page.getByLabel(/^Password \*$/)).toBeVisible();

      // Verify credentials form appears
      await expect(page.getByLabel(/Username/i)).toBeVisible();
      await expect(page.getByLabel(/^Password \*$/)).toBeVisible();
      await expect(page.getByLabel(/Confirm Password/i)).toBeVisible();
    });

    test('should close settings dialog on cancel', async ({ page }) => {
      await page.goto('/');

      // Open settings
      await page.getByRole('button', { name: /profile menu/i }).click();
      await page.getByRole('menuitem', { name: /Settings/i }).click();
      await page.getByRole('button', { name: /Users/i }).click();

      // Click Cancel
      await page.getByRole('button', { name: /Cancel/i }).click();

      // Verify dialog is closed
      await expect(page.getByRole('heading', { name: /Settings/i })).not.toBeVisible();
    });
  });

  test.describe('Setup Flow - First User Creation', () => {
    test('should validate username length (min 3 characters)', async ({ page }) => {
      await page.goto('/');

      // Open settings and enable auth
      await page.getByRole('button', { name: /profile menu/i }).click();
      await page.getByRole('menuitem', { name: /Settings/i }).click();
      await page.getByRole('button', { name: /Users/i }).click();
      await page.getByRole('switch', { name: /Guest Mode/i }).click();
      // Wait for the admin creation form to appear
      await expect(page.getByLabel(/Username/i)).toBeVisible();
      await expect(page.getByLabel(/^Password \*$/)).toBeVisible();

      // Enter short username
      await page.getByLabel(/Username/i).fill('ab');
      await page.getByLabel(/^Password \*$/).fill('password123');
      await page.getByLabel(/Confirm Password/i).fill('password123');

      // Try to save
      await page.getByRole('button', { name: /Save Changes/i }).click();

      // Verify error message appears
      await expect(page.getByText(/Username must be at least 3 characters/i)).toBeVisible();
    });

    test('should validate password length (min 8 characters)', async ({ page }) => {
      await page.goto('/');

      // Open settings and enable auth
      await page.getByRole('button', { name: /profile menu/i }).click();
      await page.getByRole('menuitem', { name: /Settings/i }).click();
      await page.getByRole('button', { name: /Users/i }).click();
      await page.getByRole('switch', { name: /Guest Mode/i }).click();
      // Wait for the admin creation form to appear
      await expect(page.getByLabel(/Username/i)).toBeVisible();
      await expect(page.getByLabel(/^Password \*$/)).toBeVisible();

      // Enter short password
      await page.getByLabel(/Username/i).fill('admin');
      await page.getByLabel(/^Password \*$/).fill('short');
      await page.getByLabel(/Confirm Password/i).fill('short');

      // Try to save
      await page.getByRole('button', { name: /Save Changes/i }).click();

      // Verify error message appears
      await expect(page.getByText(/Password must be at least 8 characters/i)).toBeVisible();
    });

    test('should validate password confirmation match', async ({ page }) => {
      await page.goto('/');

      // Open settings and enable auth
      await page.getByRole('button', { name: /profile menu/i }).click();
      await page.getByRole('menuitem', { name: /Settings/i }).click();
      await page.getByRole('button', { name: /Users/i }).click();
      await page.getByRole('switch', { name: /Guest Mode/i }).click();
      // Wait for the admin creation form to appear
      await expect(page.getByLabel(/Username/i)).toBeVisible();
      await expect(page.getByLabel(/^Password \*$/)).toBeVisible();

      // Enter mismatched passwords
      await page.getByLabel(/Username/i).fill('admin');
      await page.getByLabel(/^Password \*$/).fill('password123');
      await page.getByLabel(/Confirm Password/i).fill('different123');

      // Try to save
      await page.getByRole('button', { name: /Save Changes/i }).click();

      // Verify error message appears
      await expect(page.getByText(/do not match/i)).toBeVisible();
    });

    test('should successfully create first user and disable guest mode', async ({ page }) => {
      await page.goto('/');

      // Open settings and enable auth
      await page.getByRole('button', { name: /profile menu/i }).click();
      await page.getByRole('menuitem', { name: /Settings/i }).click();
      await page.getByRole('button', { name: /Users/i }).click();
      await page.getByRole('switch', { name: /Guest Mode/i }).click();
      // Wait for the admin creation form to appear
      await expect(page.getByLabel(/Username/i)).toBeVisible();
      await expect(page.getByLabel(/^Password \*$/)).toBeVisible();

      // Fill in valid credentials
      await page.getByLabel(/Username/i).fill('admin');
      await page.getByLabel(/^Password \*$/).fill('password123');
      await page.getByLabel(/Confirm Password/i).fill('password123');

      // Save
      await page.getByRole('button', { name: /Save Changes/i }).click();

      // Verify success toast appears
      await expect(page.getByText(/Authentication enabled/i)).toBeVisible();

      // Verify dialog closes
      await expect(page.getByRole('heading', { name: /Settings/i })).not.toBeVisible();

      // Verify profile dropdown now shows username
      await page.getByRole('button', { name: /profile menu/i }).click();
      await expect(page.getByRole('menu').getByText('admin')).toBeVisible();

      // Verify Logout option is now available
      await expect(page.getByRole('menuitem', { name: /Logout/i })).toBeVisible();
    });
  });

  test.describe('Login Flow', () => {
    test.beforeEach(async ({ page }) => {
      // Set up a user first
      await page.goto('/');

      // Wait for page to be fully loaded before interacting
      await expect(page.locator('h1')).toBeVisible();

      await page.getByRole('button', { name: /profile menu/i }).click();
      await page.getByRole('menuitem', { name: /Settings/i }).click();
      await page.getByRole('button', { name: /Users/i }).click();

      // Wait for settings dialog to be fully visible
      await expect(page.getByRole('heading', { name: /Settings/i })).toBeVisible();

      await page.getByRole('switch', { name: /Guest Mode/i }).click();

      // Wait for the admin creation form to appear with increased timeout
      await expect(page.getByLabel(/Username/i)).toBeVisible({ timeout: 10000 });
      await expect(page.getByLabel(/^Password \*$/)).toBeVisible({ timeout: 10000 });

      await page.getByLabel(/Username/i).fill('testuser');
      await page.getByLabel(/^Password \*$/).fill('testpass123');
      await page.getByLabel(/Confirm Password/i).fill('testpass123');
      await page.getByRole('button', { name: /Save Changes/i }).click();

      // Wait for setup to complete
      await expect(page.getByText(/Authentication enabled/i)).toBeVisible();

      // Now logout
      await page.getByRole('button', { name: /profile menu/i }).click();
      await page.getByRole('menuitem', { name: /Logout/i }).click();

      // Wait for redirect to login page
      await page.waitForURL(/\/login/);

      // Wait for login page to be fully loaded
      await expect(page.getByRole('heading', { name: /Login to Clubs/i })).toBeVisible();
    });

    test('should show login page after logout', async ({ page }) => {
      // Verify login page elements
      await expect(page.getByRole('heading', { name: /Login to Clubs/i })).toBeVisible();
      await expect(page.getByLabel(/Username/i)).toBeVisible();
      await expect(page.getByLabel(/Password/i)).toBeVisible();
      await expect(page.getByRole('button', { name: /Login/i })).toBeVisible();
    });

    test('should fail login with incorrect password', async ({ page }) => {
      // Try to login with wrong password
      await page.getByLabel(/Username/i).fill('testuser');
      await page.getByLabel(/Password/i).fill('wrongpassword');
      await page.getByRole('button', { name: /Login/i }).click();

      // Verify error message
      await expect(page.getByText(/Invalid username or password/i)).toBeVisible();

      // Should still be on login page
      await expect(page).toHaveURL(/\/login/);
    });

    test('should fail login with non-existent username', async ({ page }) => {
      // Try to login with non-existent user
      await page.getByLabel(/Username/i).fill('nonexistent');
      await page.getByLabel(/Password/i).fill('password123');
      await page.getByRole('button', { name: /Login/i }).click();

      // Verify error message
      await expect(page.getByText(/Invalid username or password/i)).toBeVisible();
    });

    test('should successfully login with correct credentials', async ({ page }) => {
      // Login with correct credentials
      await page.getByLabel(/Username/i).fill('testuser');
      await page.getByLabel(/Password/i).fill('testpass123');
      await page.getByRole('button', { name: /Login/i }).click();

      // Should redirect to home page
      await expect(page).toHaveURL('/');

      // Wait for home page to be fully loaded
      await expect(page.locator('h1')).toContainText('Clubs');

      // Verify authenticated state
      await page.getByRole('button', { name: /profile menu/i }).click();
      await expect(page.getByText('testuser')).toBeVisible();
      await expect(page.getByRole('menuitem', { name: /Logout/i })).toBeVisible();
    });
  });

  test.describe('Logout Flow', () => {
    test.beforeEach(async ({ page }) => {
      // Set up a user and stay logged in
      await page.goto('/');

      // Wait for page to be fully loaded before interacting
      await expect(page.locator('h1')).toBeVisible();

      await page.getByRole('button', { name: /profile menu/i }).click();
      await page.getByRole('menuitem', { name: /Settings/i }).click();
      await page.getByRole('button', { name: /Users/i }).click();

      // Wait for settings dialog to be fully visible
      await expect(page.getByRole('heading', { name: /Settings/i })).toBeVisible();

      await page.getByRole('switch', { name: /Guest Mode/i }).click();

      // Wait for the admin creation form to appear with increased timeout
      await expect(page.getByLabel(/Username/i)).toBeVisible({ timeout: 10000 });
      await expect(page.getByLabel(/^Password \*$/)).toBeVisible({ timeout: 10000 });

      await page.getByLabel(/Username/i).fill('testuser');
      await page.getByLabel(/^Password \*$/).fill('testpass123');
      await page.getByLabel(/Confirm Password/i).fill('testpass123');
      await page.getByRole('button', { name: /Save Changes/i }).click();
      await expect(page.getByText(/Authentication enabled/i)).toBeVisible();
    });

    test('should show logout option when authenticated', async ({ page }) => {
      await page.getByRole('button', { name: /profile menu/i }).click();
      await expect(page.getByRole('menuitem', { name: /Logout/i })).toBeVisible();
    });

    test('should logout and redirect to login page', async ({ page }) => {
      // Click logout
      await page.getByRole('button', { name: /profile menu/i }).click();
      await page.getByRole('menuitem', { name: /Logout/i }).click();

      // Should redirect to login page
      await expect(page).toHaveURL(/\/login/);

      // Wait for login page to be fully loaded
      await expect(page.getByRole('heading', { name: /Login to Clubs/i })).toBeVisible();

      // Verify logout success message
      await expect(page.getByText(/Logged out successfully/i)).toBeVisible();
    });

    test('should not be able to access protected pages after logout', async ({ page }) => {
      // Logout
      await page.getByRole('button', { name: /profile menu/i }).click();
      await page.getByRole('menuitem', { name: /Logout/i }).click();
      await page.waitForURL(/\/login/);

      // Wait for login page to be fully loaded
      await expect(page.getByRole('heading', { name: /Login to Clubs/i })).toBeVisible();

      // Try to navigate to home page
      await page.goto('/');

      // Should be redirected back to login
      await expect(page).toHaveURL(/\/login/);

      // Wait for login page to be fully loaded again
      await expect(page.getByRole('heading', { name: /Login to Clubs/i })).toBeVisible();
    });
  });

  test.describe('Complete End-to-End Auth Flow', () => {
    test('@smoke should handle complete guest → setup → logout → login flow', async ({ page }) => {
      // Step 1: Start in guest mode
      await page.goto('/');

      // Wait for page to be fully loaded before checking h1
      await expect(page.locator('h1')).toBeVisible({ timeout: 10000 });
      await expect(page.locator('h1')).toContainText('Clubs');

      // Step 2: Open settings and verify guest mode is enabled
      await page.getByRole('button', { name: /profile menu/i }).click();
      await page.getByRole('menuitem', { name: /Settings/i }).click();
      await page.getByRole('button', { name: /Users/i }).click();
      await expect(page.getByText(/Guest mode is currently enabled/i)).toBeVisible();

      // Step 3: Disable guest mode and create admin user
      await page.getByRole('switch', { name: /Guest Mode/i }).click();
      // Wait for the admin creation form to appear
      await expect(page.getByLabel(/Username/i)).toBeVisible();
      await expect(page.getByLabel(/^Password \*$/)).toBeVisible();
      await expect(page.getByLabel(/^Password \*$/)).toBeVisible();
      await page.getByLabel(/Username/i).fill('admin');
      await page.getByLabel(/^Password \*$/).fill('securepass123');
      await page.getByLabel(/Confirm Password/i).fill('securepass123');
      await page.getByRole('button', { name: /Save Changes/i }).click();

      // Wait for dialog to close (indicates success) - give it more time
      await expect(page.getByRole('heading', { name: /Settings/i })).not.toBeVisible({ timeout: 15000 });

      // Step 4: Verify authenticated state
      await page.getByRole('button', { name: /profile menu/i }).click();
      await expect(page.getByRole('menu').getByText('admin')).toBeVisible();

      // Step 5: Open settings again and verify auth is enabled
      await page.getByRole('menuitem', { name: /Settings/i }).click();
      await page.getByRole('button', { name: /Users/i }).click();
      await expect(page.getByText(/Authentication is enabled/i)).toBeVisible();
      await expect(page.getByText(/Logged in as/i)).toBeVisible();
      await page.getByRole('button', { name: /Cancel/i }).click();

      // Step 6: Logout
      await page.getByRole('button', { name: /profile menu/i }).click();
      await page.getByRole('menuitem', { name: /Logout/i }).click();
      await expect(page).toHaveURL(/\/login/);

      // Wait for login page to be fully loaded
      await expect(page.getByRole('heading', { name: /Login to Clubs/i })).toBeVisible();

      // Step 7: Verify cannot access home without login
      await page.goto('/');
      await expect(page).toHaveURL(/\/login/);

      // Wait for login page to be fully loaded again
      await expect(page.getByRole('heading', { name: /Login to Clubs/i })).toBeVisible();

      // Step 8: Login with correct credentials
      await page.getByLabel(/Username/i).fill('admin');
      await page.getByLabel(/Password/i).fill('securepass123');
      await page.getByRole('button', { name: /Login/i }).click();

      // Step 9: Verify back on home page and authenticated
      await expect(page).toHaveURL('/');

      // Wait for home page to be fully loaded
      await expect(page.locator('h1')).toContainText('Clubs');

      await page.getByRole('button', { name: /profile menu/i }).click();
      await expect(page.getByRole('menu').getByText('admin')).toBeVisible();
      await expect(page.getByRole('menuitem', { name: /Logout/i })).toBeVisible();
    });
  });

  test.describe('Settings Dialog After Authentication', () => {
    test.beforeEach(async ({ page }) => {
      // Set up a user
      await page.goto('/');

      // Wait for page to be fully loaded before interacting
      await expect(page.locator('h1')).toBeVisible();

      await page.getByRole('button', { name: /profile menu/i }).click();
      await page.getByRole('menuitem', { name: /Settings/i }).click();
      await page.getByRole('button', { name: /Users/i }).click();

      // Wait for settings dialog to be fully visible
      await expect(page.getByRole('heading', { name: /Settings/i })).toBeVisible();

      await page.getByRole('switch', { name: /Guest Mode/i }).click();

      // Wait for the admin creation form to appear with increased timeout
      await expect(page.getByLabel(/Username/i)).toBeVisible({ timeout: 10000 });
      await expect(page.getByLabel(/^Password \*$/)).toBeVisible({ timeout: 10000 });

      await page.getByLabel(/Username/i).fill('admin');
      await page.getByLabel(/^Password \*$/).fill('password123');
      await page.getByLabel(/Confirm Password/i).fill('password123');
      await page.getByRole('button', { name: /Save Changes/i }).click();
      await expect(page.getByText(/Authentication enabled/i)).toBeVisible();
    });

    test('should show authenticated status in settings', async ({ page }) => {
      // Open settings
      await page.getByRole('button', { name: /profile menu/i }).click();
      await page.getByRole('menuitem', { name: /Settings/i }).click();
      await page.getByRole('button', { name: /Users/i }).click();

      // Verify shows authenticated status
      await expect(page.getByText(/Authentication is enabled/i)).toBeVisible();
      await expect(page.getByText(/Logged in as admin/i)).toBeVisible();

      // Verify Guest Mode toggle is still visible (admins can toggle it)
      await expect(page.getByRole('switch', { name: /Guest Mode/i })).toBeVisible();
    });
  });
});
