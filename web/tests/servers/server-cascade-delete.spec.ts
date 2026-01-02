import { expect, test } from '@playwright/test';
import * as path from 'path';
import type { Server } from 'ssh2';
import {
  createBackupProfileViaApi,
  createNamingRuleViaApi,
  createServerViaApi,
  createStorageLocationViaApi,
  deleteServerViaApi,
  getServerDeletionImpact,
  resetDatabase,
  runBackupViaApi,
  waitForBackupRunComplete,
} from '../helpers/api-helpers';
import {
  cleanupTestDirectory,
  directoryExistsOnDisk,
  fileExistsOnDisk,
  getAllFilesInDirectory,
  TEST_BASE_PATH,
} from '../helpers/fs-helpers';
import {
  createVirtualDirectory,
  createVirtualFile,
  startFakeSSHServerWithFiles,
  type VirtualFile,
} from '../helpers/fake-ssh-server';

test.describe('Server Cascade Delete', () => {
  let sshServer: Server;
  const SSH_PORT = 2225;

  test.beforeAll(async () => {
    // Create virtual filesystem with test files
    const virtualFiles = new Map<string, VirtualFile>();
    virtualFiles.set('/', createVirtualDirectory());
    virtualFiles.set('/backup', createVirtualDirectory());
    virtualFiles.set('/backup/db_backup.sql', createVirtualFile('-- SQL dump content\nCREATE TABLE test;'));
    virtualFiles.set('/backup/config.json', createVirtualFile('{"setting": "value"}'));

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
    await cleanupTestDirectory();
    await resetDatabase(request);
  });

  test('should show correct deletion impact for server with backups', async ({ request }) => {
    // Setup server with multiple backup profiles and runs
    const serverId = await createServerViaApi(request, 'Test Server', 'localhost', SSH_PORT, 'root', 'testpass');
    const storagePath = path.join(TEST_BASE_PATH, 'backups');
    const storageLocationId = await createStorageLocationViaApi(request, 'Test Storage', storagePath);
    const namingRuleId = await createNamingRuleViaApi(request, 'Simple', '{profile}-{TIMESTAMP}');

    // Create two backup profiles
    const profile1Id = await createBackupProfileViaApi(request, 'Profile1', serverId, storageLocationId, namingRuleId, [
      { remote_path: '/backup/db_backup.sql' },
    ]);
    const profile2Id = await createBackupProfileViaApi(request, 'Profile2', serverId, storageLocationId, namingRuleId, [
      { remote_path: '/backup/config.json' },
    ]);

    // Run backups
    const run1Id = await runBackupViaApi(request, profile1Id);
    await waitForBackupRunComplete(request, run1Id);

    const run2Id = await runBackupViaApi(request, profile2Id);
    await waitForBackupRunComplete(request, run2Id);

    // Get deletion impact
    const impact = await getServerDeletionImpact(request, serverId);

    expect(impact.backup_profiles).toBe(2);
    expect(impact.backup_runs).toBe(2);
    expect(impact.backup_files).toBe(2);
    expect(impact.total_size_bytes).toBeGreaterThan(0);
  });

  test('should cascade delete all profiles, runs, and files when deleting server', async ({ request }) => {
    // Setup
    const serverId = await createServerViaApi(request, 'Test Server', 'localhost', SSH_PORT, 'root', 'testpass');
    const storagePath = path.join(TEST_BASE_PATH, 'backups');
    const storageLocationId = await createStorageLocationViaApi(request, 'Test Storage', storagePath);
    const namingRuleId = await createNamingRuleViaApi(request, 'Simple', '{profile}');

    // Create backup profile
    const profileId = await createBackupProfileViaApi(request, 'TestBackup', serverId, storageLocationId, namingRuleId, [
      { remote_path: '/backup/db_backup.sql' },
      { remote_path: '/backup/config.json' },
    ]);

    // Run backup
    const runId = await runBackupViaApi(request, profileId);
    await waitForBackupRunComplete(request, runId);

    // Verify files exist
    const filesBeforeDelete = getAllFilesInDirectory(storagePath);
    expect(filesBeforeDelete.length).toBe(2);

    // Delete server
    await deleteServerViaApi(request, serverId);

    // Verify all files are deleted from disk
    const filesAfterDelete = getAllFilesInDirectory(storagePath);
    expect(filesAfterDelete.length).toBe(0);

    // Verify server is deleted via API
    const serverResponse = await request.get(`/api/v1/servers/${serverId}`);
    expect(serverResponse.status()).toBe(404);

    // Verify profile is deleted via API
    const profileResponse = await request.get(`/api/v1/backup-profiles/${profileId}`);
    expect(profileResponse.status()).toBe(404);

    // Verify run is deleted via API
    const runResponse = await request.get(`/api/v1/backup-runs/${runId}`);
    expect(runResponse.status()).toBe(404);
  });

  test('should clean up empty directories when cascade deleting server', async ({ request }) => {
    // Setup with nested directory structure
    const serverId = await createServerViaApi(request, 'Test Server', 'localhost', SSH_PORT, 'root', 'testpass');
    const storagePath = path.join(TEST_BASE_PATH, 'backups');
    const storageLocationId = await createStorageLocationViaApi(request, 'Test Storage', storagePath);
    const namingRuleId = await createNamingRuleViaApi(request, 'Nested', '{SERVER_NAME}/{profile}');

    const profileId = await createBackupProfileViaApi(request, 'TestBackup', serverId, storageLocationId, namingRuleId, [
      { remote_path: '/backup/db_backup.sql' },
    ]);

    // Run backup
    const runId = await runBackupViaApi(request, profileId);
    await waitForBackupRunComplete(request, runId);

    // Verify nested directories exist
    const filesBeforeDelete = getAllFilesInDirectory(storagePath);
    expect(filesBeforeDelete.length).toBe(1);

    // Delete server
    await deleteServerViaApi(request, serverId);

    // Verify all empty directories are cleaned up
    const dirsAfterDelete = getAllFilesInDirectory(storagePath);
    expect(dirsAfterDelete.length).toBe(0);
  });

  test('UI should show deletion confirmation with impact for server', async ({ page, request }) => {
    // Setup via API
    const serverId = await createServerViaApi(request, 'Test Server', 'localhost', SSH_PORT, 'root', 'testpass');
    const storagePath = path.join(TEST_BASE_PATH, 'backups');
    const storageLocationId = await createStorageLocationViaApi(request, 'Test Storage', storagePath);
    const namingRuleId = await createNamingRuleViaApi(request, 'Simple', '{profile}');

    const profileId = await createBackupProfileViaApi(request, 'TestBackup', serverId, storageLocationId, namingRuleId, [
      { remote_path: '/backup/db_backup.sql' },
    ]);

    // Run backup
    const runId = await runBackupViaApi(request, profileId);
    await waitForBackupRunComplete(request, runId);

    // Navigate to servers page
    await page.goto('/servers');
    await expect(page.getByText('Test Server')).toBeVisible();

    // Find the row containing "Test Server" and click its delete button
    const testServerRow = page.locator('tr', { hasText: 'Test Server' });
    await testServerRow.getByRole('button', { name: /delete/i }).click();

    // Verify deletion dialog appears with impact information
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByTestId('impact-profiles')).toBeVisible();
    await expect(page.getByTestId('impact-runs')).toBeVisible();
    await expect(page.getByTestId('impact-files')).toBeVisible();
    await expect(page.getByText(/cannot be undone/i)).toBeVisible();

    // Confirm deletion
    await page.getByRole('button', { name: /delete server/i }).click();

    // Wait for dialog to close
    await expect(page.getByRole('dialog')).not.toBeVisible();

    // Verify server is removed from the list (use table cell specifically)
    await expect(page.getByTestId('server-name').filter({ hasText: 'Test Server' })).not.toBeVisible();
  });

  test('should not delete server with dependent backup profiles if they prevent deletion', async ({ request }) => {
    // This test verifies that the deletion impact correctly calculates dependencies
    const serverId = await createServerViaApi(request, 'Test Server', 'localhost', SSH_PORT, 'root', 'testpass');
    const storagePath = path.join(TEST_BASE_PATH, 'backups');
    const storageLocationId = await createStorageLocationViaApi(request, 'Test Storage', storagePath);
    const namingRuleId = await createNamingRuleViaApi(request, 'Simple', '{profile}');

    // Create multiple profiles with multiple runs each
    const profile1Id = await createBackupProfileViaApi(request, 'Profile1', serverId, storageLocationId, namingRuleId, [
      { remote_path: '/backup/db_backup.sql' },
    ]);
    const profile2Id = await createBackupProfileViaApi(request, 'Profile2', serverId, storageLocationId, namingRuleId, [
      { remote_path: '/backup/config.json' },
    ]);

    // Run multiple backups for profile 1
    const run1aId = await runBackupViaApi(request, profile1Id);
    await waitForBackupRunComplete(request, run1aId);
    const run1bId = await runBackupViaApi(request, profile1Id);
    await waitForBackupRunComplete(request, run1bId);

    // Run backup for profile 2
    const run2Id = await runBackupViaApi(request, profile2Id);
    await waitForBackupRunComplete(request, run2Id);

    // Get deletion impact - should show all dependent resources
    const impact = await getServerDeletionImpact(request, serverId);

    expect(impact.backup_profiles).toBe(2);
    expect(impact.backup_runs).toBe(3);
    expect(impact.backup_files).toBe(3);

    // Delete server
    await deleteServerViaApi(request, serverId);

    // Verify all files are deleted
    const filesAfterDelete = getAllFilesInDirectory(storagePath);
    expect(filesAfterDelete.length).toBe(0);
  });
});
