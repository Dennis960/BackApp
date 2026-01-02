import { expect, test } from '@playwright/test';
import * as path from 'path';
import type { Server } from 'ssh2';
import {
  createBackupProfileViaApi,
  createNamingRuleViaApi,
  createServerViaApi,
  createStorageLocationViaApi,
  getStorageLocationMoveImpact,
  resetDatabase,
  runBackupViaApi,
  updateStorageLocationViaApi,
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

test.describe('Storage Location Move', () => {
  let sshServer: Server;
  const SSH_PORT = 2223;

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

  test('should show move impact when changing storage location path', async ({ request }) => {
    // Setup: Create server, storage location, naming rule, and backup profile
    const serverId = await createServerViaApi(request, 'Test Server', 'localhost', SSH_PORT, 'root', 'testpass');
    const originalPath = path.join(TEST_BASE_PATH, 'original');
    const storageLocationId = await createStorageLocationViaApi(request, 'Test Storage', originalPath);
    const namingRuleId = await createNamingRuleViaApi(request, 'Simple', '{profile}');
    const profileId = await createBackupProfileViaApi(request, 'TestBackup', serverId, storageLocationId, namingRuleId, [
      { remote_path: '/backup/db_backup.sql' },
    ]);

    // Run a backup to create files
    const runId = await runBackupViaApi(request, profileId);
    const run = await waitForBackupRunComplete(request, runId);
    expect(run.status).toBe('completed');
    expect(run.total_files).toBe(1);

    // Check the move impact
    const newPath = path.join(TEST_BASE_PATH, 'moved');
    const impact = await getStorageLocationMoveImpact(request, storageLocationId, newPath);

    expect(impact.backup_profiles).toBe(1);
    expect(impact.backup_runs).toBe(1);
    expect(impact.backup_files).toBe(1);
    expect(impact.files_to_move.length).toBe(1);
    expect(impact.files_to_move[0]).toContain('db_backup.sql');
  });

  test('should move files when updating storage location path', async ({ request }) => {
    // Setup
    const serverId = await createServerViaApi(request, 'Test Server', 'localhost', SSH_PORT, 'root', 'testpass');
    const originalPath = path.join(TEST_BASE_PATH, 'original');
    const storageLocationId = await createStorageLocationViaApi(request, 'Test Storage', originalPath);
    const namingRuleId = await createNamingRuleViaApi(request, 'Simple', '{profile}');
    const profileId = await createBackupProfileViaApi(request, 'TestBackup', serverId, storageLocationId, namingRuleId, [
      { remote_path: '/backup/db_backup.sql' },
    ]);

    // Run backup
    const runId = await runBackupViaApi(request, profileId);
    await waitForBackupRunComplete(request, runId);

    // Verify original files exist
    const originalFiles = getAllFilesInDirectory(originalPath);
    expect(originalFiles.length).toBe(1);
    const originalFilePath = originalFiles[0];
    expect(fileExistsOnDisk(originalFilePath)).toBe(true);

    // Move to new path
    const newPath = path.join(TEST_BASE_PATH, 'moved');
    await updateStorageLocationViaApi(request, storageLocationId, { base_path: newPath });

    // Verify files moved
    expect(fileExistsOnDisk(originalFilePath)).toBe(false);
    const newFiles = getAllFilesInDirectory(newPath);
    expect(newFiles.length).toBe(1);
    expect(newFiles[0]).toContain('db_backup.sql');
  });

  test('should clean up empty parent directories after moving files', async ({ request }) => {
    // Setup with nested path
    const serverId = await createServerViaApi(request, 'Test Server', 'localhost', SSH_PORT, 'root', 'testpass');
    const originalPath = path.join(TEST_BASE_PATH, 'deep', 'nested', 'original');
    const storageLocationId = await createStorageLocationViaApi(request, 'Nested Storage', originalPath);
    const namingRuleId = await createNamingRuleViaApi(request, 'Simple', '{profile}');
    const profileId = await createBackupProfileViaApi(request, 'TestBackup', serverId, storageLocationId, namingRuleId, [
      { remote_path: '/backup/db_backup.sql' },
    ]);

    // Run backup
    const runId = await runBackupViaApi(request, profileId);
    await waitForBackupRunComplete(request, runId);

    // Verify nested directories exist
    expect(directoryExistsOnDisk(path.join(TEST_BASE_PATH, 'deep', 'nested', 'original'))).toBe(true);

    // Move to a completely different path
    const newPath = path.join(TEST_BASE_PATH, 'new-location');
    await updateStorageLocationViaApi(request, storageLocationId, { base_path: newPath });

    // Verify old empty directories are cleaned up
    expect(directoryExistsOnDisk(path.join(TEST_BASE_PATH, 'deep', 'nested', 'original'))).toBe(false);
    expect(directoryExistsOnDisk(path.join(TEST_BASE_PATH, 'deep', 'nested'))).toBe(false);
    expect(directoryExistsOnDisk(path.join(TEST_BASE_PATH, 'deep'))).toBe(false);

    // Verify new location has files
    expect(directoryExistsOnDisk(newPath)).toBe(true);
    const newFiles = getAllFilesInDirectory(newPath);
    expect(newFiles.length).toBe(1);
  });

  test('UI should show move confirmation dialog with impact details', async ({ page, request }) => {
    // Setup via API
    const serverId = await createServerViaApi(request, 'Test Server', 'localhost', SSH_PORT, 'root', 'testpass');
    const originalPath = path.join(TEST_BASE_PATH, 'original');
    const storageLocationId = await createStorageLocationViaApi(request, 'Test Storage', originalPath);
    const namingRuleId = await createNamingRuleViaApi(request, 'Simple', '{profile}');
    const profileId = await createBackupProfileViaApi(request, 'TestBackup', serverId, storageLocationId, namingRuleId, [
      { remote_path: '/backup/db_backup.sql' },
    ]);

    // Run backup
    const runId = await runBackupViaApi(request, profileId);
    await waitForBackupRunComplete(request, runId);

    // Navigate to storage locations page
    await page.goto('/storage-locations');
    await expect(page.getByText('Test Storage')).toBeVisible();

    // Click edit button for our specific storage location
    // Find the row containing "Test Storage" and click its edit button
    const testStorageRow = page.locator('tr', { hasText: 'Test Storage' });
    await testStorageRow.getByRole('button', { name: /edit/i }).click();

    // Wait for the dialog to open
    await expect(page.getByRole('dialog')).toBeVisible();

    // Change the path using the text field (label "Base Path")
    const newPath = path.join(TEST_BASE_PATH, 'moved');
    const pathField = page.getByLabel('Base Path');
    await pathField.clear();
    await pathField.fill(newPath);

    // Submit the form
    await page.getByRole('button', { name: /update location/i }).click();

    // Verify the move dialog appears with impact information
    await expect(page.getByText(/move storage location files/i)).toBeVisible();
    await expect(page.getByText(/this action will affect/i)).toBeVisible();
    await expect(page.getByTestId('impact-files')).toBeVisible();
    await expect(page.getByText(/empty parent directories.*will be.*deleted/i)).toBeVisible();

    // Confirm the move
    await page.getByRole('button', { name: /move files/i }).click();

    // Verify success message
    await expect(page.getByText(/updated.*successfully/i)).toBeVisible();
  });
});
