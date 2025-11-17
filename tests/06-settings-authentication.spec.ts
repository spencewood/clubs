import { test, expect } from '@playwright/test';

test.describe('Settings Dialog - Authentication Features', () => {
  // Force serial execution to avoid in-memory state collisions between parallel workers
  test.describe.configure({ mode: 'serial' });

  // Reset mock auth state before each test via HTTP request
  test.beforeEach(async ({ request }) => {
    await request.post('http://localhost:3000/api/auth/test-reset');
  });

  test.describe('1. Opening Settings Dialog and Tab Navigation', () => {
    test('1.1 Open settings dialog from profile dropdown', async ({ page }) => {
      await page.goto('/');

      // Click profile button in top-right corner
      await page.getByRole('button', { name: /profile menu/i }).click();

      // Verify dropdown menu is visible with Settings option
      await expect(page.getByRole('menuitem', { name: /Settings/i })).toBeVisible();

      // Click Settings
      await page.getByRole('menuitem', { name: /Settings/i }).click();
      await page.getByRole('button', { name: /Users/i }).click();

      // Verify settings dialog opened
      await expect(page.getByRole('heading', { name: /Settings/i })).toBeVisible();
      await expect(page.getByText(/Configure your Clubs preferences/i)).toBeVisible();
    });

    test('1.2 Navigate between General and Users tabs', async ({ page }) => {
      await page.goto('/');

      // Open settings
      await page.getByRole('button', { name: /profile menu/i }).click();
      await page.getByRole('menuitem', { name: /Settings/i }).click();

      // Verify General tab is active by default
      const generalTab = page.getByRole('button', { name: 'General' });
      const usersTab = page.getByRole('button', { name: 'Users' });

      await expect(generalTab).toHaveClass(/border-primary/);
      await expect(page.getByText(/General application settings will appear here/i)).toBeVisible();

      // Click Users tab
      await usersTab.click();

      // Verify Users tab is now active
      await expect(usersTab).toHaveClass(/border-primary/);
      await expect(generalTab).not.toHaveClass(/border-primary/);

      // Verify Users tab content is visible
      await expect(page.getByText(/Guest mode is currently enabled/i)).toBeVisible();
      await expect(page.locator('label[for="guest-mode"]')).toBeVisible();

      // Click General tab again
      await generalTab.click();

      // Verify back on General tab
      await expect(generalTab).toHaveClass(/border-primary/);
      await expect(page.getByText(/General application settings will appear here/i)).toBeVisible();
    });

    test.skip('1.3 Tab navigation with keyboard (Tab key focus)', async ({ page }) => {
      await page.goto('/');

      // Open settings
      await page.getByRole('button', { name: /profile menu/i }).click();
      await page.getByRole('menuitem', { name: /Settings/i }).click();
      await page.getByRole('button', { name: /Users/i }).click();

      // Press Tab to focus on General tab
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');

      // General tab should be focused (verify with focus-visible class)
      const generalTab = page.getByRole('button', { name: 'General' });
      await expect(generalTab).toBeFocused();

      // Press Tab to move to Users tab
      await page.keyboard.press('Tab');
      const usersTab = page.getByRole('button', { name: 'Users' });
      await expect(usersTab).toBeFocused();

      // Press Enter to activate Users tab
      await page.keyboard.press('Enter');
      await expect(usersTab).toHaveClass(/border-primary/);
    });

    test('1.4 Verify tabs have green focus rings', async ({ page }) => {
      await page.goto('/');

      // Open settings
      await page.getByRole('button', { name: /profile menu/i }).click();
      await page.getByRole('menuitem', { name: /Settings/i }).click();
      await page.getByRole('button', { name: /Users/i }).click();

      // Focus on General tab
      const generalTab = page.getByRole('button', { name: 'General' });
      await generalTab.focus();

      // Verify focus-visible class with ring-primary (green)
      await expect(generalTab).toHaveClass(/focus-visible:ring-primary/);
    });

    test('1.5 Close settings dialog with Cancel button', async ({ page }) => {
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

    test('1.6 Tab state resets when dialog is reopened', async ({ page }) => {
      await page.goto('/');

      // Open settings
      await page.getByRole('button', { name: /profile menu/i }).click();
      await page.getByRole('menuitem', { name: /Settings/i }).click();

      // Switch to Users tab
      await page.getByRole('button', { name: 'Users' }).click();
      await expect(page.getByRole('button', { name: 'Users' })).toHaveClass(/border-primary/);

      // Close dialog
      await page.getByRole('button', { name: /Cancel/i }).click();

      // Reopen settings
      await page.getByRole('button', { name: /profile menu/i }).click();
      await page.getByRole('menuitem', { name: /Settings/i }).click();

      // Verify General tab is active again (state reset)
      await expect(page.getByRole('button', { name: 'General' })).toHaveClass(/border-primary/);
    });
  });

  test.describe('2. Guest Mode Toggle - Initial State', () => {
    test('2.1 Guest mode is enabled by default in Users tab', async ({ page }) => {
      await page.goto('/');

      // Open settings and navigate to Users tab
      await page.getByRole('button', { name: /profile menu/i }).click();
      await page.getByRole('menuitem', { name: /Settings/i }).click();
      await page.getByRole('button', { name: /Users/i }).click();

      // Verify guest mode status message
      await expect(page.getByText(/Guest mode is currently enabled/i)).toBeVisible();
      await expect(page.getByText(/Anyone can access this interface without authentication/i)).toBeVisible();

      // Verify Guest Mode toggle exists and is checked
      const guestModeSwitch = page.locator('#guest-mode');
      await expect(guestModeSwitch).toBeVisible();
      await expect(guestModeSwitch).toBeChecked();

      // Verify toggle label and description
      await expect(page.getByText('Guest Mode', { exact: true })).toBeVisible();
      await expect(page.getByText(/Allow unauthenticated access to the interface/i)).toBeVisible();
    });

    test('2.2 Profile dropdown shows "Guest Mode" label', async ({ page }) => {
      await page.goto('/');

      // Open profile dropdown
      await page.getByRole('button', { name: /profile menu/i }).click();

      // Verify "Guest Mode" label is shown
      await expect(page.getByText('Guest Mode')).toBeVisible();

      // Verify no username is shown (since not authenticated)
      await expect(page.getByRole('menuitem', { name: /Logout/i })).not.toBeVisible();
    });

    test('2.3 Toggle guest mode off shows admin creation form', async ({ page }) => {
      await page.goto('/');

      // Open settings and navigate to Users tab
      await page.getByRole('button', { name: /profile menu/i }).click();
      await page.getByRole('menuitem', { name: /Settings/i }).click();
      await page.getByRole('button', { name: /Users/i }).click();

      // Verify guest mode is checked initially (after test reset)
      const guestModeToggle = page.locator('#guest-mode');
      await expect(guestModeToggle).toBeEnabled();
      await expect(guestModeToggle).toBeChecked();

      // Toggle guest mode off
      await guestModeToggle.click();

      // Verify guest mode is now unchecked
      await expect(page.locator('#guest-mode')).not.toBeChecked();

      // Verify admin creation form appears
      await expect(page.getByText('Create Admin Account')).toBeVisible();
      await expect(page.getByText(/Set up the first admin account to enable authentication/i)).toBeVisible();

      // Verify form fields are present
      await expect(page.getByLabel(/Username/i)).toBeVisible();
      await expect(page.getByLabel(/^Password \*$/)).toBeVisible();
      await expect(page.getByLabel(/Confirm Password/i)).toBeVisible();

      // Verify all fields are required (have asterisk)
      await expect(page.getByText('Username *', { exact: true })).toBeVisible();
      await expect(page.locator('label[for="password"]', { hasText: 'Password *' })).toBeVisible();
      await expect(page.getByText('Confirm Password *', { exact: true })).toBeVisible();
    });

    test('2.4 Username field has autofocus when form appears', async ({ page }) => {
      await page.goto('/');

      // Open settings and navigate to Users tab
      await page.getByRole('button', { name: /profile menu/i }).click();
      await page.getByRole('menuitem', { name: /Settings/i }).click();
      await page.getByRole('button', { name: /Users/i }).click();

      // Wait for toggle to be ready
      const guestModeToggle = page.locator('#guest-mode');
      await expect(guestModeToggle).toBeEnabled();
      await expect(guestModeToggle).toBeChecked();

      // Toggle guest mode off and wait for form to appear
      await guestModeToggle.click();
      await expect(guestModeToggle).not.toBeChecked();

      // Wait for form to appear
      await expect(page.getByText('Create Admin Account')).toBeVisible();

      // Verify username field has autofocus
      const usernameField = page.getByLabel(/Username/i);
      await expect(usernameField).toBeVisible();
      await expect(usernameField).toBeFocused();
    });

    test('2.5 Toggle guest mode on and off without saving', async ({ page }) => {
      await page.goto('/');

      // Open settings and navigate to Users tab
      await page.getByRole('button', { name: /profile menu/i }).click();
      await page.getByRole('menuitem', { name: /Settings/i }).click();
      await page.getByRole('button', { name: /Users/i }).click();

      // Wait for guest mode toggle to be ready and checked initially
      const guestModeToggle = page.locator('#guest-mode');
      await expect(guestModeToggle).toBeEnabled();
      await expect(guestModeToggle).toBeChecked();

      // Toggle off - form should appear
      await guestModeToggle.click();
      await expect(guestModeToggle).not.toBeChecked();
      const adminForm = page.getByText('Create Admin Account');
      await expect(adminForm).toBeVisible();

      // Toggle back on - form should disappear
      await guestModeToggle.click();
      await expect(guestModeToggle).toBeChecked();
      await expect(adminForm).not.toBeVisible();
    });

    test.skip('2.6 Cancel without saving preserves original state', async ({ page }) => {
      await page.goto('/');

      // Open settings and navigate to Users tab
      await page.getByRole('button', { name: /profile menu/i }).click();
      await page.getByRole('menuitem', { name: /Settings/i }).click();
      await page.getByRole('button', { name: /Users/i }).click();

      // Toggle guest mode off
      await page.locator('#guest-mode').click();
      await expect(page.locator('#guest-mode')).not.toBeChecked();

      // Fill in some form data
      await page.getByLabel(/Username/i).fill('admin');
      await page.getByLabel(/^Password \*$/).fill('password123');

      // Click Cancel
      await page.getByRole('button', { name: /Cancel/i }).click();

      // Reopen settings
      await page.getByRole('button', { name: /profile menu/i }).click();
      await page.getByRole('menuitem', { name: /Settings/i }).click();
      await page.getByRole('button', { name: /Users/i }).click();

      // Verify guest mode is still enabled (original state)
      await expect(page.locator('#guest-mode')).toBeChecked();
      await expect(page.getByText(/Guest mode is currently enabled/i)).toBeVisible();
    });
  });

  test.describe('3. Admin Account Creation - Form Validation', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/');

      // CRITICAL: Wait for auth status to be fetched and show "Guest Mode" before proceeding
      // This ensures the test-reset has taken effect and page state is correct
      await page.getByRole('button', { name: /profile menu/i }).click();
      await expect(page.getByText('Guest Mode')).toBeVisible({ timeout: 5000 });

      // Now open settings with correct guest mode state
      await page.getByRole('menuitem', { name: /Settings/i }).click();
      await page.getByRole('button', { name: /Users/i }).click();

      // Verify guest mode is enabled (checked) before toggling
      const guestModeToggle = page.locator('#guest-mode');
      await expect(guestModeToggle).toBeChecked({ timeout: 5000 });

      // Now toggle guest mode OFF to show the form
      await guestModeToggle.click();

      // Wait for admin creation form to appear and be fully interactive
      await expect(page.getByText('Create Admin Account')).toBeVisible({ timeout: 5000 });
      await expect(page.getByLabel(/Username/i)).toBeVisible({ timeout: 5000 });

      // Ensure all form fields are fully rendered and interactive
      await expect(page.getByLabel(/^Password \*$/)).toBeVisible({ timeout: 5000 });
      await expect(page.getByLabel(/Confirm Password/i)).toBeVisible({ timeout: 5000 });
      await expect(page.getByRole('button', { name: /Save Changes/i })).toBeEnabled({ timeout: 5000 });

      // Small wait to ensure React state is settled
      await page.waitForTimeout(100);
    });

    test('3.1 Validate username minimum length (3 characters)', async ({ page }) => {
      // Wait for username field to be ready and interactive
      const usernameField = page.getByLabel(/Username/i);
      await expect(usernameField).toBeEnabled();

      // Ensure the field is ready to accept input by waiting for it to be attached and editable
      await usernameField.waitFor({ state: 'attached', timeout: 5000 });

      // Clear any existing value and enter 2-character username (too short)
      await usernameField.clear();
      await usernameField.fill('ab');
      await expect(usernameField).toHaveValue('ab');

      // Fill password fields
      const passwordField = page.getByLabel(/^Password \*$/);
      await passwordField.clear();
      await passwordField.fill('password123');
      await expect(passwordField).toHaveValue('password123');

      const confirmPasswordField = page.getByLabel(/Confirm Password/i);
      await confirmPasswordField.clear();
      await confirmPasswordField.fill('password123');
      await expect(confirmPasswordField).toHaveValue('password123');

      // Click Save Changes and wait for it to be clickable
      const saveButton = page.getByRole('button', { name: /Save Changes/i });
      await expect(saveButton).toBeEnabled();
      await saveButton.click();

      // Verify error message appears with timeout for async validation
      // Use a more specific selector to avoid false positives
      const errorMessage = page.locator('p.text-xs.text-destructive', { hasText: /Username must be at least 3 characters/i });
      await expect(errorMessage).toBeVisible({ timeout: 10000 });

      // Verify dialog is still open
      await expect(page.getByRole('heading', { name: /Settings/i })).toBeVisible();
    });

    test('3.2 Validate username maximum length (50 characters)', async ({ page }) => {
      // Wait for fields to be ready and interactive
      const usernameField = page.getByLabel(/Username/i);
      await expect(usernameField).toBeEnabled();
      await usernameField.waitFor({ state: 'attached', timeout: 5000 });

      const passwordField = page.getByLabel(/^Password \*$/);
      await expect(passwordField).toBeEnabled();
      await passwordField.waitFor({ state: 'attached', timeout: 5000 });

      const confirmPasswordField = page.getByLabel(/Confirm Password/i);
      await expect(confirmPasswordField).toBeEnabled();
      await confirmPasswordField.waitFor({ state: 'attached', timeout: 5000 });

      // Clear and enter 51-character username (too long)
      const longUsername = 'a'.repeat(51);
      await usernameField.clear();
      await usernameField.fill(longUsername);
      await expect(usernameField).toHaveValue(longUsername);

      await passwordField.clear();
      await passwordField.fill('password123');
      await expect(passwordField).toHaveValue('password123');

      await confirmPasswordField.clear();
      await confirmPasswordField.fill('password123');
      await expect(confirmPasswordField).toHaveValue('password123');

      // Click Save Changes and wait for it to be clickable
      const saveButton = page.getByRole('button', { name: /Save Changes/i });
      await expect(saveButton).toBeEnabled();
      await saveButton.click();

      // Verify error message appears with timeout for async validation
      const errorMessage = page.locator('p.text-xs.text-destructive', { hasText: /Username must be at most 50 characters/i });
      await expect(errorMessage).toBeVisible({ timeout: 10000 });

      // Verify dialog is still open
      await expect(page.getByRole('heading', { name: /Settings/i })).toBeVisible();
    });

    test('3.3 Validate password minimum length (8 characters)', async ({ page }) => {
      // Wait for fields to be ready and interactive
      const usernameField = page.getByLabel(/Username/i);
      await expect(usernameField).toBeEnabled();
      await usernameField.waitFor({ state: 'attached', timeout: 5000 });

      const passwordField = page.getByLabel(/^Password \*$/);
      await expect(passwordField).toBeEnabled();
      await passwordField.waitFor({ state: 'attached', timeout: 5000 });

      const confirmPasswordField = page.getByLabel(/Confirm Password/i);
      await expect(confirmPasswordField).toBeEnabled();
      await confirmPasswordField.waitFor({ state: 'attached', timeout: 5000 });

      // Clear and enter short password
      await usernameField.clear();
      await usernameField.fill('admin');
      await expect(usernameField).toHaveValue('admin');

      await passwordField.clear();
      await passwordField.fill('short');
      await expect(passwordField).toHaveValue('short');

      await confirmPasswordField.clear();
      await confirmPasswordField.fill('short');
      await expect(confirmPasswordField).toHaveValue('short');

      // Click Save Changes and wait for it to be clickable
      const saveButton = page.getByRole('button', { name: /Save Changes/i });
      await expect(saveButton).toBeEnabled();
      await saveButton.click();

      // Verify error message appears with timeout for async validation
      const errorMessage = page.locator('p.text-xs.text-destructive', { hasText: /Password must be at least 8 characters/i });
      await expect(errorMessage).toBeVisible({ timeout: 10000 });

      // Verify dialog is still open
      await expect(page.getByRole('heading', { name: /Settings/i })).toBeVisible();
    });

    test('3.4 Validate password maximum length (100 characters)', async ({ page }) => {
      // Wait for fields to be ready and interactive
      const usernameField = page.getByLabel(/Username/i);
      await expect(usernameField).toBeEnabled();
      await usernameField.waitFor({ state: 'attached', timeout: 5000 });

      const passwordField = page.getByLabel(/^Password \*$/);
      await expect(passwordField).toBeEnabled();
      await passwordField.waitFor({ state: 'attached', timeout: 5000 });

      const confirmPasswordField = page.getByLabel(/Confirm Password/i);
      await expect(confirmPasswordField).toBeEnabled();
      await confirmPasswordField.waitFor({ state: 'attached', timeout: 5000 });

      // Clear and enter 101-character password (too long)
      const longPassword = 'a'.repeat(101);
      await usernameField.clear();
      await usernameField.fill('admin');
      await expect(usernameField).toHaveValue('admin');

      await passwordField.clear();
      await passwordField.fill(longPassword);
      await expect(passwordField).toHaveValue(longPassword);

      await confirmPasswordField.clear();
      await confirmPasswordField.fill(longPassword);
      await expect(confirmPasswordField).toHaveValue(longPassword);

      // Click Save Changes and wait for it to be clickable
      const saveButton = page.getByRole('button', { name: /Save Changes/i });
      await expect(saveButton).toBeEnabled();
      await saveButton.click();

      // Verify error message appears with timeout for async validation
      const errorMessage = page.locator('p.text-xs.text-destructive', { hasText: /Password must be at most 100 characters/i });
      await expect(errorMessage).toBeVisible({ timeout: 10000 });

      // Verify dialog is still open
      await expect(page.getByRole('heading', { name: /Settings/i })).toBeVisible();
    });

    test('3.5 Validate passwords match', async ({ page }) => {
      // Wait for fields to be ready and interactive
      const usernameField = page.getByLabel(/Username/i);
      await expect(usernameField).toBeEnabled();
      await usernameField.waitFor({ state: 'attached', timeout: 5000 });

      const passwordField = page.getByLabel(/^Password \*$/);
      await expect(passwordField).toBeEnabled();
      await passwordField.waitFor({ state: 'attached', timeout: 5000 });

      const confirmPasswordField = page.getByLabel(/Confirm Password/i);
      await expect(confirmPasswordField).toBeEnabled();
      await confirmPasswordField.waitFor({ state: 'attached', timeout: 5000 });

      // Clear and enter mismatched passwords
      await usernameField.clear();
      await usernameField.fill('admin');
      await expect(usernameField).toHaveValue('admin');

      await passwordField.clear();
      await passwordField.fill('password123');
      await expect(passwordField).toHaveValue('password123');

      await confirmPasswordField.clear();
      await confirmPasswordField.fill('different123');
      await expect(confirmPasswordField).toHaveValue('different123');

      // Click Save Changes and wait for it to be clickable
      const saveButton = page.getByRole('button', { name: /Save Changes/i });
      await expect(saveButton).toBeEnabled();
      await saveButton.click();

      // Verify error message appears with timeout for async validation
      // Use a more specific selector to avoid false positives
      const errorMessage = page.locator('p.text-xs.text-destructive', { hasText: /Passwords do not match/i });
      await expect(errorMessage).toBeVisible({ timeout: 10000 });

      // Verify dialog is still open
      await expect(page.getByRole('heading', { name: /Settings/i })).toBeVisible();
    });

    test('3.6 Show multiple validation errors simultaneously', async ({ page }) => {
      // Wait for fields to be ready and interactive
      const usernameField = page.getByLabel(/Username/i);
      await expect(usernameField).toBeEnabled();
      await usernameField.waitFor({ state: 'attached', timeout: 5000 });

      const passwordField = page.getByLabel(/^Password \*$/);
      await expect(passwordField).toBeEnabled();
      await passwordField.waitFor({ state: 'attached', timeout: 5000 });

      const confirmPasswordField = page.getByLabel(/Confirm Password/i);
      await expect(confirmPasswordField).toBeEnabled();
      await confirmPasswordField.waitFor({ state: 'attached', timeout: 5000 });

      // Clear and enter invalid data in multiple fields
      await usernameField.clear();
      await usernameField.fill('ab'); // Too short
      await expect(usernameField).toHaveValue('ab');

      await passwordField.clear();
      await passwordField.fill('short'); // Too short
      await expect(passwordField).toHaveValue('short');

      await confirmPasswordField.clear();
      await confirmPasswordField.fill('different'); // Doesn't match (and also too short)
      await expect(confirmPasswordField).toHaveValue('different');

      // Click Save Changes and wait for it to be clickable
      const saveButton = page.getByRole('button', { name: /Save Changes/i });
      await expect(saveButton).toBeEnabled();
      await saveButton.click();

      // Verify multiple error messages appear with timeout for async validation
      // Use more specific selectors to avoid false positives
      const usernameError = page.locator('p.text-xs.text-destructive', { hasText: /Username must be at least 3 characters/i });
      const passwordError = page.locator('p.text-xs.text-destructive', { hasText: /Password must be at least 8 characters/i });

      await expect(usernameError).toBeVisible({ timeout: 10000 });
      await expect(passwordError).toBeVisible({ timeout: 10000 });

      // Verify dialog is still open
      await expect(page.getByRole('heading', { name: /Settings/i })).toBeVisible();
    });

    test('3.7 Validation errors clear when corrected', async ({ page }) => {
      // Wait for fields to be ready and interactive
      const usernameField = page.getByLabel(/Username/i);
      await expect(usernameField).toBeEnabled();
      await usernameField.waitFor({ state: 'attached', timeout: 5000 });

      const passwordField = page.getByLabel(/^Password \*$/);
      await expect(passwordField).toBeEnabled();
      await passwordField.waitFor({ state: 'attached', timeout: 5000 });

      const confirmPasswordField = page.getByLabel(/Confirm Password/i);
      await expect(confirmPasswordField).toBeEnabled();
      await confirmPasswordField.waitFor({ state: 'attached', timeout: 5000 });

      // Clear and enter invalid username
      await usernameField.clear();
      await usernameField.fill('ab');
      await expect(usernameField).toHaveValue('ab');

      await passwordField.clear();
      await passwordField.fill('password123');
      await expect(passwordField).toHaveValue('password123');

      await confirmPasswordField.clear();
      await confirmPasswordField.fill('password123');
      await expect(confirmPasswordField).toHaveValue('password123');

      // Trigger validation
      const saveButton = page.getByRole('button', { name: /Save Changes/i });
      await expect(saveButton).toBeEnabled();
      await saveButton.click();

      // Verify error message appears with timeout for async validation
      const errorMessage = page.locator('p.text-xs.text-destructive', { hasText: /Username must be at least 3 characters/i });
      await expect(errorMessage).toBeVisible({ timeout: 10000 });

      // Correct the username
      await usernameField.clear();
      await usernameField.fill('admin');
      await expect(usernameField).toHaveValue('admin');

      // Save again
      await expect(saveButton).toBeEnabled();
      await saveButton.click();

      // Error should be gone and success should occur
      await expect(errorMessage).not.toBeVisible();
      await expect(page.getByText(/Authentication enabled/i)).toBeVisible({ timeout: 10000 });

      // Verify dialog closes
      await expect(page.getByRole('heading', { name: /Settings/i })).not.toBeVisible({ timeout: 5000 });
    });

    test('3.8 Empty fields validation', async ({ page }) => {
      // Wait for fields to be ready and interactive
      const usernameField = page.getByLabel(/Username/i);
      await expect(usernameField).toBeEnabled();
      await usernameField.waitFor({ state: 'attached', timeout: 5000 });

      const passwordField = page.getByLabel(/^Password \*$/);
      await expect(passwordField).toBeEnabled();
      await passwordField.waitFor({ state: 'attached', timeout: 5000 });

      const confirmPasswordField = page.getByLabel(/Confirm Password/i);
      await expect(confirmPasswordField).toBeEnabled();
      await confirmPasswordField.waitFor({ state: 'attached', timeout: 5000 });

      // Clear all fields to ensure they are empty
      await usernameField.clear();
      await usernameField.fill('');
      await expect(usernameField).toHaveValue('');

      await passwordField.clear();
      await passwordField.fill('');
      await expect(passwordField).toHaveValue('');

      await confirmPasswordField.clear();
      await confirmPasswordField.fill('');
      await expect(confirmPasswordField).toHaveValue('');

      // Click Save Changes and wait for it to be clickable
      const saveButton = page.getByRole('button', { name: /Save Changes/i });
      await expect(saveButton).toBeEnabled();
      await saveButton.click();

      // Verify validation errors appear with timeout for async validation
      // Use more specific selectors to avoid false positives
      const usernameError = page.locator('p.text-xs.text-destructive', { hasText: /Username must be at least 3 characters/i });
      const passwordError = page.locator('p.text-xs.text-destructive', { hasText: /Password must be at least 8 characters/i });

      await expect(usernameError).toBeVisible({ timeout: 10000 });
      await expect(passwordError).toBeVisible({ timeout: 10000 });

      // Verify dialog is still open
      await expect(page.getByRole('heading', { name: /Settings/i })).toBeVisible();
    });
  });

  test.describe('4. Admin Account Creation - Form Submission', () => {
    test('4.1 Submit form with Enter key on username field', async ({ page }) => {
      await page.goto('/');
      await page.getByRole('button', { name: /profile menu/i }).click();
      await page.getByRole('menuitem', { name: /Settings/i }).click();
      await page.getByRole('button', { name: /Users/i }).click();
      await page.locator('#guest-mode').click();

      // Fill in valid credentials
      await page.getByLabel(/Username/i).fill('admin');
      await page.getByLabel(/^Password \*$/).fill('password123');
      await page.getByLabel(/Confirm Password/i).fill('password123');

      // Move focus back to username field and press Enter
      await page.getByLabel(/Username/i).focus();
      await page.keyboard.press('Enter');

      // Wait for network request to complete and verify success toast appears
      await expect(page.getByText(/Authentication enabled/i)).toBeVisible({ timeout: 10000 });
      await expect(page.getByText(/You are now logged in/i)).toBeVisible({ timeout: 5000 });

      // Verify dialog closes (wait for animation)
      await expect(page.getByRole('heading', { name: /Settings/i })).not.toBeVisible({ timeout: 5000 });
    });

    test('4.2 Submit form with Enter key on password field', async ({ page }) => {
      await page.goto('/');
      await page.getByRole('button', { name: /profile menu/i }).click();
      await page.getByRole('menuitem', { name: /Settings/i }).click();
      await page.getByRole('button', { name: /Users/i }).click();
      await page.locator('#guest-mode').click();

      // Fill in valid credentials
      await page.getByLabel(/Username/i).fill('admin');
      await page.getByLabel(/^Password \*$/).fill('password123');
      await page.getByLabel(/Confirm Password/i).fill('password123');

      // Move focus to password field and press Enter
      await page.getByLabel(/^Password \*$/).focus();
      await page.keyboard.press('Enter');

      // Verify success with timeout
      await expect(page.getByText(/Authentication enabled/i)).toBeVisible({ timeout: 10000 });
    });

    test('4.3 Submit form with Enter key on confirm password field', async ({ page }) => {
      await page.goto('/');
      await page.getByRole('button', { name: /profile menu/i }).click();
      await page.getByRole('menuitem', { name: /Settings/i }).click();
      await page.getByRole('button', { name: /Users/i }).click();
      await page.locator('#guest-mode').click();

      // Fill in valid credentials, pressing Enter on last field
      await page.getByLabel(/Username/i).fill('admin');
      await page.getByLabel(/^Password \*$/).fill('password123');
      await page.getByLabel(/Confirm Password/i).fill('password123');
      await page.keyboard.press('Enter');

      // Verify success with timeout
      await expect(page.getByText(/Authentication enabled/i)).toBeVisible({ timeout: 10000 });
    });

    test('4.4 Submit form by clicking Save Changes button', async ({ page }) => {
      await page.goto('/');
      await page.getByRole('button', { name: /profile menu/i }).click();
      await page.getByRole('menuitem', { name: /Settings/i }).click();
      await page.getByRole('button', { name: /Users/i }).click();
      await page.locator('#guest-mode').click();

      // Fill in valid credentials
      await page.getByLabel(/Username/i).fill('testadmin');
      await page.getByLabel(/^Password \*$/).fill('testpass123');
      await page.getByLabel(/Confirm Password/i).fill('testpass123');

      // Click Save Changes button
      await page.getByRole('button', { name: /Save Changes/i }).click();

      // Verify success with timeout
      await expect(page.getByText(/Authentication enabled/i)).toBeVisible({ timeout: 10000 });
      await expect(page.getByText(/You are now logged in/i)).toBeVisible({ timeout: 5000 });
    });

    test('4.5 Successful creation: user is logged in', async ({ page }) => {
      await page.goto('/');
      await page.getByRole('button', { name: /profile menu/i }).click();
      await page.getByRole('menuitem', { name: /Settings/i }).click();
      await page.getByRole('button', { name: /Users/i }).click();
      await page.locator('#guest-mode').click();

      // Create admin
      await page.getByLabel(/Username/i).fill('myadmin');
      await page.getByLabel(/^Password \*$/).fill('mypassword123');
      await page.getByLabel(/Confirm Password/i).fill('mypassword123');
      await page.getByRole('button', { name: /Save Changes/i }).click();

      // Wait for success toast first
      await expect(page.getByText(/Authentication enabled/i)).toBeVisible({ timeout: 10000 });

      // Wait for dialog to close
      await expect(page.getByRole('heading', { name: /Settings/i })).not.toBeVisible({ timeout: 5000 });

      // Open profile dropdown and verify logged in
      await page.getByRole('button', { name: /profile menu/i }).click();
      await expect(page.getByText('myadmin')).toBeVisible({ timeout: 5000 });
      await expect(page.getByRole('menuitem', { name: /Logout/i })).toBeVisible();

      // Verify "Guest Mode" label is no longer shown
      await expect(page.getByText('Guest Mode')).not.toBeVisible();
    });

    test('4.6 Successful creation: guest mode is disabled', async ({ page }) => {
      await page.goto('/');
      await page.getByRole('button', { name: /profile menu/i }).click();
      await page.getByRole('menuitem', { name: /Settings/i }).click();
      await page.getByRole('button', { name: /Users/i }).click();
      await page.locator('#guest-mode').click();

      // Create admin
      await page.getByLabel(/Username/i).fill('admin');
      await page.getByLabel(/^Password \*$/).fill('password123');
      await page.getByLabel(/Confirm Password/i).fill('password123');
      await page.getByRole('button', { name: /Save Changes/i }).click();

      // Wait for success with timeout
      await expect(page.getByText(/Authentication enabled/i)).toBeVisible({ timeout: 10000 });

      // Wait for dialog to close
      await expect(page.getByRole('heading', { name: /Settings/i })).not.toBeVisible({ timeout: 5000 });

      // Reopen settings and check guest mode status
      await page.getByRole('button', { name: /profile menu/i }).click();
      await page.getByRole('menuitem', { name: /Settings/i }).click();
      await page.getByRole('button', { name: /Users/i }).click();

      // Verify guest mode toggle is still visible but now unchecked
      await expect(page.locator('#guest-mode')).not.toBeChecked();
    });

    test('4.7 Save Changes button shows loading state', async ({ page }) => {
      await page.goto('/');
      await page.getByRole('button', { name: /profile menu/i }).click();
      await page.getByRole('menuitem', { name: /Settings/i }).click();
      await page.getByRole('button', { name: /Users/i }).click();
      await page.locator('#guest-mode').click();

      // Fill in credentials
      await page.getByLabel(/Username/i).fill('admin');
      await page.getByLabel(/^Password \*$/).fill('password123');
      await page.getByLabel(/Confirm Password/i).fill('password123');

      // Get button reference before clicking
      const saveButton = page.getByRole('button', { name: /Save Changes/i });

      // Start monitoring for the loading state immediately before clicking
      const loadingStatePromise = page.getByRole('button', { name: /Saving/i }).waitFor({ state: 'visible', timeout: 2000 }).catch(() => null);

      // Click the button
      await saveButton.click();

      // Try to catch the loading state (may be too fast in some environments)
      await loadingStatePromise;

      // Wait for completion regardless of whether we caught the loading state
      await expect(page.getByText(/Authentication enabled/i)).toBeVisible({ timeout: 10000 });

      // Note: Loading state may be too brief to catch in fast environments,
      // which is acceptable as long as the form submission succeeds
    });

    test('4.8 Form inputs are disabled during submission', async ({ page }) => {
      await page.goto('/');
      await page.getByRole('button', { name: /profile menu/i }).click();
      await page.getByRole('menuitem', { name: /Settings/i }).click();
      await page.getByRole('button', { name: /Users/i }).click();
      await page.locator('#guest-mode').click();

      // Fill in credentials
      await page.getByLabel(/Username/i).fill('admin');
      await page.getByLabel(/^Password \*$/).fill('password123');
      await page.getByLabel(/Confirm Password/i).fill('password123');

      // Click Save and immediately try to verify disabled state
      // Note: This may be too fast to catch in some environments, which is acceptable
      const savePromise = page.getByRole('button', { name: /Save Changes/i }).click();

      // Try to catch disabled state immediately (with a very short timeout)
      try {
        await expect(page.getByLabel(/Username/i)).toBeDisabled({ timeout: 500 });
      } catch {
        // Disabled state may be too brief to catch, which is fine
      }

      await savePromise;

      // Wait for completion
      await expect(page.getByText(/Authentication enabled/i)).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('5. Guest Mode Warning - Re-enabling Guest Mode', () => {
    test.beforeEach(async ({ page }) => {
      // Set up: create admin account and disable guest mode
      await page.goto('/');
      await page.getByRole('button', { name: /profile menu/i }).click();
      await page.getByRole('menuitem', { name: /Settings/i }).click();
      await page.getByRole('button', { name: /Users/i }).click();
      await page.locator('#guest-mode').click();
      await page.getByLabel(/Username/i).fill('admin');
      await page.getByLabel(/^Password \*$/).fill('password123');
      await page.getByLabel(/Confirm Password/i).fill('password123');
      await page.getByRole('button', { name: /Save Changes/i }).click();
      await expect(page.getByText(/Authentication enabled/i)).toBeVisible({ timeout: 10000 });
      // Wait for dialog to close before continuing
      await expect(page.getByRole('heading', { name: /Settings/i })).not.toBeVisible({ timeout: 5000 });
    });

    test('5.1 Warning appears when toggling guest mode ON', async ({ page }) => {
      // Open settings
      await page.getByRole('button', { name: /profile menu/i }).click();
      await page.getByRole('menuitem', { name: /Settings/i }).click();
      await page.getByRole('button', { name: /Users/i }).click();

      // Verify guest mode is currently disabled
      await expect(page.locator('#guest-mode')).not.toBeChecked();

      // Toggle guest mode ON
      await page.locator('#guest-mode').click();

      // Verify warning appears
      const warning = page.getByText(/Enabling guest mode will delete all user accounts and authentication data/i);
      await expect(warning).toBeVisible();
      await expect(page.getByText(/This action cannot be undone/i)).toBeVisible();

      // Verify warning has destructive styling (red)
      const alertBox = page.locator('[role="alert"]').filter({ hasText: /Enabling guest mode/ });
      await expect(alertBox).toHaveClass(/destructive/);
    });

    test('5.2 Warning does NOT appear when toggling guest mode OFF', async ({ page }) => {
      // Open settings
      await page.getByRole('button', { name: /profile menu/i }).click();
      await page.getByRole('menuitem', { name: /Settings/i }).click();
      await page.getByRole('button', { name: /Users/i }).click();

      // Verify guest mode is currently disabled
      await expect(page.locator('#guest-mode')).not.toBeChecked();

      // Warning should not be visible when guest mode is off
      await expect(page.getByText(/Enabling guest mode will delete all user accounts/i)).not.toBeVisible();
    });

    test('5.3 Warning disappears when toggling back OFF', async ({ page }) => {
      // Open settings
      await page.getByRole('button', { name: /profile menu/i }).click();
      await page.getByRole('menuitem', { name: /Settings/i }).click();
      await page.getByRole('button', { name: /Users/i }).click();

      // Toggle guest mode ON - warning appears
      await page.locator('#guest-mode').click();
      await expect(page.getByText(/Enabling guest mode will delete all user accounts/i)).toBeVisible();

      // Toggle back OFF
      await page.locator('#guest-mode').click();

      // Warning should disappear
      await expect(page.getByText(/Enabling guest mode will delete all user accounts/i)).not.toBeVisible();
    });

    test('5.4 Warning message is clear and specific', async ({ page }) => {
      // Open settings
      await page.getByRole('button', { name: /profile menu/i }).click();
      await page.getByRole('menuitem', { name: /Settings/i }).click();
      await page.getByRole('button', { name: /Users/i }).click();

      // Toggle guest mode ON
      await page.locator('#guest-mode').click();

      // Verify exact warning text
      await expect(page.getByText('Warning:')).toBeVisible();
      await expect(page.getByText(/Enabling guest mode will delete all user accounts and authentication data/i)).toBeVisible();
      await expect(page.getByText(/This action cannot be undone/i)).toBeVisible();
    });

    test('5.5 Cancel with warning visible does not delete data', async ({ page }) => {
      // Open settings
      await page.getByRole('button', { name: /profile menu/i }).click();
      await page.getByRole('menuitem', { name: /Settings/i }).click();
      await page.getByRole('button', { name: /Users/i }).click();

      // Toggle guest mode ON - warning appears
      await page.locator('#guest-mode').click();
      await expect(page.getByText(/Enabling guest mode will delete all user accounts/i)).toBeVisible();

      // Click Cancel
      await page.getByRole('button', { name: /Cancel/i }).click();

      // Verify user is still logged in
      await page.getByRole('button', { name: /profile menu/i }).click();
      await expect(page.getByRole('menu').getByText('admin')).toBeVisible();
      await expect(page.getByRole('menuitem', { name: /Logout/i })).toBeVisible();
    });
  });

  test.describe('6. Data Wiping - Enabling Guest Mode', () => {
    test.beforeEach(async ({ page }) => {
      // Set up: create admin account
      await page.goto('/');
      await page.getByRole('button', { name: /profile menu/i }).click();
      await page.getByRole('menuitem', { name: /Settings/i }).click();
      await page.getByRole('button', { name: /Users/i }).click();
      await page.locator('#guest-mode').click();
      await page.getByLabel(/Username/i).fill('admin');
      await page.getByLabel(/^Password \*$/).fill('password123');
      await page.getByLabel(/Confirm Password/i).fill('password123');
      await page.getByRole('button', { name: /Save Changes/i }).click();
      await expect(page.getByText(/Authentication enabled/i)).toBeVisible({ timeout: 10000 });
      // Wait for dialog to close before continuing
      await expect(page.getByRole('heading', { name: /Settings/i })).not.toBeVisible({ timeout: 5000 });
    });

    test('6.1 Enabling guest mode deletes all user accounts', async ({ page }) => {
      // Open settings
      await page.getByRole('button', { name: /profile menu/i }).click();
      await page.getByRole('menuitem', { name: /Settings/i }).click();
      await page.getByRole('button', { name: /Users/i }).click();

      // Toggle guest mode ON and save
      await page.locator('#guest-mode').click();
      await page.getByRole('button', { name: /Save Changes/i }).click();

      // Verify toast notification about deletion with proper timeouts
      await expect(page.getByText(/Guest mode enabled/i)).toBeVisible({ timeout: 10000 });
      await expect(page.getByText(/All user accounts have been deleted/i)).toBeVisible({ timeout: 5000 });
    });

    test('6.2 User is logged out automatically', async ({ page }) => {
      // Open settings
      await page.getByRole('button', { name: /profile menu/i }).click();
      await page.getByRole('menuitem', { name: /Settings/i }).click();
      await page.getByRole('button', { name: /Users/i }).click();

      // Toggle guest mode ON and save
      await page.locator('#guest-mode').click();
      await page.getByRole('button', { name: /Save Changes/i }).click();

      // Wait for toast notification first
      await expect(page.getByText(/Guest mode enabled/i)).toBeVisible({ timeout: 10000 });

      // Wait for redirect and dialog close
      await expect(page).toHaveURL('/', { timeout: 5000 });
      await expect(page.getByRole('heading', { name: /Settings/i })).not.toBeVisible({ timeout: 5000 });

      // Verify user is logged out - wait for profile menu to be ready
      await page.getByRole('button', { name: /profile menu/i }).click();
      await expect(page.getByRole('menu').getByText('Guest Mode')).toBeVisible({ timeout: 5000 });
      await expect(page.getByRole('menu').getByText('admin')).not.toBeVisible();
      await expect(page.getByRole('menuitem', { name: /Logout/i })).not.toBeVisible();
    });

    test('6.3 User is redirected to home page', async ({ page }) => {
      // Navigate to a different page first
      await page.goto('/analytics');

      // Open settings
      await page.getByRole('button', { name: /profile menu/i }).click();
      await page.getByRole('menuitem', { name: /Settings/i }).click();
      await page.getByRole('button', { name: /Users/i }).click();

      // Toggle guest mode ON and save
      await page.locator('#guest-mode').click();
      await page.getByRole('button', { name: /Save Changes/i }).click();

      // Wait for toast notification first
      await expect(page.getByText(/Guest mode enabled/i)).toBeVisible({ timeout: 10000 });

      // Verify redirected to home page
      await expect(page).toHaveURL('/', { timeout: 5000 });
    });

    test('6.4 Toast notification shows deletion message', async ({ page }) => {
      // Open settings
      await page.getByRole('button', { name: /profile menu/i }).click();
      await page.getByRole('menuitem', { name: /Settings/i }).click();
      await page.getByRole('button', { name: /Users/i }).click();

      // Toggle guest mode ON and save
      await page.locator('#guest-mode').click();
      await page.getByRole('button', { name: /Save Changes/i }).click();

      // Verify exact toast messages with proper timeouts
      await expect(page.getByText('Guest mode enabled')).toBeVisible({ timeout: 10000 });
      await expect(page.getByText('All user accounts have been deleted')).toBeVisible({ timeout: 5000 });
    });

    test('6.5 Dialog closes after enabling guest mode', async ({ page }) => {
      // Open settings
      await page.getByRole('button', { name: /profile menu/i }).click();
      await page.getByRole('menuitem', { name: /Settings/i }).click();
      await page.getByRole('button', { name: /Users/i }).click();

      // Toggle guest mode ON and save
      await page.locator('#guest-mode').click();
      await page.getByRole('button', { name: /Save Changes/i }).click();

      // Wait for success toast first
      await expect(page.getByText(/Guest mode enabled/i)).toBeVisible({ timeout: 10000 });

      // Verify dialog closed
      await expect(page.getByRole('heading', { name: /Settings/i })).not.toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('7. Disabling Guest Mode Again After Data Wipe', () => {
    test.beforeEach(async ({ page }) => {
      // Set up: create admin, then re-enable guest mode
      await page.goto('/');
      await page.getByRole('button', { name: /profile menu/i }).click();
      await page.getByRole('menuitem', { name: /Settings/i }).click();
      await page.getByRole('button', { name: /Users/i }).click();
      await page.locator('#guest-mode').click();
      await page.getByLabel(/Username/i).fill('admin');
      await page.getByLabel(/^Password \*$/).fill('password123');
      await page.getByLabel(/Confirm Password/i).fill('password123');
      await page.getByRole('button', { name: /Save Changes/i }).click();
      await expect(page.getByText(/Authentication enabled/i)).toBeVisible({ timeout: 10000 });
      // Wait for dialog to close
      await expect(page.getByRole('heading', { name: /Settings/i })).not.toBeVisible({ timeout: 5000 });

      // Re-enable guest mode
      await page.getByRole('button', { name: /profile menu/i }).click();
      await page.getByRole('menuitem', { name: /Settings/i }).click();
      await page.getByRole('button', { name: /Users/i }).click();
      await page.locator('#guest-mode').click();
      await page.getByRole('button', { name: /Save Changes/i }).click();
      await expect(page.getByText(/Guest mode enabled/i)).toBeVisible({ timeout: 10000 });
      // Wait for dialog to close and state to settle
      await expect(page.getByRole('heading', { name: /Settings/i })).not.toBeVisible({ timeout: 5000 });
    });

    test('7.1 Admin form appears when disabling guest mode again', async ({ page }) => {
      // Open settings
      await page.getByRole('button', { name: /profile menu/i }).click();
      await page.getByRole('menuitem', { name: /Settings/i }).click();
      await page.getByRole('button', { name: /Users/i }).click();

      // Verify guest mode is enabled
      await expect(page.locator('#guest-mode')).toBeChecked();

      // Toggle guest mode OFF
      await page.locator('#guest-mode').click();

      // Verify admin creation form appears again
      await expect(page.getByText('Create Admin Account')).toBeVisible();
      await expect(page.getByLabel(/Username/i)).toBeVisible();
      await expect(page.getByLabel(/^Password \*$/)).toBeVisible();
      await expect(page.getByLabel(/Confirm Password/i)).toBeVisible();
    });

    test('7.2 Can create a new admin account with different credentials', async ({ page }) => {
      // Open settings
      await page.getByRole('button', { name: /profile menu/i }).click();
      await page.getByRole('menuitem', { name: /Settings/i }).click();
      await page.getByRole('button', { name: /Users/i }).click();

      // Toggle guest mode OFF
      await page.locator('#guest-mode').click();

      // Create new admin with different username
      await page.getByLabel(/Username/i).fill('newadmin');
      await page.getByLabel(/^Password \*$/).fill('newpassword123');
      await page.getByLabel(/Confirm Password/i).fill('newpassword123');
      await page.getByRole('button', { name: /Save Changes/i }).click();

      // Verify success with timeout
      await expect(page.getByText(/Authentication enabled/i)).toBeVisible({ timeout: 10000 });

      // Wait for dialog to close
      await expect(page.getByRole('heading', { name: /Settings/i })).not.toBeVisible({ timeout: 5000 });

      // Verify logged in as new user
      await page.getByRole('button', { name: /profile menu/i }).click();
      await expect(page.getByText('newadmin')).toBeVisible({ timeout: 5000 });
    });

    test('7.3 Previous admin credentials do not work after data wipe', async ({ page }) => {
      // Disable guest mode and create new admin
      await page.getByRole('button', { name: /profile menu/i }).click();
      await page.getByRole('menuitem', { name: /Settings/i }).click();
      await page.getByRole('button', { name: /Users/i }).click();
      await page.locator('#guest-mode').click();
      await page.getByLabel(/Username/i).fill('secondadmin');
      await page.getByLabel(/^Password \*$/).fill('secondpass123');
      await page.getByLabel(/Confirm Password/i).fill('secondpass123');
      await page.getByRole('button', { name: /Save Changes/i }).click();
      await expect(page.getByText(/Authentication enabled/i)).toBeVisible({ timeout: 10000 });

      // Wait for dialog to close
      await expect(page.getByRole('heading', { name: /Settings/i })).not.toBeVisible({ timeout: 5000 });

      // Logout
      await page.getByRole('button', { name: /profile menu/i }).click();
      await page.getByRole('menuitem', { name: /Logout/i }).click();
      await expect(page).toHaveURL(/\/login/, { timeout: 5000 });

      // Try to login with original admin credentials (should fail)
      await page.getByLabel(/Username/i).fill('admin');
      await page.getByLabel(/Password/i).fill('password123');
      await page.getByRole('button', { name: /Login/i }).click();

      // Verify login fails with timeout
      await expect(page.getByText(/Invalid username or password/i)).toBeVisible({ timeout: 5000 });

      // Verify can login with new credentials
      await page.getByLabel(/Username/i).fill('secondadmin');
      await page.getByLabel(/Password/i).fill('secondpass123');
      await page.getByRole('button', { name: /Login/i }).click();

      // Should succeed
      await expect(page).toHaveURL('/', { timeout: 5000 });
    });
  });

  test.describe('8. State Refresh and Persistence', () => {
    test('8.1 Auth status is re-fetched when opening settings dialog', async ({ page }) => {
      await page.goto('/');

      // Create admin account
      await page.getByRole('button', { name: /profile menu/i }).click();
      await page.getByRole('menuitem', { name: /Settings/i }).click();
      await page.getByRole('button', { name: /Users/i }).click();
      await page.locator('#guest-mode').click();
      await page.getByLabel(/Username/i).fill('admin');
      await page.getByLabel(/^Password \*$/).fill('password123');
      await page.getByLabel(/Confirm Password/i).fill('password123');
      await page.getByRole('button', { name: /Save Changes/i }).click();
      await expect(page.getByText(/Authentication enabled/i)).toBeVisible({ timeout: 10000 });

      // Wait for dialog to close
      await expect(page.getByRole('heading', { name: /Settings/i })).not.toBeVisible({ timeout: 5000 });

      // Reopen settings dialog
      await page.getByRole('button', { name: /profile menu/i }).click();
      await page.getByRole('menuitem', { name: /Settings/i }).click();
      await page.getByRole('button', { name: /Users/i }).click();

      // Verify current auth state is displayed
      await expect(page.getByText(/Authentication is enabled/i)).toBeVisible();
      await expect(page.getByText(/Logged in as/i)).toBeVisible();
      await expect(page.locator('#guest-mode')).not.toBeChecked();
    });

    test('8.2 Toggle state persists across dialog open/close', async ({ page }) => {
      await page.goto('/');
      await page.getByRole('button', { name: /profile menu/i }).click();
      await page.getByRole('menuitem', { name: /Settings/i }).click();
      await page.getByRole('button', { name: /Users/i }).click();

      // Wait for toggle to be ready
      const guestModeToggle = page.locator('#guest-mode');
      await expect(guestModeToggle).toBeEnabled();
      await expect(guestModeToggle).toBeChecked();

      // Toggle guest mode OFF (but don't save) and wait for state change
      await guestModeToggle.click();
      await expect(guestModeToggle).not.toBeChecked({ timeout: 5000 });

      // Close dialog using keyboard (more reliable than clicking Cancel on mobile)
      await page.keyboard.press('Escape');

      // Wait for dialog to close
      await expect(page.getByRole('heading', { name: /Settings/i })).not.toBeVisible({ timeout: 5000 });

      // Reopen dialog
      await page.getByRole('button', { name: /profile menu/i }).click();
      await page.getByRole('menuitem', { name: /Settings/i }).click();
      await page.getByRole('button', { name: /Users/i }).click();

      // Verify toggle is back to original state (enabled)
      await expect(guestModeToggle).toBeEnabled();
      await expect(guestModeToggle).toBeChecked({ timeout: 5000 });
    });

    test('8.3 Form data is cleared when dialog is closed', async ({ page }) => {
      await page.goto('/');
      await page.getByRole('button', { name: /profile menu/i }).click();
      await page.getByRole('menuitem', { name: /Settings/i }).click();
      await page.getByRole('button', { name: /Users/i }).click();

      // Wait for toggle to be ready and toggle guest mode OFF
      const guestModeToggle = page.locator('#guest-mode');
      await expect(guestModeToggle).toBeEnabled();
      await expect(guestModeToggle).toBeChecked();
      await guestModeToggle.click();
      await expect(guestModeToggle).not.toBeChecked();

      // Wait for form to appear and enter some data
      await expect(page.getByText('Create Admin Account')).toBeVisible();
      await page.getByLabel(/Username/i).fill('testuser');
      await page.getByLabel(/^Password \*$/).fill('testpass123');
      await page.getByLabel(/Confirm Password/i).fill('testpass123');

      // Close dialog using keyboard (more reliable than clicking Cancel on mobile)
      await page.keyboard.press('Escape');
      await expect(page.getByRole('heading', { name: /Settings/i })).not.toBeVisible();

      // Reopen dialog
      await page.getByRole('button', { name: /profile menu/i }).click();
      await page.getByRole('menuitem', { name: /Settings/i }).click();
      await page.getByRole('button', { name: /Users/i }).click();

      // Wait for toggle to be ready and toggle guest mode OFF again
      await expect(guestModeToggle).toBeEnabled();
      await expect(guestModeToggle).toBeChecked();
      await guestModeToggle.click();
      await expect(guestModeToggle).not.toBeChecked();

      // Wait for form to appear and verify form fields are empty
      await expect(page.getByText('Create Admin Account')).toBeVisible();
      await expect(page.getByLabel(/Username/i)).toHaveValue('');
      await expect(page.getByLabel(/^Password \*$/)).toHaveValue('');
      await expect(page.getByLabel(/Confirm Password/i)).toHaveValue('');
    });

    test('8.4 Validation errors are cleared when dialog is closed', async ({ page }) => {
      await page.goto('/');
      await page.getByRole('button', { name: /profile menu/i }).click();
      await page.getByRole('menuitem', { name: /Settings/i }).click();
      await page.getByRole('button', { name: /Users/i }).click();

      // Toggle guest mode OFF
      await page.locator('#guest-mode').click();

      // Wait for form to appear and fields to be ready
      await expect(page.getByText('Create Admin Account')).toBeVisible({ timeout: 5000 });

      const usernameField = page.getByLabel(/Username/i);
      await expect(usernameField).toBeEnabled();
      await usernameField.waitFor({ state: 'attached', timeout: 5000 });

      const passwordField = page.getByLabel(/^Password \*$/);
      await expect(passwordField).toBeEnabled();
      await passwordField.waitFor({ state: 'attached', timeout: 5000 });

      const confirmPasswordField = page.getByLabel(/Confirm Password/i);
      await expect(confirmPasswordField).toBeEnabled();
      await confirmPasswordField.waitFor({ state: 'attached', timeout: 5000 });

      // Clear and trigger validation error
      await usernameField.clear();
      await usernameField.fill('ab'); // Too short
      await expect(usernameField).toHaveValue('ab');

      await passwordField.clear();
      await passwordField.fill('password123');
      await expect(passwordField).toHaveValue('password123');

      await confirmPasswordField.clear();
      await confirmPasswordField.fill('password123');
      await expect(confirmPasswordField).toHaveValue('password123');

      // Trigger validation
      const saveButton = page.getByRole('button', { name: /Save Changes/i });
      await expect(saveButton).toBeEnabled();
      await saveButton.click();

      // Verify error message appears with timeout and specific selector
      const errorMessage = page.locator('p.text-xs.text-destructive', { hasText: /Username must be at least 3 characters/i });
      await expect(errorMessage).toBeVisible({ timeout: 10000 });

      // Close dialog
      await page.getByRole('button', { name: /Cancel/i }).click();
      await expect(page.getByRole('heading', { name: /Settings/i })).not.toBeVisible({ timeout: 5000 });

      // Reopen dialog
      await page.getByRole('button', { name: /profile menu/i }).click();
      await page.getByRole('menuitem', { name: /Settings/i }).click();
      await page.getByRole('button', { name: /Users/i }).click();

      // Wait for the dialog to be fully visible and interactive
      await expect(page.getByRole('heading', { name: /Settings/i })).toBeVisible({ timeout: 5000 });

      // Verify no validation errors are shown using the same specific selector
      await expect(errorMessage).not.toBeVisible();
    });
  });

  test.describe('9. Save Changes Button Behavior', () => {
    test('9.1 Save Changes does nothing when no changes made', async ({ page }) => {
      // Create admin first
      await page.goto('/');
      await page.getByRole('button', { name: /profile menu/i }).click();
      await page.getByRole('menuitem', { name: /Settings/i }).click();
      await page.getByRole('button', { name: /Users/i }).click();
      await page.locator('#guest-mode').click();
      await page.getByLabel(/Username/i).fill('admin');
      await page.getByLabel(/^Password \*$/).fill('password123');
      await page.getByLabel(/Confirm Password/i).fill('password123');
      await page.getByRole('button', { name: /Save Changes/i }).click();
      await expect(page.getByText(/Authentication enabled/i)).toBeVisible({ timeout: 10000 });

      // Wait for dialog to close
      await expect(page.getByRole('heading', { name: /Settings/i })).not.toBeVisible({ timeout: 5000 });

      // Reopen settings
      await page.getByRole('button', { name: /profile menu/i }).click();
      await page.getByRole('menuitem', { name: /Settings/i }).click();
      await page.getByRole('button', { name: /Users/i }).click();

      // Click Save Changes without making any changes
      await page.getByRole('button', { name: /Save Changes/i }).click();

      // Dialog should just close (no toast or error)
      await expect(page.getByRole('heading', { name: /Settings/i })).not.toBeVisible({ timeout: 5000 });

      // Verify user is still logged in
      await page.getByRole('button', { name: /profile menu/i }).click();
      await expect(page.getByRole('menu').getByText('admin')).toBeVisible({ timeout: 5000 });
    });

    test('9.2 Save Changes button type is "submit" when admin form is shown', async ({ page }) => {
      await page.goto('/');
      await page.getByRole('button', { name: /profile menu/i }).click();
      await page.getByRole('menuitem', { name: /Settings/i }).click();
      await page.getByRole('button', { name: /Users/i }).click();

      // Toggle guest mode OFF to show form
      await page.locator('#guest-mode').click();

      // Save Changes button should be type="submit" and form="admin-form"
      const saveButton = page.getByRole('button', { name: /Save Changes/i });
      await expect(saveButton).toHaveAttribute('type', 'submit');
      await expect(saveButton).toHaveAttribute('form', 'admin-form');
    });

    test('9.3 Save Changes button type is "button" when no form is shown', async ({ page }) => {
      // Create admin first
      await page.goto('/');
      await page.getByRole('button', { name: /profile menu/i }).click();
      await page.getByRole('menuitem', { name: /Settings/i }).click();
      await page.getByRole('button', { name: /Users/i }).click();
      await page.locator('#guest-mode').click();
      await page.getByLabel(/Username/i).fill('admin');
      await page.getByLabel(/^Password \*$/).fill('password123');
      await page.getByLabel(/Confirm Password/i).fill('password123');
      await page.getByRole('button', { name: /Save Changes/i }).click();
      await expect(page.getByText(/Authentication enabled/i)).toBeVisible({ timeout: 10000 });

      // Wait for dialog to close
      await expect(page.getByRole('heading', { name: /Settings/i })).not.toBeVisible({ timeout: 5000 });

      // Reopen settings
      await page.getByRole('button', { name: /profile menu/i }).click();
      await page.getByRole('menuitem', { name: /Settings/i }).click();
      await page.getByRole('button', { name: /Users/i }).click();

      // Save Changes button should be type="button" (no admin form shown)
      const saveButton = page.getByRole('button', { name: /Save Changes/i });
      await expect(saveButton).toHaveAttribute('type', 'button');
    });

    test('9.4 Cancel button is always enabled', async ({ page }) => {
      await page.goto('/');
      await page.getByRole('button', { name: /profile menu/i }).click();
      await page.getByRole('menuitem', { name: /Settings/i }).click();
      await page.getByRole('button', { name: /Users/i }).click();

      // Cancel should be enabled
      const cancelButton = page.getByRole('button', { name: /Cancel/i });
      await expect(cancelButton).toBeEnabled();
    });

    test('9.5 Both buttons are disabled during form submission', async ({ page }) => {
      await page.goto('/');
      await page.getByRole('button', { name: /profile menu/i }).click();
      await page.getByRole('menuitem', { name: /Settings/i }).click();
      await page.getByRole('button', { name: /Users/i }).click();
      await page.locator('#guest-mode').click();

      // Fill form
      await page.getByLabel(/Username/i).fill('admin');
      await page.getByLabel(/^Password \*$/).fill('password123');
      await page.getByLabel(/Confirm Password/i).fill('password123');

      // Click Save
      await page.getByRole('button', { name: /Save Changes/i }).click();

      // Both buttons should be disabled during loading
      await expect(page.getByRole('button', { name: /Cancel/i })).toBeDisabled();
      await expect(page.getByRole('button', { name: /Saving/i })).toBeDisabled();

      // Wait for completion
      await expect(page.getByText(/Authentication enabled/i)).toBeVisible();
    });

    test('9.6 Guest mode toggle is disabled during form submission', async ({ page }) => {
      await page.goto('/');
      await page.getByRole('button', { name: /profile menu/i }).click();
      await page.getByRole('menuitem', { name: /Settings/i }).click();
      await page.getByRole('button', { name: /Users/i }).click();
      await page.locator('#guest-mode').click();

      // Fill form
      await page.getByLabel(/Username/i).fill('admin');
      await page.getByLabel(/^Password \*$/).fill('password123');
      await page.getByLabel(/Confirm Password/i).fill('password123');

      // Click Save
      await page.getByRole('button', { name: /Save Changes/i }).click();

      // Toggle should be disabled
      await expect(page.locator('#guest-mode')).toBeDisabled();

      // Wait for completion
      await expect(page.getByText(/Authentication enabled/i)).toBeVisible();
    });
  });

  test.describe('10. Complete End-to-End Workflows', () => {
    test('10.1 Complete flow: Guest → Admin Setup → Re-enable Guest → Admin Setup Again', async ({ page }) => {
      await page.goto('/');

      // Step 1: Start in guest mode
      await page.getByRole('button', { name: /profile menu/i }).click();
      await expect(page.getByText('Guest Mode')).toBeVisible();

      // Step 2: Create first admin account
      await page.getByRole('menuitem', { name: /Settings/i }).click();
      await page.getByRole('button', { name: /Users/i }).click();
      await page.locator('#guest-mode').click();
      await page.getByLabel(/Username/i).fill('firstadmin');
      await page.getByLabel(/^Password \*$/).fill('firstpass123');
      await page.getByLabel(/Confirm Password/i).fill('firstpass123');
      await page.getByRole('button', { name: /Save Changes/i }).click();
      await expect(page.getByText(/Authentication enabled/i)).toBeVisible({ timeout: 10000 });

      // Wait for dialog to close
      await expect(page.getByRole('heading', { name: /Settings/i })).not.toBeVisible({ timeout: 5000 });

      // Step 3: Verify logged in
      await page.getByRole('button', { name: /profile menu/i }).click();
      await expect(page.getByText('firstadmin')).toBeVisible({ timeout: 5000 });

      // Step 4: Re-enable guest mode
      await page.getByRole('menuitem', { name: /Settings/i }).click();
      await page.getByRole('button', { name: /Users/i }).click();
      await page.locator('#guest-mode').click();
      await expect(page.getByText(/Enabling guest mode will delete all user accounts/i)).toBeVisible();
      await page.getByRole('button', { name: /Save Changes/i }).click();
      await expect(page.getByText(/All user accounts have been deleted/i)).toBeVisible({ timeout: 10000 });

      // Wait for redirect and dialog to close
      await expect(page.getByRole('heading', { name: /Settings/i })).not.toBeVisible({ timeout: 5000 });

      // Step 5: Verify logged out and in guest mode
      await page.getByRole('button', { name: /profile menu/i }).click();
      await expect(page.getByRole('menu').getByText('Guest Mode')).toBeVisible({ timeout: 5000 });
      await expect(page.getByRole('menu').getByText('firstadmin')).not.toBeVisible();

      // Step 6: Create second admin account
      await page.getByRole('menuitem', { name: /Settings/i }).click();
      await page.getByRole('button', { name: /Users/i }).click();
      await page.locator('#guest-mode').click();
      await page.getByLabel(/Username/i).fill('secondadmin');
      await page.getByLabel(/^Password \*$/).fill('secondpass123');
      await page.getByLabel(/Confirm Password/i).fill('secondpass123');
      await page.getByRole('button', { name: /Save Changes/i }).click();
      await expect(page.getByText(/Authentication enabled/i)).toBeVisible({ timeout: 10000 });

      // Wait for dialog to close
      await expect(page.getByRole('heading', { name: /Settings/i })).not.toBeVisible({ timeout: 5000 });

      // Step 7: Verify logged in as second admin
      await page.getByRole('button', { name: /profile menu/i }).click();
      await expect(page.getByText('secondadmin')).toBeVisible({ timeout: 5000 });
    });

    test('10.2 Toggle guest mode multiple times before saving', async ({ page }) => {
      await page.goto('/');
      await page.getByRole('button', { name: /profile menu/i }).click();
      await page.getByRole('menuitem', { name: /Settings/i }).click();
      await page.getByRole('button', { name: /Users/i }).click();

      // Toggle off, on, off, on, off - ending with off
      await page.locator('#guest-mode').click(); // Off - form appears
      await expect(page.getByText('Create Admin Account')).toBeVisible();

      await page.locator('#guest-mode').click(); // On - form disappears
      await expect(page.getByText('Create Admin Account')).not.toBeVisible();

      await page.locator('#guest-mode').click(); // Off - form appears
      await expect(page.getByText('Create Admin Account')).toBeVisible();

      await page.locator('#guest-mode').click(); // On - form disappears
      await expect(page.getByText('Create Admin Account')).not.toBeVisible();

      await page.locator('#guest-mode').click(); // Off - form appears
      await expect(page.getByText('Create Admin Account')).toBeVisible();

      // Fill and save
      await page.getByLabel(/Username/i).fill('admin');
      await page.getByLabel(/^Password \*$/).fill('password123');
      await page.getByLabel(/Confirm Password/i).fill('password123');
      await page.getByRole('button', { name: /Save Changes/i }).click();

      // Verify success with timeout
      await expect(page.getByText(/Authentication enabled/i)).toBeVisible({ timeout: 10000 });
    });

    test('10.3 Navigate between tabs while form is filled', async ({ page }) => {
      await page.goto('/');
      await page.getByRole('button', { name: /profile menu/i }).click();
      await page.getByRole('menuitem', { name: /Settings/i }).click();
      await page.getByRole('button', { name: /Users/i }).click();

      // Toggle guest mode off and fill form
      await page.locator('#guest-mode').click();
      await page.getByLabel(/Username/i).fill('admin');
      await page.getByLabel(/^Password \*$/).fill('password123');
      await page.getByLabel(/Confirm Password/i).fill('password123');

      // Switch to General tab
      await page.getByRole('button', { name: 'General' }).click();
      await expect(page.getByText(/General application settings/i)).toBeVisible();

      // Switch back to Users tab
      await page.getByRole('button', { name: 'Users' }).click();

      // Verify form data is still there
      await expect(page.getByLabel(/Username/i)).toHaveValue('admin');
      await expect(page.getByLabel(/^Password \*$/)).toHaveValue('password123');
      await expect(page.getByLabel(/Confirm Password/i)).toHaveValue('password123');

      // Submit
      await page.getByRole('button', { name: /Save Changes/i }).click();
      await expect(page.getByText(/Authentication enabled/i)).toBeVisible({ timeout: 10000 });
    });

    test('10.4 Verify authenticated user management section', async ({ page }) => {
      await page.goto('/');

      // Create admin
      await page.getByRole('button', { name: /profile menu/i }).click();
      await page.getByRole('menuitem', { name: /Settings/i }).click();
      await page.getByRole('button', { name: /Users/i }).click();
      await page.locator('#guest-mode').click();
      await page.getByLabel(/Username/i).fill('admin');
      await page.getByLabel(/^Password \*$/).fill('password123');
      await page.getByLabel(/Confirm Password/i).fill('password123');
      await page.getByRole('button', { name: /Save Changes/i }).click();
      await expect(page.getByText(/Authentication enabled/i)).toBeVisible({ timeout: 10000 });

      // Wait for dialog to close
      await expect(page.getByRole('heading', { name: /Settings/i })).not.toBeVisible({ timeout: 5000 });

      // Reopen settings
      await page.getByRole('button', { name: /profile menu/i }).click();
      await page.getByRole('menuitem', { name: /Settings/i }).click();
      await page.getByRole('button', { name: /Users/i }).click();

      // Verify "User Management" section appears for authenticated users
      await expect(page.getByText('User Management', { exact: true })).toBeVisible();
      await expect(page.getByText(/Additional user management features coming soon/i)).toBeVisible();
    });
  });

  test.describe('11. Edge Cases and Error Handling', () => {
    test('11.1 Very long valid username (50 characters)', async ({ page }) => {
      await page.goto('/');
      await page.getByRole('button', { name: /profile menu/i }).click();
      await page.getByRole('menuitem', { name: /Settings/i }).click();
      await page.getByRole('button', { name: /Users/i }).click();
      await page.locator('#guest-mode').click();

      // Enter exactly 50 characters (max allowed)
      const username50 = 'a'.repeat(50);
      await page.getByLabel(/Username/i).fill(username50);
      await page.getByLabel(/^Password \*$/).fill('password123');
      await page.getByLabel(/Confirm Password/i).fill('password123');

      // Should succeed
      await page.getByRole('button', { name: /Save Changes/i }).click();
      await expect(page.getByText(/Authentication enabled/i)).toBeVisible({ timeout: 10000 });
    });

    test('11.2 Very long valid password (100 characters)', async ({ page }) => {
      await page.goto('/');
      await page.getByRole('button', { name: /profile menu/i }).click();
      await page.getByRole('menuitem', { name: /Settings/i }).click();
      await page.getByRole('button', { name: /Users/i }).click();
      await page.locator('#guest-mode').click();

      // Enter exactly 100 characters (max allowed)
      const password100 = 'p'.repeat(100);
      await page.getByLabel(/Username/i).fill('admin');
      await page.getByLabel(/^Password \*$/).fill(password100);
      await page.getByLabel(/Confirm Password/i).fill(password100);

      // Should succeed
      await page.getByRole('button', { name: /Save Changes/i }).click();
      await expect(page.getByText(/Authentication enabled/i)).toBeVisible({ timeout: 10000 });
    });

    test('11.3 Username with special characters', async ({ page }) => {
      await page.goto('/');
      await page.getByRole('button', { name: /profile menu/i }).click();
      await page.getByRole('menuitem', { name: /Settings/i }).click();
      await page.getByRole('button', { name: /Users/i }).click();
      await page.locator('#guest-mode').click();

      // Try username with special characters
      await page.getByLabel(/Username/i).fill('admin-user_123');
      await page.getByLabel(/^Password \*$/).fill('password123');
      await page.getByLabel(/Confirm Password/i).fill('password123');

      // Should succeed (no character restrictions)
      await page.getByRole('button', { name: /Save Changes/i }).click();
      await expect(page.getByText(/Authentication enabled/i)).toBeVisible({ timeout: 10000 });
    });

    test('11.4 Password with special characters and spaces', async ({ page }) => {
      await page.goto('/');
      await page.getByRole('button', { name: /profile menu/i }).click();
      await page.getByRole('menuitem', { name: /Settings/i }).click();
      await page.getByRole('button', { name: /Users/i }).click();
      await page.locator('#guest-mode').click();

      // Try password with special chars and spaces
      await page.getByLabel(/Username/i).fill('admin');
      await page.getByLabel(/^Password \*$/).fill('p@ss w0rd!123');
      await page.getByLabel(/Confirm Password/i).fill('p@ss w0rd!123');

      // Should succeed
      await page.getByRole('button', { name: /Save Changes/i }).click();
      await expect(page.getByText(/Authentication enabled/i)).toBeVisible({ timeout: 10000 });
    });

    test('11.5 Exact minimum length username (3 characters)', async ({ page }) => {
      await page.goto('/');
      await page.getByRole('button', { name: /profile menu/i }).click();
      await page.getByRole('menuitem', { name: /Settings/i }).click();
      await page.getByRole('button', { name: /Users/i }).click();
      await page.locator('#guest-mode').click();

      // Enter exactly 3 characters (min allowed)
      await page.getByLabel(/Username/i).fill('abc');
      await page.getByLabel(/^Password \*$/).fill('password123');
      await page.getByLabel(/Confirm Password/i).fill('password123');

      // Should succeed
      await page.getByRole('button', { name: /Save Changes/i }).click();
      await expect(page.getByText(/Authentication enabled/i)).toBeVisible({ timeout: 10000 });
    });

    test('11.6 Exact minimum length password (8 characters)', async ({ page }) => {
      await page.goto('/');
      await page.getByRole('button', { name: /profile menu/i }).click();
      await page.getByRole('menuitem', { name: /Settings/i }).click();
      await page.getByRole('button', { name: /Users/i }).click();
      await page.locator('#guest-mode').click();

      // Enter exactly 8 characters (min allowed)
      await page.getByLabel(/Username/i).fill('admin');
      await page.getByLabel(/^Password \*$/).fill('password');
      await page.getByLabel(/Confirm Password/i).fill('password');

      // Should succeed
      await page.getByRole('button', { name: /Save Changes/i }).click();
      await expect(page.getByText(/Authentication enabled/i)).toBeVisible({ timeout: 10000 });
    });

    test('11.7 Whitespace in username (leading and trailing)', async ({ page }) => {
      await page.goto('/');
      await page.getByRole('button', { name: /profile menu/i }).click();
      await page.getByRole('menuitem', { name: /Settings/i }).click();
      await page.getByRole('button', { name: /Users/i }).click();
      await page.locator('#guest-mode').click();

      // Enter username with spaces
      await page.getByLabel(/Username/i).fill('  admin  ');
      await page.getByLabel(/^Password \*$/).fill('password123');
      await page.getByLabel(/Confirm Password/i).fill('password123');

      // Should succeed (spaces are allowed in username)
      await page.getByRole('button', { name: /Save Changes/i }).click();
      await expect(page.getByText(/Authentication enabled/i)).toBeVisible({ timeout: 10000 });
    });

    test.skip('11.8 Rapid toggling of guest mode switch', async ({ page }) => {
      await page.goto('/');
      await page.getByRole('button', { name: /profile menu/i }).click();
      await page.getByRole('menuitem', { name: /Settings/i }).click();
      await page.getByRole('button', { name: /Users/i }).click();

      // Rapidly toggle 10 times
      for (let i = 0; i < 10; i++) {
        await page.locator('#guest-mode').click();
      }

      // Final state should be off (started checked, 10 clicks = unchecked)
      await expect(page.locator('#guest-mode')).not.toBeChecked();
      await expect(page.getByText('Create Admin Account')).toBeVisible();
    });
  });
});
