# Authentication Settings - Playwright Test Plan

## Overview
Test plan for the authentication settings dialog features including guest mode toggle, admin account creation, and user data management.

## Test Scenarios

### 1. Settings Dialog Access and Navigation

#### 1.1 Open Settings Dialog
- **Action**: Click profile icon in top-right corner, click "Settings" menu item
- **Expected**: Settings dialog opens showing "General" tab by default
- **Verify**: Dialog title is "Settings", description is visible

#### 1.2 Tab Navigation with Mouse
- **Action**: Click "Users" tab
- **Expected**: Users tab content displays, tab has active border styling
- **Action**: Click "General" tab
- **Expected**: General tab content displays, tab has active border styling

#### 1.3 Tab Navigation with Keyboard
- **Action**: Press Tab key to focus "Users" tab button, press Enter
- **Expected**: Users tab activates and shows green focus ring
- **Verify**: Focus ring uses primary (green) color, not browser default blue

#### 1.4 Close Dialog
- **Action**: Click "Cancel" button
- **Expected**: Dialog closes without making changes
- **Action**: Click X button or press Escape
- **Expected**: Dialog closes

### 2. Initial Admin Setup (Guest Mode → Authenticated)

#### 2.1 Disable Guest Mode for First Time
- **Given**: Application is in guest mode (default state)
- **Action**: Open Settings → Users tab
- **Verify**: Alert shows "Guest mode is currently enabled"
- **Action**: Toggle "Guest Mode" switch to OFF
- **Expected**:
  - Admin creation form appears with fields: Username, Password, Confirm Password
  - Username field has autofocus
  - Form heading shows "Create Admin Account"
  - No warning message appears

#### 2.2 Form Validation - Short Username
- **Given**: Admin creation form is visible
- **Action**: Enter username "ab" (2 characters), password "password123", confirm "password123"
- **Action**: Click "Save Changes"
- **Expected**: Error message "Username must be at least 3 characters"
- **Verify**: Dialog remains open, form data persists

#### 2.3 Form Validation - Short Password
- **Given**: Admin creation form is visible
- **Action**: Enter username "admin", password "pass" (4 characters), confirm "pass"
- **Action**: Click "Save Changes"
- **Expected**: Error message "Password must be at least 8 characters"

#### 2.4 Form Validation - Mismatched Passwords
- **Given**: Admin creation form is visible
- **Action**: Enter username "admin", password "password123", confirm "password456"
- **Action**: Click "Save Changes"
- **Expected**: Error message "Passwords do not match"

#### 2.5 Successful Admin Creation with Button
- **Given**: Admin creation form is visible
- **Action**: Enter username "testadmin", password "testpass123", confirm "testpass123"
- **Action**: Click "Save Changes"
- **Expected**:
  - Toast notification: "Authentication enabled! You are now logged in"
  - Dialog closes
  - Page refreshes
  - Profile dropdown shows username "testadmin"
  - "Logout" option appears in dropdown

#### 2.6 Successful Admin Creation with Enter Key
- **Given**: Admin creation form is visible
- **Action**: Enter username "testadmin", password "testpass123", confirm "testpass123"
- **Action**: Press Enter key while in any form field
- **Expected**: Same as 2.5 - form submits and admin is created

### 3. Guest Mode Re-enablement (Authenticated → Guest Mode)

#### 3.1 Enable Guest Mode Warning
- **Given**: User is authenticated (guest mode is OFF)
- **Action**: Open Settings → Users tab
- **Verify**: Alert shows "Authentication is enabled. Logged in as testadmin"
- **Action**: Toggle "Guest Mode" switch to ON
- **Expected**:
  - Red destructive alert appears with warning
  - Warning text: "Enabling guest mode will delete all user accounts and authentication data. This action cannot be undone."
  - No admin creation form appears
  - "Save Changes" button is enabled

