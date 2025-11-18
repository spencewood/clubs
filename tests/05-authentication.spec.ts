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
  test.beforeEach(async ({ request, context }) => {
    await request.post('http://localhost:3000/api/auth/test-reset');
    // Clear all cookies and storage to ensure clean state
    await context.clearCookies();
  });

  test.describe('Initial Guest Mode State', () => {
    test('should show profile icon in guest mode', async ({ page }) => {
      await page.goto('/');

      // Verify profile icon is visible
      const profileButton = page.getByRole('button', { name: /profile menu/i });
      await expect(profileButton).toBeVisible();
    });

    test('should show Settings option in profile dropdown', async ({ page }) => {
      // Set up a promise to wait for the auth status API call
      const authStatusPromise = page.waitForResponse(response =>
        response.url().includes('/api/auth/status') && response.status() === 200
      );

      await page.goto('/');

      // Wait for the auth status API call to complete before interacting with profile dropdown
      // This ensures the ProfileDropdown component has loaded and is not in the loading state
      await authStatusPromise;

      // Wait for the profile button to be visible and stable (auth status loaded)
      const profileButton = page.getByRole('button', { name: /profile menu/i });
      await expect(profileButton).toBeVisible();

      // Open profile dropdown
      await profileButton.click();

      // Wait for the dropdown menu to be rendered in the portal and fully visible
      // Use a more specific selector that waits for the menu container to be ready
      const settingsMenuItem = page.getByRole('menuitem', { name: /Settings/i });
      await expect(settingsMenuItem).toBeVisible();

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

      // Wait for auth status to be loaded
      const authStatusPromise = page.waitForResponse(response =>
        response.url().includes('/api/auth/status') && response.status() === 200
      );
      await authStatusPromise;

      // Wait for the profile button to be visible and stable
      const profileButton = page.getByRole('button', { name: /profile menu/i });
      await expect(profileButton).toBeVisible();

      // Open settings
      await profileButton.click();
      await page.getByRole('menuitem', { name: /Settings/i }).click();

      // Wait for settings dialog to be fully open before clicking Users button
      await expect(page.getByRole('heading', { name: /Settings/i })).toBeVisible();

      // Click Users button and wait for it to be ready
      const usersButton = page.getByRole('button', { name: /Users/i });
      await expect(usersButton).toBeVisible();
      await usersButton.click();

      // Wait for tab transition to complete - the button gets border-primary class when active
      // This ensures the tab content has started rendering before we look for elements
      await expect(usersButton).toHaveClass(/border-primary/);

      // Wait for Users tab content to be rendered - use the Alert as an indicator
      // This is critical for mobile viewports where rendering may be slower
      const guestModeText = page.getByText(/Guest mode is currently enabled/i);
      await expect(guestModeText).toBeAttached();
      await expect(guestModeText).toBeVisible();

      // Now verify the switch is visible - scroll into view for mobile viewports
      const guestModeSwitch = page.getByRole('switch', { name: /Guest Mode/i });
      await expect(guestModeSwitch).toBeAttached();
      await guestModeSwitch.scrollIntoViewIfNeeded();
      await expect(guestModeSwitch).toBeVisible();
    });

    test('should show credentials form when enabling disable guest mode', async ({ page }) => {
      await page.goto('/');

      // Open settings
      await page.getByRole('button', { name: /profile menu/i }).click();
      await page.getByRole('menuitem', { name: /Settings/i }).click();

      // Wait for settings dialog to be fully visible before interacting
      await expect(page.getByRole('heading', { name: /Settings/i })).toBeVisible();

      await page.getByRole('button', { name: /Users/i }).click();

      // Wait for the Users tab content to be fully loaded
      await expect(page.getByText(/Guest mode is currently enabled/i)).toBeVisible();

      // Click to enable "Disable Guest Mode"
      // Scroll the switch into view first (important for mobile viewports)
      const guestModeSwitch = page.getByRole('switch', { name: /Guest Mode/i });
      await guestModeSwitch.scrollIntoViewIfNeeded();

      // Ensure switch is in the expected initial state (checked/enabled)
      await expect(guestModeSwitch).toBeChecked();

      // Click the switch to disable guest mode
      await guestModeSwitch.click();

      // Wait for the switch state to actually change before checking for the form
      // This is critical on mobile viewports where state updates may be slower
      await expect(guestModeSwitch).not.toBeChecked();

      // Wait for the admin creation form to appear
      // On mobile viewports, the form may need to be scrolled into view
      const usernameField = page.getByLabel(/Username/i);
      await expect(usernameField).toBeAttached();
      await usernameField.scrollIntoViewIfNeeded();
      await expect(usernameField).toBeVisible();

      // Verify credentials form appears
      const passwordField = page.getByLabel(/^Password \*$/);
      await passwordField.scrollIntoViewIfNeeded();
      await expect(passwordField).toBeVisible();

      const confirmPasswordField = page.getByLabel(/Confirm Password/i);
      await confirmPasswordField.scrollIntoViewIfNeeded();
      await expect(confirmPasswordField).toBeVisible();
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

      // Wait for settings dialog to be fully visible
      await expect(page.getByRole('heading', { name: /Settings/i })).toBeVisible();

      await page.getByRole('button', { name: /Users/i }).click();

      // Wait for the Users tab content to be fully loaded
      await expect(page.getByText(/Guest mode is currently enabled/i)).toBeVisible();

      // Click to disable guest mode and show the form
      const guestModeSwitch = page.getByRole('switch', { name: /Guest Mode/i });
      await guestModeSwitch.scrollIntoViewIfNeeded();
      await expect(guestModeSwitch).toBeChecked();
      await guestModeSwitch.click();

      // Wait for the switch state to change before checking for the form
      await expect(guestModeSwitch).not.toBeChecked();

      // Wait for the admin creation form to appear
      const usernameField = page.getByLabel(/Username/i);
      await expect(usernameField).toBeAttached();
      await usernameField.scrollIntoViewIfNeeded();
      await expect(usernameField).toBeVisible();

      // Enter short username
      await usernameField.fill('ab');

      const passwordField = page.getByLabel(/^Password \*$/);
      await passwordField.scrollIntoViewIfNeeded();
      await passwordField.fill('password123');

      const confirmPasswordField = page.getByLabel(/Confirm Password/i);
      await confirmPasswordField.scrollIntoViewIfNeeded();
      await confirmPasswordField.fill('password123');

      // Try to save
      const saveButton = page.getByRole('button', { name: /Save Changes/i });
      await saveButton.scrollIntoViewIfNeeded();
      await saveButton.click();

      // Verify error message appears
      const errorMessage = page.getByText(/Username must be at least 3 characters/i);
      // Wait for error to be attached first (validation is async)
      await expect(errorMessage).toBeAttached();
      // Scroll error into view for mobile viewports
      await errorMessage.scrollIntoViewIfNeeded();
      await expect(errorMessage).toBeVisible();
    });

    test('should validate password length (min 8 characters)', async ({ page }) => {
      await page.goto('/');

      // Open settings and enable auth
      await page.getByRole('button', { name: /profile menu/i }).click();
      await page.getByRole('menuitem', { name: /Settings/i }).click();

      // Wait for settings dialog to be fully visible
      await expect(page.getByRole('heading', { name: /Settings/i })).toBeVisible();

      await page.getByRole('button', { name: /Users/i }).click();

      // Wait for the Users tab content to be fully loaded
      await expect(page.getByText(/Guest mode is currently enabled/i)).toBeVisible();

      // Click to disable guest mode and show the form
      const guestModeSwitch = page.getByRole('switch', { name: /Guest Mode/i });
      await guestModeSwitch.scrollIntoViewIfNeeded();
      await expect(guestModeSwitch).toBeChecked();
      await guestModeSwitch.click();

      // Wait for the switch state to change before checking for the form
      await expect(guestModeSwitch).not.toBeChecked();

      // Wait for the admin creation form to appear
      const usernameField = page.getByLabel(/Username/i);
      await expect(usernameField).toBeAttached();
      await usernameField.scrollIntoViewIfNeeded();
      await expect(usernameField).toBeVisible();

      // Enter short password
      await usernameField.fill('admin');

      const passwordField = page.getByLabel(/^Password \*$/);
      await passwordField.scrollIntoViewIfNeeded();
      await passwordField.fill('short');

      const confirmPasswordField = page.getByLabel(/Confirm Password/i);
      await confirmPasswordField.scrollIntoViewIfNeeded();
      await confirmPasswordField.fill('short');

      // Try to save
      const saveButton = page.getByRole('button', { name: /Save Changes/i });
      await saveButton.scrollIntoViewIfNeeded();
      await saveButton.click();

      // Verify error message appears
      const errorMessage = page.getByText(/Password must be at least 8 characters/i);
      // Wait for error to be attached first (validation is async)
      await expect(errorMessage).toBeAttached();
      // Scroll error into view for mobile viewports
      await errorMessage.scrollIntoViewIfNeeded();
      await expect(errorMessage).toBeVisible();
    });

    test('should validate password confirmation match', async ({ page }) => {
      await page.goto('/');

      // Open settings and enable auth
      await page.getByRole('button', { name: /profile menu/i }).click();
      await page.getByRole('menuitem', { name: /Settings/i }).click();

      // Wait for settings dialog to be fully visible
      await expect(page.getByRole('heading', { name: /Settings/i })).toBeVisible();

      await page.getByRole('button', { name: /Users/i }).click();

      // Wait for the Users tab content to be fully loaded
      await expect(page.getByText(/Guest mode is currently enabled/i)).toBeVisible();

      // Click to disable guest mode and show the form
      const guestModeSwitch = page.getByRole('switch', { name: /Guest Mode/i });
      await guestModeSwitch.scrollIntoViewIfNeeded();
      await expect(guestModeSwitch).toBeChecked();
      await guestModeSwitch.click();

      // Wait for the switch state to change before checking for the form
      await expect(guestModeSwitch).not.toBeChecked();

      // Wait for the admin creation form to appear
      const usernameField = page.getByLabel(/Username/i);
      await expect(usernameField).toBeAttached();
      await usernameField.scrollIntoViewIfNeeded();
      await expect(usernameField).toBeVisible();

      // Enter mismatched passwords
      await usernameField.fill('admin');

      const passwordField = page.getByLabel(/^Password \*$/);
      await passwordField.scrollIntoViewIfNeeded();
      await passwordField.fill('password123');

      const confirmPasswordField = page.getByLabel(/Confirm Password/i);
      await confirmPasswordField.scrollIntoViewIfNeeded();
      await confirmPasswordField.fill('different123');

      // Try to save
      const saveButton = page.getByRole('button', { name: /Save Changes/i });
      await saveButton.scrollIntoViewIfNeeded();
      await saveButton.click();

      // Verify error message appears
      const errorMessage = page.getByText(/Passwords do not match/i);
      // Wait for error to be attached first (validation is async)
      await expect(errorMessage).toBeAttached();
      // Scroll error into view for mobile viewports
      await errorMessage.scrollIntoViewIfNeeded();
      await expect(errorMessage).toBeVisible();
    });

    test('should successfully create first user and disable guest mode', async ({ page }) => {
      await page.goto('/');

      // Open settings and enable auth
      await page.getByRole('button', { name: /profile menu/i }).click();
      await page.getByRole('menuitem', { name: /Settings/i }).click();

      // Wait for settings dialog to be fully visible
      await expect(page.getByRole('heading', { name: /Settings/i })).toBeVisible();

      await page.getByRole('button', { name: /Users/i }).click();

      // Wait for the Users tab content to be fully loaded
      await expect(page.getByText(/Guest mode is currently enabled/i)).toBeVisible();

      // Click to disable guest mode and show the form
      const guestModeSwitch = page.getByRole('switch', { name: /Guest Mode/i });
      await guestModeSwitch.scrollIntoViewIfNeeded();
      await expect(guestModeSwitch).toBeChecked();
      await guestModeSwitch.click();

      // Wait for the switch state to change before checking for the form
      await expect(guestModeSwitch).not.toBeChecked();

      // Wait for the admin creation form to appear
      const usernameField = page.getByLabel(/Username/i);
      await expect(usernameField).toBeAttached();
      await usernameField.scrollIntoViewIfNeeded();
      await expect(usernameField).toBeVisible();

      // Fill in valid credentials
      await usernameField.fill('admin');

      const passwordField = page.getByLabel(/^Password \*$/);
      await passwordField.scrollIntoViewIfNeeded();
      await passwordField.fill('password123');

      const confirmPasswordField = page.getByLabel(/Confirm Password/i);
      await confirmPasswordField.scrollIntoViewIfNeeded();
      await confirmPasswordField.fill('password123');

      // Save
      const saveButton = page.getByRole('button', { name: /Save Changes/i });
      await saveButton.scrollIntoViewIfNeeded();
      await saveButton.click();

      // Verify success toast appears
      await expect(page.getByText(/Authentication enabled/i)).toBeVisible();

      // Verify dialog closes
      await expect(page.getByRole('heading', { name: /Settings/i })).not.toBeVisible();

      // Verify profile dropdown now shows username
      // On mobile viewports, ensure profile button is visible after dialog closes
      const profileButton = page.getByRole('button', { name: /profile menu/i });
      await profileButton.scrollIntoViewIfNeeded();
      await expect(profileButton).toBeVisible();
      await profileButton.click();
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

      const guestModeSwitch = page.getByRole('switch', { name: /Guest Mode/i });
      await expect(guestModeSwitch).toBeChecked();
      await guestModeSwitch.click();

      // Wait for the switch state to change
      await expect(guestModeSwitch).not.toBeChecked();

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

      // Should still be on login page
      await expect(page).toHaveURL(/\/login/);
    });

    test('should successfully login with correct credentials', async ({ page }) => {
      // Ensure we're on the login page before starting
      await expect(page).toHaveURL(/\/login/);
      await expect(page.getByRole('heading', { name: /Login to Clubs/i })).toBeVisible();

      // Login with correct credentials
      await page.getByLabel(/Username/i).fill('testuser');
      await page.getByLabel(/Password/i).fill('testpass123');

      // Set up a promise to wait for the auth status API call after login
      const authStatusPromise = page.waitForResponse(response =>
        response.url().includes('/api/auth/status') && response.status() === 200
      );

      // Click login and wait for navigation
      const loginButton = page.getByRole('button', { name: /Login/i });
      await loginButton.click();

      // Wait for navigation to complete with increased timeout
      await page.waitForURL('/', { timeout: 15000 });

      // Wait for home page to be fully loaded - this ensures AuthGuard passed and page rendered
      await expect(page.locator('h1')).toContainText('Clubs', { timeout: 15000 });

      // Wait for the auth status API call to complete before interacting with profile dropdown
      // This ensures the ProfileDropdown component has loaded and is not in the loading state
      await authStatusPromise;

      // Verify authenticated state - wait for profile button to be ready
      const profileButton = page.getByRole('button', { name: /profile menu/i });
      await expect(profileButton).toBeVisible({ timeout: 10000 });

      // Ensure profile button is in view on mobile viewports
      await profileButton.scrollIntoViewIfNeeded();
      await profileButton.click();

      // Wait for dropdown menu to open and verify username and logout option are visible
      const menu = page.getByRole('menu');
      await expect(menu).toBeVisible();
      await expect(menu.getByText('testuser')).toBeVisible();
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

      const guestModeSwitch = page.getByRole('switch', { name: /Guest Mode/i });
      await expect(guestModeSwitch).toBeChecked();
      await guestModeSwitch.click();

      // Wait for the switch state to change
      await expect(guestModeSwitch).not.toBeChecked();

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
      const guestModeSwitch = page.getByRole('switch', { name: /Guest Mode/i });
      await expect(guestModeSwitch).toBeChecked();
      await guestModeSwitch.click();

      // Wait for the switch state to change
      await expect(guestModeSwitch).not.toBeChecked();

      // Wait for the admin creation form to appear
      await expect(page.getByLabel(/Username/i)).toBeVisible();
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

      // In E2E mode, server-side render doesn't have access to test state
      // ProfileDropdown needs to fetch auth status from client-side API
      // Opening settings triggers a fetch - use this to refresh auth state
      await page.getByRole('button', { name: /profile menu/i }).click();
      await page.getByRole('menuitem', { name: /Settings/i }).click();

      // Wait for settings dialog to open (this triggers auth status fetch)
      await expect(page.getByRole('heading', { name: /Settings/i })).toBeVisible();
      await page.getByRole('button', { name: /Cancel/i }).click();

      // Now open menu again with fresh auth state
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

      const guestModeSwitch = page.getByRole('switch', { name: /Guest Mode/i });
      await expect(guestModeSwitch).toBeChecked();
      await guestModeSwitch.click();

      // Wait for the switch state to change
      await expect(guestModeSwitch).not.toBeChecked();

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
