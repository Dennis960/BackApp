import { test, expect } from '@playwright/test';

test('homepage displays Dashboard', async ({ page }) => {
  await page.goto('/');
  
  // Check if "Dashboard" text appears in the sidebar navigation
  await expect(page.getByRole('link', { name: 'Dashboard' })).toBeVisible();
});
