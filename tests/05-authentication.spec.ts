import { test, expect } from '@playwright/test';

test.describe('Authentication System', () => {
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

      // Verify settings dialog is open
      await expect(page.getByRole('heading', { name: /Settings/i })).toBeVisible();
      await expect(page.getByText(/Configure your Clubs preferences/i)).toBeVisible();
    });

    test('should show guest mode toggle in settings', async ({ page }) => {
      await page.goto('/');

      // Open settings
      await page.getByRole('button', { name: /profile menu/i }).click();
      await page.getByRole('menuitem', { name: /Settings/i }).click();

      // Verify guest mode toggle is visible
      await expect(page.getByText(/Guest mode is currently enabled/i)).toBeVisible();
      await expect(page.getByRole('button', { name: /Enable/i })).toBeVisible();
    });

    test('should show credentials form when enabling disable guest mode', async ({ page }) => {
      await page.goto('/');

      // Open settings
      await page.getByRole('button', { name: /profile menu/i }).click();
      await page.getByRole('menuitem', { name: /Settings/i }).click();

      // Click to enable "Disable Guest Mode"
      await page.getByRole('button', { name: /Enable/i }).click();

      // Verify credentials form appears
      await expect(page.getByLabel(/Username/i)).toBeVisible();
      await expect(page.getByLabel('Password', { exact: true })).toBeVisible();
      await expect(page.getByLabel(/Confirm Password/i)).toBeVisible();
    });

    test('should close settings dialog on cancel', async ({ page }) => {
      await page.goto('/');

      // Open settings
      await page.getByRole('button', { name: /profile menu/i }).click();
      await page.getByRole('menuitem', { name: /Settings/i }).click();

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
      await page.getByRole('button', { name: /Enable/i }).click();

      // Enter short username
      await page.getByLabel(/Username/i).fill('ab');
      await page.getByLabel('Password', { exact: true }).fill('password123');
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
      await page.getByRole('button', { name: /Enable/i }).click();

      // Enter short password
      await page.getByLabel(/Username/i).fill('admin');
      await page.getByLabel('Password', { exact: true }).fill('short');
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
      await page.getByRole('button', { name: /Enable/i }).click();

      // Enter mismatched passwords
      await page.getByLabel(/Username/i).fill('admin');
      await page.getByLabel('Password', { exact: true }).fill('password123');
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
      await page.getByRole('button', { name: /Enable/i }).click();

      // Fill in valid credentials
      await page.getByLabel(/Username/i).fill('admin');
      await page.getByLabel('Password', { exact: true }).fill('password123');
      await page.getByLabel(/Confirm Password/i).fill('password123');

      // Save
      await page.getByRole('button', { name: /Save Changes/i }).click();

      // Verify success toast appears
      await expect(page.getByText(/Setup completed/i)).toBeVisible();

      // Verify dialog closes
      await expect(page.getByRole('heading', { name: /Settings/i })).not.toBeVisible();

      // Verify profile dropdown now shows username
      await page.getByRole('button', { name: /profile menu/i }).click();
      await expect(page.getByText('admin')).toBeVisible();

      // Verify Logout option is now available
      await expect(page.getByRole('menuitem', { name: /Logout/i })).toBeVisible();
    });
  });

  test.describe('Login Flow', () => {
    test.beforeEach(async ({ page }) => {
      // Set up a user first
      await page.goto('/');
      await page.getByRole('button', { name: /profile menu/i }).click();
      await page.getByRole('menuitem', { name: /Settings/i }).click();
      await page.getByRole('button', { name: /Enable/i }).click();
      await page.getByLabel(/Username/i).fill('testuser');
      await page.getByLabel('Password', { exact: true }).fill('testpass123');
      await page.getByLabel(/Confirm Password/i).fill('testpass123');
      await page.getByRole('button', { name: /Save Changes/i }).click();

      // Wait for setup to complete
      await expect(page.getByText(/Setup completed/i)).toBeVisible();

      // Now logout
      await page.getByRole('button', { name: /profile menu/i }).click();
      await page.getByRole('menuitem', { name: /Logout/i }).click();

      // Wait for redirect to login page
      await page.waitForURL(/\/login/);
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
      await page.getByRole('button', { name: /profile menu/i }).click();
      await page.getByRole('menuitem', { name: /Settings/i }).click();
      await page.getByRole('button', { name: /Enable/i }).click();
      await page.getByLabel(/Username/i).fill('testuser');
      await page.getByLabel('Password', { exact: true }).fill('testpass123');
      await page.getByLabel(/Confirm Password/i).fill('testpass123');
      await page.getByRole('button', { name: /Save Changes/i }).click();
      await expect(page.getByText(/Setup completed/i)).toBeVisible();
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

      // Verify logout success message
      await expect(page.getByText(/Logged out successfully/i)).toBeVisible();
    });

    test('should not be able to access protected pages after logout', async ({ page }) => {
      // Logout
      await page.getByRole('button', { name: /profile menu/i }).click();
      await page.getByRole('menuitem', { name: /Logout/i }).click();
      await page.waitForURL(/\/login/);

      // Try to navigate to home page
      await page.goto('/');

      // Should be redirected back to login
      await expect(page).toHaveURL(/\/login/);
    });
  });

  test.describe('Complete End-to-End Auth Flow', () => {
    test('should handle complete guest → setup → logout → login flow', async ({ page }) => {
      // Step 1: Start in guest mode
      await page.goto('/');
      await expect(page.locator('h1')).toContainText('Clubs');

      // Step 2: Open settings and verify guest mode is enabled
      await page.getByRole('button', { name: /profile menu/i }).click();
      await page.getByRole('menuitem', { name: /Settings/i }).click();
      await expect(page.getByText(/Guest mode is currently enabled/i)).toBeVisible();

      // Step 3: Disable guest mode and create admin user
      await page.getByRole('button', { name: /Enable/i }).click();
      await page.getByLabel(/Username/i).fill('admin');
      await page.getByLabel('Password', { exact: true }).fill('securepass123');
      await page.getByLabel(/Confirm Password/i).fill('securepass123');
      await page.getByRole('button', { name: /Save Changes/i }).click();

      // Wait for success message
      await expect(page.getByText(/Setup completed/i)).toBeVisible();

      // Step 4: Verify authenticated state
      await page.getByRole('button', { name: /profile menu/i }).click();
      await expect(page.getByText('admin')).toBeVisible();

      // Step 5: Open settings again and verify auth is enabled
      await page.getByRole('menuitem', { name: /Settings/i }).click();
      await expect(page.getByText(/Authentication is enabled/i)).toBeVisible();
      await expect(page.getByText(/Logged in as/i)).toBeVisible();
      await page.getByRole('button', { name: /Cancel/i }).click();

      // Step 6: Logout
      await page.getByRole('button', { name: /profile menu/i }).click();
      await page.getByRole('menuitem', { name: /Logout/i }).click();
      await expect(page).toHaveURL(/\/login/);

      // Step 7: Verify cannot access home without login
      await page.goto('/');
      await expect(page).toHaveURL(/\/login/);

      // Step 8: Login with correct credentials
      await page.getByLabel(/Username/i).fill('admin');
      await page.getByLabel(/Password/i).fill('securepass123');
      await page.getByRole('button', { name: /Login/i }).click();

      // Step 9: Verify back on home page and authenticated
      await expect(page).toHaveURL('/');
      await page.getByRole('button', { name: /profile menu/i }).click();
      await expect(page.getByText('admin')).toBeVisible();
      await expect(page.getByRole('menuitem', { name: /Logout/i })).toBeVisible();
    });
  });

  test.describe('Settings Dialog After Authentication', () => {
    test.beforeEach(async ({ page }) => {
      // Set up a user
      await page.goto('/');
      await page.getByRole('button', { name: /profile menu/i }).click();
      await page.getByRole('menuitem', { name: /Settings/i }).click();
      await page.getByRole('button', { name: /Enable/i }).click();
      await page.getByLabel(/Username/i).fill('admin');
      await page.getByLabel('Password', { exact: true }).fill('password123');
      await page.getByLabel(/Confirm Password/i).fill('password123');
      await page.getByRole('button', { name: /Save Changes/i }).click();
      await expect(page.getByText(/Setup completed/i)).toBeVisible();
    });

    test('should show authenticated status in settings', async ({ page }) => {
      // Open settings
      await page.getByRole('button', { name: /profile menu/i }).click();
      await page.getByRole('menuitem', { name: /Settings/i }).click();

      // Verify shows authenticated status
      await expect(page.getByText(/Authentication is enabled/i)).toBeVisible();
      await expect(page.getByText(/Logged in as/i)).toBeVisible();
      await expect(page.getByText('admin')).toBeVisible();

      // Verify no longer shows the disable guest mode toggle
      await expect(page.getByRole('button', { name: /Enable/i })).not.toBeVisible();
    });
  });
});
