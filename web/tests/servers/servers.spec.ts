import { expect, Page, test } from '@playwright/test';
import { SSH_PRIVATE_KEY, startFakeSSHServer } from '../helpers/fake-ssh-server';
import { resetDatabase } from '../helpers/api-helpers';

test.beforeEach(async ({ request }) => {
  const response = await request.post('/api/v1/test/reset-database');

  if (!response.ok()) {
    throw new Error('Failed to reset database');
  }
});

let sshServer: any;

test.beforeAll(async ({}) => {
  // Any global setup can be done here
  sshServer = await startFakeSSHServer(2222, 'root', 'passwd');
});
test.afterAll(async ({}) => {
  // Any global teardown can be done here
  sshServer.close();
});

async function createServer(page: Page, name: string, host: string, port: string, username: string, password: string) {
  await page.goto('/servers');
  
  // Click the "Add Server" button
  await page.getByTestId('add-server-btn').click();
  
  // Wait for the form to appear
  await expect(page.getByTestId('add-server-form-container')).toBeVisible();
  
  // Fill in the server details - use input fields within the testid containers
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

async function createServerWithKey(page: Page, name: string, host: string, port: string, username: string, privateKey: string) {
  await page.goto('/servers');
  
  // Click the "Add Server" button
  await page.getByTestId('add-server-btn').click();
  
  // Wait for the form to appear
  await expect(page.getByTestId('add-server-form-container')).toBeVisible();
  
  // Fill in the server details - use input fields within the testid containers
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

async function testServerConnection(page: Page, serverId: number, expectedStatus: number) {
  const testConnectionResponsePromise = page.waitForResponse((response) => {
    const url = new URL(response.url());

    return (
      url.pathname === `/api/v1/servers/${serverId}/test-connection` &&
      response.request().method() === 'POST' &&
      response.status() === expectedStatus
    );
  });

  await page.getByTestId(`test-connection-btn-${serverId}`).click();

  const response = await testConnectionResponsePromise;
  return response;
}

test('should add a server with password authentication', async ({ page }) => {
  await createServer(page, 'SSH Test Server', 'localhost', '2222', 'root', 'passwd');
  const response = await testServerConnection(page, 1, 200);
  expect(response.ok()).toBeTruthy();
});

test('should add a server with password authentication on port 24 but fail the test', async ({ page }) => {
  await createServer(page, 'SSH Test Server', 'localhost', '24', 'root', 'passwd');
  const response = await testServerConnection(page, 1, 500);
  expect(response.ok()).toBeFalsy();
});

test('should add a server with private key authentication', async ({ page }) => {
  await createServerWithKey(page, 'SSH Key Test Server', 'localhost', '2222', 'root', SSH_PRIVATE_KEY);
  const response = await testServerConnection(page, 1, 200);
  expect(response.ok()).toBeTruthy();
});