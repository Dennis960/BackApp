/**
 * Backup File Tests
 * 
 * Tests for backup file operations: view, download, delete
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
  getBackupRunFilesViaApi,
  deleteBackupFileViaApi,
} from '../helpers/api-helpers';
import {
  cleanupTestDirectory,
  TEST_BASE_PATH,
  fileExistsOnDisk,
} from '../helpers/fs-helpers';
import {
  startFakeSSHServerWithFiles,
  createVirtualFile,
  createVirtualDirectory,
  type VirtualFile,
} from '../helpers/fake-ssh-server';

test.describe('Backup File Operations', () => {
  let sshServer: SSHServer;
  const SSH_PORT = 2233;

  test.beforeAll(async () => {
    const virtualFiles = new Map<string, VirtualFile>();
    virtualFiles.set('/', createVirtualDirectory());
    virtualFiles.set('/backup', createVirtualDirectory());
    virtualFiles.set('/backup/data.sql', createVirtualFile('-- SQL backup data\nINSERT INTO users VALUES (1);'));
    virtualFiles.set('/backup/config.yaml', createVirtualFile('server:\n  port: 8080\n  host: localhost'));

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

  test.describe('Get Backup File', () => {
    test('should get backup file details', async ({ request }) => {
      const serverId = await createServerViaApi(request, 'Server', 'localhost', SSH_PORT, 'root', 'testpass');
      const storagePath = path.join(TEST_BASE_PATH, 'backups');
      const storageLocationId = await createStorageLocationViaApi(request, 'Storage', storagePath);
      const namingRuleId = await createNamingRuleViaApi(request, 'Rule', '{profile}');

      const profileId = await createBackupProfileViaApi(
        request,
        'TestProfile',
        serverId,
        storageLocationId,
        namingRuleId,
        [{ remote_path: '/backup/data.sql' }]
      );

      const runId = await runBackupViaApi(request, profileId);
      await waitForBackupRunComplete(request, runId);

      const files = await getBackupRunFilesViaApi(request, runId);
      expect(files.length).toBe(1);

      const fileResponse = await request.get(`/api/v1/backup-files/${files[0].id}`);
      expect(fileResponse.ok()).toBeTruthy();
      const file = await fileResponse.json();

      expect(file.id).toBe(files[0].id);
      expect(file.backup_run_id).toBe(runId);
      expect(file.local_path).toContain('data.sql');
      expect(file.size_bytes).toBeGreaterThan(0);
    });
  });

  test.describe('Download Backup File', () => {
    test('should download backup file', async ({ request }) => {
      const serverId = await createServerViaApi(request, 'Server', 'localhost', SSH_PORT, 'root', 'testpass');
      const storagePath = path.join(TEST_BASE_PATH, 'backups');
      const storageLocationId = await createStorageLocationViaApi(request, 'Storage', storagePath);
      const namingRuleId = await createNamingRuleViaApi(request, 'Rule', '{profile}');

      const profileId = await createBackupProfileViaApi(
        request,
        'TestProfile',
        serverId,
        storageLocationId,
        namingRuleId,
        [{ remote_path: '/backup/data.sql' }]
      );

      const runId = await runBackupViaApi(request, profileId);
      await waitForBackupRunComplete(request, runId);

      const files = await getBackupRunFilesViaApi(request, runId);
      const fileId = files[0].id;

      const downloadResponse = await request.get(`/api/v1/backup-files/${fileId}/download`);
      expect(downloadResponse.ok()).toBeTruthy();

      const content = await downloadResponse.text();
      expect(content).toContain('SQL backup data');
      expect(content).toContain('INSERT INTO users');
    });

    test('should return 404 for non-existent file download', async ({ request }) => {
      const response = await request.get('/api/v1/backup-files/99999/download');
      expect(response.status()).toBe(404);
    });
  });

  test.describe('Delete Backup File', () => {
    test('should delete backup file from database and disk', async ({ request }) => {
      const serverId = await createServerViaApi(request, 'Server', 'localhost', SSH_PORT, 'root', 'testpass');
      const storagePath = path.join(TEST_BASE_PATH, 'backups');
      const storageLocationId = await createStorageLocationViaApi(request, 'Storage', storagePath);
      const namingRuleId = await createNamingRuleViaApi(request, 'Rule', '{profile}');

      const profileId = await createBackupProfileViaApi(
        request,
        'TestProfile',
        serverId,
        storageLocationId,
        namingRuleId,
        [{ remote_path: '/backup/data.sql' }]
      );

      const runId = await runBackupViaApi(request, profileId);
      await waitForBackupRunComplete(request, runId);

      const files = await getBackupRunFilesViaApi(request, runId);
      const file = files[0];
      expect(fileExistsOnDisk(file.local_path)).toBe(true);

      await deleteBackupFileViaApi(request, file.id);

      // File should be marked as deleted in database
      const filesAfter = await getBackupRunFilesViaApi(request, runId);
      const deletedFile = filesAfter.find((f: any) => f.id === file.id);
      expect(deletedFile).toBeDefined();
      expect(deletedFile?.deleted).toBe(true);

      // File should be removed from disk
      expect(fileExistsOnDisk(file.local_path)).toBe(false);
    });

    test('should delete only the specified file, leaving others intact', async ({ request }) => {
      const serverId = await createServerViaApi(request, 'Server', 'localhost', SSH_PORT, 'root', 'testpass');
      const storagePath = path.join(TEST_BASE_PATH, 'backups');
      const storageLocationId = await createStorageLocationViaApi(request, 'Storage', storagePath);
      const namingRuleId = await createNamingRuleViaApi(request, 'Rule', '{profile}');

      const profileId = await createBackupProfileViaApi(
        request,
        'TestProfile',
        serverId,
        storageLocationId,
        namingRuleId,
        [{ remote_path: '/backup/data.sql' }, { remote_path: '/backup/config.yaml' }]
      );

      const runId = await runBackupViaApi(request, profileId);
      await waitForBackupRunComplete(request, runId);

      const files = await getBackupRunFilesViaApi(request, runId);
      expect(files.length).toBe(2);

      // Delete only the first file
      const fileToDelete = files[0];
      const fileToKeep = files[1];

      await deleteBackupFileViaApi(request, fileToDelete.id);

      // Deleted file should be gone from disk
      expect(fileExistsOnDisk(fileToDelete.local_path)).toBe(false);

      // Kept file should still exist
      expect(fileExistsOnDisk(fileToKeep.local_path)).toBe(true);
    });
  });

  test.describe('UI File Operations', () => {
    test('should display backup files in run detail', async ({ page, request }) => {
      const serverId = await createServerViaApi(request, 'Server', 'localhost', SSH_PORT, 'root', 'testpass');
      const storagePath = path.join(TEST_BASE_PATH, 'backups');
      const storageLocationId = await createStorageLocationViaApi(request, 'Storage', storagePath);
      const namingRuleId = await createNamingRuleViaApi(request, 'Rule', '{profile}');

      const profileId = await createBackupProfileViaApi(
        request,
        'TestProfile',
        serverId,
        storageLocationId,
        namingRuleId,
        [{ remote_path: '/backup/data.sql' }]
      );

      const runId = await runBackupViaApi(request, profileId);
      await waitForBackupRunComplete(request, runId);

      await page.goto(`/backup-runs/${runId}`);

      // Should show the backup file in the files table (look in table rows, not log messages)
      await expect(page.locator('table').getByText('data.sql')).toBeVisible();
    });

    test('should show download button for backup files', async ({ page, request }) => {
      const serverId = await createServerViaApi(request, 'Server', 'localhost', SSH_PORT, 'root', 'testpass');
      const storagePath = path.join(TEST_BASE_PATH, 'backups');
      const storageLocationId = await createStorageLocationViaApi(request, 'Storage', storagePath);
      const namingRuleId = await createNamingRuleViaApi(request, 'Rule', '{profile}');

      const profileId = await createBackupProfileViaApi(
        request,
        'TestProfile',
        serverId,
        storageLocationId,
        namingRuleId,
        [{ remote_path: '/backup/data.sql' }]
      );

      const runId = await runBackupViaApi(request, profileId);
      await waitForBackupRunComplete(request, runId);

      await page.goto(`/backup-runs/${runId}`);

      // Should have a download button
      await expect(page.getByRole('button', { name: /download/i }).or(page.locator('[aria-label*="download" i]'))).toBeVisible();
    });
  });
});
