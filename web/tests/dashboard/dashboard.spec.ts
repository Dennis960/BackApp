/**
 * Dashboard Tests
 * 
 * Tests for the dashboard page showing statistics and recent runs
 */
import { expect, test } from '@playwright/test';
import * as path from 'path';
import type { Server as SSHServer } from 'ssh2';
import {
  resetDatabase,
  createServerViaApi,
  createStorageLocationViaApi,
  createNamingRuleViaApi,
  createBackupProfileViaApi,
  runBackupViaApi,
  waitForBackupRunComplete,
} from '../helpers/api-helpers';
import { cleanupTestDirectory, TEST_BASE_PATH } from '../helpers/fs-helpers';
import { goToDashboard } from '../helpers/ui-helpers';
import {
  startFakeSSHServerWithFiles,
  createVirtualFile,
  createVirtualDirectory,
  type VirtualFile,
} from '../helpers/fake-ssh-server';

test.describe('Dashboard', () => {
  let sshServer: SSHServer;
  const SSH_PORT = 2234;

  test.beforeAll(async () => {
    const virtualFiles = new Map<string, VirtualFile>();
    virtualFiles.set('/', createVirtualDirectory());
    virtualFiles.set('/backup', createVirtualDirectory());
    virtualFiles.set('/backup/test.sql', createVirtualFile('-- test data'));

    sshServer = await startFakeSSHServerWithFiles({
      port: SSH_PORT,
      username: 'root',
      password: 'testpass',
      virtualFiles,
    });
  });

  test.afterAll(async () => {
    if (sshServer) {
      sshServer.close();
    }
  });

  test.beforeEach(async ({ request }) => {
    cleanupTestDirectory();
    await resetDatabase(request);
  });

  test('should display dashboard stats', async ({ page }) => {
    await goToDashboard(page);
    await expect(page.getByText('Total Servers')).toBeVisible();
    // The stat cards should be visible
    await expect(page.getByRole('main').getByText('Backup Profiles')).toBeVisible();
  });

  test('should show server count', async ({ page, request }) => {
    await createServerViaApi(request, 'Server 1', 'host1', SSH_PORT, 'user1', 'pass1');
    await createServerViaApi(request, 'Server 2', 'host2', SSH_PORT, 'user2', 'pass2');

    await goToDashboard(page);

    // Look for the servers count card
    await expect(page.getByText('2').first()).toBeVisible();
  });

  test('should show profile count', async ({ page, request }) => {
    const serverId = await createServerViaApi(request, 'Server', 'localhost', SSH_PORT, 'root', 'testpass');
    const storagePath = path.join(TEST_BASE_PATH, 'backups');
    const storageLocationId = await createStorageLocationViaApi(request, 'Storage', storagePath);
    const namingRuleId = await createNamingRuleViaApi(request, 'Rule', '{profile}');

    await createBackupProfileViaApi(request, 'Profile 1', serverId, storageLocationId, namingRuleId, []);
    await createBackupProfileViaApi(request, 'Profile 2', serverId, storageLocationId, namingRuleId, []);
    await createBackupProfileViaApi(request, 'Profile 3', serverId, storageLocationId, namingRuleId, []);

    await goToDashboard(page);

    // The dashboard should show 3 profiles
    await expect(page.getByText('3')).toBeVisible();
  });

  test('should show recent backup runs', async ({ page, request }) => {
    const serverId = await createServerViaApi(request, 'Server', 'localhost', SSH_PORT, 'root', 'testpass');
    const storagePath = path.join(TEST_BASE_PATH, 'backups');
    const storageLocationId = await createStorageLocationViaApi(request, 'Storage', storagePath);
    const namingRuleId = await createNamingRuleViaApi(request, 'Rule', '{profile}-{TIMESTAMP}');

    const profileId = await createBackupProfileViaApi(
      request,
      'DashboardTest',
      serverId,
      storageLocationId,
      namingRuleId,
      [{ remote_path: '/backup/test.sql' }]
    );

    const runId = await runBackupViaApi(request, profileId);
    await waitForBackupRunComplete(request, runId);

    await goToDashboard(page);

    // Should show the recent run - look for "completed" status
    await expect(page.getByText(/completed/i)).toBeVisible();
  });

  test('should show sidebar navigation', async ({ page }) => {
    await goToDashboard(page);

    // Sidebar should have navigation links
    await expect(page.getByRole('link', { name: 'Servers' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Backup Profiles' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Backup Runs' })).toBeVisible();
  });

  test('should navigate to servers page', async ({ page }) => {
    await goToDashboard(page);
    await page.getByRole('link', { name: 'Servers' }).click();
    await expect(page.getByRole('heading', { name: 'Servers', level: 3 })).toBeVisible();
  });

  test('should navigate to backup profiles page', async ({ page, request }) => {
    // Create prerequisites so the page loads properly
    const storagePath = path.join(TEST_BASE_PATH, 'backups');
    await createStorageLocationViaApi(request, 'Storage', storagePath);
    await createNamingRuleViaApi(request, 'Rule', '{profile}');

    await goToDashboard(page);
    await page.getByRole('link', { name: 'Backup Profiles' }).click();
    await expect(page.getByRole('heading', { name: 'Backup Profiles', level: 3 })).toBeVisible();
  });

  test('should navigate to backup runs page', async ({ page }) => {
    await goToDashboard(page);
    await page.getByRole('link', { name: 'Backup Runs' }).click();
    await expect(page.getByRole('heading', { name: 'Backup Runs', level: 3 })).toBeVisible();
  });

  test('should navigate to storage locations page', async ({ page }) => {
    await goToDashboard(page);
    await page.getByRole('link', { name: 'Storage Locations' }).click();
    await expect(page.getByRole('heading', { name: 'Storage Locations', level: 3 })).toBeVisible();
  });

  test('should navigate to naming rules page', async ({ page }) => {
    await goToDashboard(page);
    await page.getByRole('link', { name: 'Naming Rules' }).click();
    await expect(page.getByRole('heading', { name: 'Naming Rules', level: 3 })).toBeVisible();
  });
});
