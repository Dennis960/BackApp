/**
 * Storage Location CRUD Tests
 * 
 * Tests for storage location management: create, read, update, delete
 */
import { expect, test } from '@playwright/test';
import * as path from 'path';
import {
  resetDatabase,
  createStorageLocationViaApi,
  updateStorageLocationViaApi,
  deleteStorageLocationViaApi,
  getStorageLocationDeletionImpact,
} from '../helpers/api-helpers';
import { cleanupTestDirectory, TEST_BASE_PATH, directoryExistsOnDisk } from '../helpers/fs-helpers';
import { createStorageLocationViaUI } from '../helpers/ui-helpers';

test.describe('Storage Location CRUD Operations', () => {
  test.beforeEach(async ({ request }) => {
    cleanupTestDirectory();
    await resetDatabase(request);
  });

  test.describe('API Tests', () => {
    test('should create storage location', async ({ request }) => {
      const basePath = path.join(TEST_BASE_PATH, 'storage1');
      const locationId = await createStorageLocationViaApi(request, 'Test Storage', basePath);

      expect(locationId).toBeGreaterThan(0);

      // Verify storage location exists
      const response = await request.get('/api/v1/storage-locations');
      expect(response.ok()).toBeTruthy();
      const locations = await response.json();
      const location = locations.find((l: any) => l.id === locationId);
      expect(location.name).toBe('Test Storage');
      expect(location.base_path).toBe(basePath);
    });

    test('should list all storage locations', async ({ request }) => {
      const basePath1 = path.join(TEST_BASE_PATH, 'storage1');
      const basePath2 = path.join(TEST_BASE_PATH, 'storage2');
      await createStorageLocationViaApi(request, 'Storage 1', basePath1);
      await createStorageLocationViaApi(request, 'Storage 2', basePath2);

      const response = await request.get('/api/v1/storage-locations');
      expect(response.ok()).toBeTruthy();
      const locations = await response.json();
      // Default storage locations are created on database reset, so there will be more than 2
      expect(locations.length).toBeGreaterThanOrEqual(2);
      expect(locations.map((l: any) => l.name)).toContain('Storage 1');
      expect(locations.map((l: any) => l.name)).toContain('Storage 2');
    });

    test('should update storage location name', async ({ request }) => {
      const basePath = path.join(TEST_BASE_PATH, 'storage');
      const locationId = await createStorageLocationViaApi(request, 'Original Name', basePath);

      await updateStorageLocationViaApi(request, locationId, {
        name: 'Updated Name',
        base_path: basePath,
      });

      const response = await request.get('/api/v1/storage-locations');
      const locations = await response.json();
      const location = locations.find((l: any) => l.id === locationId);
      expect(location.name).toBe('Updated Name');
    });

    test('should delete storage location', async ({ request }) => {
      const basePath = path.join(TEST_BASE_PATH, 'to-delete');
      const locationId = await createStorageLocationViaApi(request, 'To Delete', basePath);

      await deleteStorageLocationViaApi(request, locationId);

      const response = await request.get('/api/v1/storage-locations');
      const locations = await response.json();
      const location = locations.find((l: any) => l.id === locationId);
      expect(location).toBeUndefined();
    });

    test('should return zero deletion impact for empty storage', async ({ request }) => {
      const basePath = path.join(TEST_BASE_PATH, 'empty-storage');
      const locationId = await createStorageLocationViaApi(request, 'Empty Storage', basePath);

      const impact = await getStorageLocationDeletionImpact(request, locationId);

      expect(impact.backup_profiles).toBe(0);
      expect(impact.backup_runs).toBe(0);
      expect(impact.backup_files).toBe(0);
      expect(impact.total_size_bytes).toBe(0);
    });
  });

  test.describe('UI Tests', () => {
    test('should create storage location via UI', async ({ page }) => {
      const basePath = path.join(TEST_BASE_PATH, 'ui-storage');

      await createStorageLocationViaUI(page, 'UI Storage', basePath);

      // Verify storage location appears in list
      await expect(page.getByText('UI Storage')).toBeVisible();
    });

    test('should show storage location list', async ({ page, request }) => {
      const basePath1 = path.join(TEST_BASE_PATH, 'storage-a');
      const basePath2 = path.join(TEST_BASE_PATH, 'storage-b');
      await createStorageLocationViaApi(request, 'Storage A', basePath1);
      await createStorageLocationViaApi(request, 'Storage B', basePath2);

      await page.goto('/storage-locations');

      await expect(page.getByText('Storage A')).toBeVisible();
      await expect(page.getByText('Storage B')).toBeVisible();
    });

    test('should edit storage location via UI', async ({ page, request }) => {
      const basePath = path.join(TEST_BASE_PATH, 'edit-storage');
      const locationId = await createStorageLocationViaApi(request, 'Original Storage', basePath);

      await page.goto('/storage-locations');

      // Click edit button on the correct row
      await page.locator('tr', { hasText: 'Original Storage' }).getByRole('button', { name: /edit/i }).click();

      // Wait for dialog
      await expect(page.getByTestId('storage-form-dialog')).toBeVisible();

      // Update name
      await page.getByTestId('input-name').locator('input').fill('Updated Storage');
      await page.getByTestId('save-storage-btn').click();

      // Verify update
      await expect(page.getByTestId('storage-form-dialog')).not.toBeVisible();
      await expect(page.getByText('Updated Storage')).toBeVisible();
    });

    test('should delete storage location via UI', async ({ page, request }) => {
      const basePath = path.join(TEST_BASE_PATH, 'delete-storage');
      await createStorageLocationViaApi(request, 'Delete Me', basePath);

      await page.goto('/storage-locations');
      await expect(page.getByText('Delete Me')).toBeVisible();

      // Click delete button
      await page.locator('tr', { hasText: 'Delete Me' }).getByRole('button', { name: /delete/i }).click();

      // Confirm deletion
      await expect(page.getByRole('dialog')).toBeVisible();
      await page.getByRole('button', { name: /delete/i }).click();

      // Verify deletion
      await expect(page.getByRole('dialog')).not.toBeVisible();
      await expect(page.getByText('Delete Me')).not.toBeVisible();
    });
  });
});
