import { expect, test } from '@playwright/test';
import * as path from 'path';
import type { Server } from 'ssh2';
import {
  createBackupProfileViaApi,
  createNamingRuleViaApi,
  createServerViaApi,
  createStorageLocationViaApi,
  deleteBackupFileViaApi,
  deleteBackupRunViaApi,
  getBackupRunDeletionImpact,
  getBackupRunFilesViaApi,
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

test.describe('Backup Deletion', () => {
  let sshServer: Server;
  const SSH_PORT = 2224;

  test.beforeAll(async () => {
    // Create virtual filesystem with test files
    const virtualFiles = new Map<string, VirtualFile>();
    virtualFiles.set('/', createVirtualDirectory());
    virtualFiles.set('/backup', createVirtualDirectory());
    virtualFiles.set('/backup/db_backup.sql', createVirtualFile('-- SQL dump content\nCREATE TABLE test;'));
    virtualFiles.set('/backup/config.json', createVirtualFile('{"setting": "value"}'));
    virtualFiles.set('/backup/data.csv', createVirtualFile('id,name\n1,test'));

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

  test.describe('Backup Run Deletion', () => {
    test('should show deletion impact for backup run', async ({ request }) => {
      // Setup
      const serverId = await createServerViaApi(request, 'Test Server', 'localhost', SSH_PORT, 'root', 'testpass');
      const storagePath = path.join(TEST_BASE_PATH, 'backups');
      const storageLocationId = await createStorageLocationViaApi(request, 'Test Storage', storagePath);
      const namingRuleId = await createNamingRuleViaApi(request, 'Simple', '{profile}');
      const profileId = await createBackupProfileViaApi(request, 'TestBackup', serverId, storageLocationId, namingRuleId, [
        { remote_path: '/backup/db_backup.sql' },
        { remote_path: '/backup/config.json' },
      ]);

      // Run backup
      const runId = await runBackupViaApi(request, profileId);
      await waitForBackupRunComplete(request, runId);

      // Get deletion impact
      const impact = await getBackupRunDeletionImpact(request, runId);

      expect(impact.backup_runs).toBe(1);
      expect(impact.backup_files).toBe(2);
      expect(impact.total_size_bytes).toBeGreaterThan(0);
    });

    test('should delete files from disk when deleting backup run', async ({ request }) => {
      // Setup
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

      // Verify files exist
      const filesBeforeDelete = getAllFilesInDirectory(storagePath);
      expect(filesBeforeDelete.length).toBe(1);
      const filePath = filesBeforeDelete[0];
      expect(fileExistsOnDisk(filePath)).toBe(true);

      // Delete backup run
      await deleteBackupRunViaApi(request, runId);

      // Verify files are deleted from disk
      expect(fileExistsOnDisk(filePath)).toBe(false);
    });

    test('should clean up empty directories after deleting backup run', async ({ request }) => {
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

      // Verify directory structure exists
      const filesBeforeDelete = getAllFilesInDirectory(storagePath);
      expect(filesBeforeDelete.length).toBe(1);

      // Delete backup run
      await deleteBackupRunViaApi(request, runId);

      // Verify empty directories are cleaned up
      // The TestBackup folder and Test Server folder should be removed
      const dirsAfterDelete = getAllFilesInDirectory(storagePath);
      expect(dirsAfterDelete.length).toBe(0);
    });
  });

  test.describe('Individual File Deletion', () => {
    test('should mark file as deleted and remove from disk', async ({ request }) => {
      // Setup
      const serverId = await createServerViaApi(request, 'Test Server', 'localhost', SSH_PORT, 'root', 'testpass');
      const storagePath = path.join(TEST_BASE_PATH, 'backups');
      const storageLocationId = await createStorageLocationViaApi(request, 'Test Storage', storagePath);
      const namingRuleId = await createNamingRuleViaApi(request, 'Simple', '{profile}');
      const profileId = await createBackupProfileViaApi(request, 'TestBackup', serverId, storageLocationId, namingRuleId, [
        { remote_path: '/backup/db_backup.sql' },
        { remote_path: '/backup/config.json' },
      ]);

      // Run backup
      const runId = await runBackupViaApi(request, profileId);
      await waitForBackupRunComplete(request, runId);

      // Get files
      const files = await getBackupRunFilesViaApi(request, runId);
      expect(files.length).toBe(2);
      
      const fileToDelete = files[0];
      expect(fileToDelete.deleted).toBe(false);
      expect(fileExistsOnDisk(fileToDelete.local_path)).toBe(true);

      // Delete individual file
      await deleteBackupFileViaApi(request, fileToDelete.id);

      // Verify file is marked as deleted
      const filesAfterDelete = await getBackupRunFilesViaApi(request, runId);
      const deletedFile = filesAfterDelete.find((f) => f.id === fileToDelete.id);
      expect(deletedFile).toBeDefined();
      expect(deletedFile!.deleted).toBe(true);

      // Verify file is removed from disk
      expect(fileExistsOnDisk(fileToDelete.local_path)).toBe(false);

      // Verify other file still exists
      const otherFile = files[1];
      expect(fileExistsOnDisk(otherFile.local_path)).toBe(true);
    });

    test('should clean up empty parent directories after deleting individual file', async ({ request }) => {
      // Setup
      const serverId = await createServerViaApi(request, 'Test Server', 'localhost', SSH_PORT, 'root', 'testpass');
      const storagePath = path.join(TEST_BASE_PATH, 'backups');
      const storageLocationId = await createStorageLocationViaApi(request, 'Test Storage', storagePath);
      const namingRuleId = await createNamingRuleViaApi(request, 'Nested', '{SERVER_NAME}/{profile}');
      const profileId = await createBackupProfileViaApi(request, 'TestBackup', serverId, storageLocationId, namingRuleId, [
        { remote_path: '/backup/db_backup.sql' },
      ]);

      // Run backup (creates single file in nested directory)
      const runId = await runBackupViaApi(request, profileId);
      await waitForBackupRunComplete(request, runId);

      // Get file
      const files = await getBackupRunFilesViaApi(request, runId);
      expect(files.length).toBe(1);
      
      const fileToDelete = files[0];
      const fileDir = path.dirname(fileToDelete.local_path);

      // Verify directory exists
      expect(directoryExistsOnDisk(fileDir)).toBe(true);

      // Delete the file
      await deleteBackupFileViaApi(request, fileToDelete.id);

      // Verify empty parent directories are cleaned up
      expect(directoryExistsOnDisk(fileDir)).toBe(false);
    });
  });
});