#### 3.2 Cancel Guest Mode Enablement
- **Given**: Warning is visible
- **Action**: Click "Cancel" button
- **Expected**: Dialog closes, guest mode remains OFF, user still authenticated

#### 3.3 Enable Guest Mode and Wipe Data
- **Given**: Warning is visible, guest mode toggle is ON
- **Action**: Click "Save Changes"
- **Expected**:
  - Toast notification: "Guest mode enabled - All user accounts have been deleted"
  - Dialog closes
  - User is redirected to home page (/)
  - Page refreshes
  - Profile dropdown no longer shows username
  - "Logout" option is gone from dropdown

### 4. Re-disable Guest Mode After Data Wipe

#### 4.1 Create New Admin After Wipe
- **Given**: Guest mode was re-enabled, all users deleted
- **Action**: Open Settings → Users tab
- **Verify**: Alert shows "Guest mode is currently enabled"
- **Action**: Toggle "Guest Mode" switch to OFF
- **Expected**: Admin creation form appears again (since no users exist)
- **Action**: Enter username "newadmin", password "newpass123", confirm "newpass123"
- **Action**: Press Enter
- **Expected**: New admin created successfully, user logged in as "newadmin"

### 5. State Persistence and Refresh

#### 5.1 Dialog Reopening Refreshes State
- **Given**: User is authenticated
- **Action**: Open Settings → Users tab
- **Verify**: Toggle shows guest mode OFF, correct auth status
- **Action**: Close dialog
- **Action**: Immediately reopen Settings → Users tab
- **Expected**: State is re-fetched, toggle still shows correct state

#### 5.2 No Changes Scenario
- **Given**: Settings dialog is open on Users tab
- **Action**: Don't change any settings
- **Action**: Click "Save Changes"
- **Expected**: Dialog closes immediately without any API calls or toasts

#### 5.3 Toggle Multiple Times Before Saving
- **Given**: Guest mode is OFF
- **Action**: Toggle guest mode ON (warning appears)
- **Action**: Toggle guest mode OFF (warning disappears)
- **Action**: Toggle guest mode ON (warning appears again)
- **Action**: Click "Cancel"
- **Expected**: No changes saved, guest mode remains OFF

### 6. Edge Cases

#### 6.1 Form Autofocus
- **Given**: Guest mode OFF toggle triggers admin form
- **Expected**: Username field automatically has focus
- **Action**: Start typing immediately
- **Expected**: Text appears in username field

#### 6.2 Loading States
- **Given**: Form is being submitted
- **Expected**:
  - "Save Changes" button shows "Saving..."
  - All form fields are disabled
  - Toggle is disabled

#### 6.3 User Management Section (Authenticated)
- **Given**: User is authenticated
- **Action**: Open Settings → Users tab
- **Expected**: After guest mode toggle, separator and "User Management" heading appear
- **Verify**: Text shows "Additional user management features coming soon."

### 7. Accessibility

#### 7.1 Keyboard Navigation
- **Action**: Use Tab key to navigate through all interactive elements
- **Expected**: All focusable elements receive green focus ring
- **Verify**: Tab order is logical: tabs → toggle → form fields → buttons

#### 7.2 Screen Reader Labels
- **Verify**: All form fields have associated labels
- **Verify**: Toggle has "Guest Mode" label
- **Verify**: Required field indicators are present (*)

## Test Data

### Valid Admin Credentials
- Username: testadmin, Password: testpass123
- Username: admin, Password: password123
- Username: newadmin, Password: newpass123

### Invalid Test Cases
- Username too short: ab
- Password too short: pass
- Mismatched passwords: password123 / password456

## Prerequisites
- Application running at http://localhost:3000
- Fresh database state (or ability to reset)
- MSW handlers properly configured for auth endpoints

## Success Criteria
- All form validations work correctly
- Enter key submission works
- Guest mode toggle with warning functions properly
- Data wipe on guest mode enablement works
- State refresh when reopening dialog works
- Keyboard navigation with green focus rings works
- No console errors during any flow
