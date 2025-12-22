import { test, expect } from '@playwright/test';

test('add a server with password authentication', async ({ page }) => {
  await page.goto('/servers');
  
  // Click the "Add Server" button
  await page.getByTestId('add-server-btn').click();
  
  // Wait for the form to appear
  await expect(page.getByTestId('add-server-form-container')).toBeVisible();
  
  // Fill in the server details - use input fields within the testid containers
  await page.getByTestId('input-name').locator('input').fill('SSH Test Server');
  await page.getByTestId('input-host').locator('input').fill('ssh');
  await page.getByTestId('input-port').locator('input').fill('22');
  await page.getByTestId('input-username').locator('input').fill('root');
  
  // Select password authentication
  await page.getByTestId('auth-type-password').click();
  
  // Fill in the password
  await page.getByTestId('input-password').locator('input').fill('ssh');
  
  // Submit the form
  await page.getByTestId('save-server-btn').click();
  
  // Verify the form is closed and the server appears in the list
  await expect(page.getByTestId('add-server-form-container')).not.toBeVisible();
  await expect(page.getByText('SSH Test Server')).toBeVisible();
});
