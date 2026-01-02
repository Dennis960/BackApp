/**
 * UI Test Helpers
 * 
 * Functions for interacting with the UI in tests
 */
import { Page, expect } from '@playwright/test';

/**
 * Create a server via the UI
 */
export async function createServerViaUI(
  page: Page,
  name: string,
  host: string,
  port: string,
  username: string,
  password: string
): Promise<void> {
  await page.goto('/servers');

  // Click the "Add Server" button
  await page.getByTestId('add-server-btn').click();

  // Wait for the form to appear
  await expect(page.getByTestId('add-server-form-container')).toBeVisible();

  // Fill in the server details
  await page.getByTestId('input-name').locator('input').fill(name);
  await page.getByTestId('input-host').locator('input').fill(host);
  await page.getByTestId('input-port').locator('input').fill(port);
  await page.getByTestId('input-username').locator('input').fill(username);

  // Select password authentication
  await page.getByTestId('auth-type-password').click();

  // Fill in the password
  await page.getByTestId('input-password').locator('input').fill(password);

  // Submit the form
  await page.getByTestId('save-server-btn').click();

  // Verify the form is closed and the server appears in the list
  await expect(page.getByTestId('add-server-form-container')).not.toBeVisible();
  await expect(page.getByText(name)).toBeVisible();
}

/**
 * Create a server via the UI using private key authentication
 */
export async function createServerWithKeyViaUI(
  page: Page,
  name: string,
  host: string,
  port: string,
  username: string,
  privateKey: string
): Promise<void> {
  await page.goto('/servers');

  // Click the "Add Server" button
  await page.getByTestId('add-server-btn').click();

  // Wait for the form to appear
  await expect(page.getByTestId('add-server-form-container')).toBeVisible();

  // Fill in the server details
  await page.getByTestId('input-name').locator('input').fill(name);
  await page.getByTestId('input-host').locator('input').fill(host);
  await page.getByTestId('input-port').locator('input').fill(port);
  await page.getByTestId('input-username').locator('input').fill(username);

  // Upload private key for authentication
  await page.getByTestId('keyfile-input').locator('input').setInputFiles({
    name: 'private_key.pem',
    mimeType: 'application/x-pem-file',
    buffer: Buffer.from(privateKey),
  });

  // Submit the form
  await page.getByTestId('save-server-btn').click();

  // Verify the form is closed and the server appears in the list
  await expect(page.getByTestId('add-server-form-container')).not.toBeVisible();
  await expect(page.getByText(name)).toBeVisible();
}

/**
 * Test a server connection via the UI
 */
export async function testServerConnectionViaUI(
  page: Page,
  serverId: number,
  expectedStatus: number
): Promise<Response> {
  const testConnectionResponsePromise = page.waitForResponse((response) => {
    const url = new URL(response.url());
    return (
      url.pathname === `/api/v1/servers/${serverId}/test-connection` &&
      response.request().method() === 'POST' &&
      response.status() === expectedStatus
    );
  });

  await page.getByTestId(`test-connection-btn-${serverId}`).click();
  return testConnectionResponsePromise;
}

/**
 * Create a storage location via the UI
 */
export async function createStorageLocationViaUI(
  page: Page,
  name: string,
  basePath: string
): Promise<void> {
  await page.goto('/storage-locations');

  // Click the "Add Storage" button
  await page.getByTestId('add-storage-btn').click();

  // Wait for the form to appear
  await expect(page.getByTestId('storage-form-dialog')).toBeVisible();

  // Fill in the storage location details
  await page.getByTestId('input-name').locator('input').fill(name);
  await page.getByTestId('input-base-path').locator('input').fill(basePath);

  // Submit the form
  await page.getByTestId('save-storage-btn').click();

  // Verify the form is closed and the storage location appears in the list
  await expect(page.getByTestId('storage-form-dialog')).not.toBeVisible();
  await expect(page.getByText(name)).toBeVisible();
}

/**
 * Create a naming rule via the UI
 */
export async function createNamingRuleViaUI(
  page: Page,
  name: string,
  pattern: string
): Promise<void> {
  await page.goto('/naming-rules');

  // Click the "Add Naming Rule" button
  await page.getByTestId('add-naming-rule-btn').click();

  // Wait for the form to appear
  await expect(page.getByTestId('naming-rule-dialog')).toBeVisible();

  // Fill in the naming rule details
  await page.getByTestId('input-name').locator('input').fill(name);
  await page.getByTestId('input-pattern').locator('textarea').first().fill(pattern);

  // Submit the form
  await page.getByTestId('save-naming-rule-btn').click();

  // Verify the form is closed and the naming rule appears in the list
  await expect(page.getByTestId('naming-rule-dialog')).not.toBeVisible();
  await expect(page.getByText(name)).toBeVisible();
}

/**
 * Navigate to the dashboard
 */
export async function goToDashboard(page: Page): Promise<void> {
  await page.goto('/');
  // Dashboard doesn't have a title heading, just wait for content to load
  await expect(page.getByText('Total Servers')).toBeVisible();
}

/**
 * Navigate to the servers page
 */
export async function goToServers(page: Page): Promise<void> {
  await page.goto('/servers');
  await expect(page.getByRole('heading', { name: 'Servers', level: 3 })).toBeVisible();
}

/**
 * Navigate to the storage locations page
 */
export async function goToStorageLocations(page: Page): Promise<void> {
  await page.goto('/storage-locations');
  await expect(page.getByRole('heading', { name: 'Storage Locations', level: 3 })).toBeVisible();
}

/**
 * Navigate to the naming rules page
 */
export async function goToNamingRules(page: Page): Promise<void> {
  await page.goto('/naming-rules');
  await expect(page.getByRole('heading', { name: 'Naming Rules', level: 3 })).toBeVisible();
}

/**
 * Navigate to the backup profiles page
 */
export async function goToBackupProfiles(page: Page): Promise<void> {
  await page.goto('/backup-profiles');
  await expect(page.getByRole('heading', { name: 'Backup Profiles', level: 3 })).toBeVisible();
}

/**
 * Navigate to the backup runs page
 */
export async function goToBackupRuns(page: Page): Promise<void> {
  await page.goto('/backup-runs');
  await expect(page.getByRole('heading', { name: 'Backup Runs', level: 3 })).toBeVisible();
}

/**
 * Wait for a toast/snackbar message to appear
 */
export async function waitForSnackbar(page: Page, message: string | RegExp): Promise<void> {
  await expect(page.getByRole('alert').filter({ hasText: message })).toBeVisible();
}

/**
 * Close a toast/snackbar message
 */
export async function closeSnackbar(page: Page): Promise<void> {
  await page.getByRole('alert').getByRole('button').click();
  await expect(page.getByRole('alert')).not.toBeVisible();
}
