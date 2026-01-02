import { expect, test } from '@playwright/test';
import * as path from 'path';
import type { Server } from 'ssh2';
import {
  createBackupProfileViaApi,
  createNamingRuleViaApi,
  createServerViaApi,
  createStorageLocationViaApi,
  getBackupRunDeletionImpact,
  getServerDeletionImpact,
  getStorageLocationMoveImpact,
  resetDatabase,
  runBackupViaApi,
  waitForBackupRunComplete,
} from '../helpers/api-helpers';
import { cleanupTestDirectory, TEST_BASE_PATH } from '../helpers/fs-helpers';
import {
  createVirtualDirectory,
  createVirtualFile,
  startFakeSSHServerWithFiles,
  type VirtualFile,
} from '../helpers/fake-ssh-server';

test.describe('Deletion Impact API', () => {
  let sshServer: Server;
  const SSH_PORT = 2226;

  test.beforeAll(async () => {
    // Create virtual filesystem with test files of varying sizes
    const virtualFiles = new Map<string, VirtualFile>();
    virtualFiles.set('/', createVirtualDirectory());
    virtualFiles.set('/backup', createVirtualDirectory());
    virtualFiles.set('/backup/small.txt', createVirtualFile('small content'));
    virtualFiles.set('/backup/medium.txt', createVirtualFile('x'.repeat(1000)));
    virtualFiles.set('/backup/large.txt', createVirtualFile('y'.repeat(10000)));

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

  test.describe('Server Deletion Impact', () => {
    test('should return zero counts for server with no backups', async ({ request }) => {
      const serverId = await createServerViaApi(request, 'Empty Server', 'localhost', SSH_PORT, 'root', 'testpass');

      const impact = await getServerDeletionImpact(request, serverId);

      expect(impact.backup_profiles).toBe(0);
      expect(impact.backup_runs).toBe(0);
      expect(impact.backup_files).toBe(0);
      expect(impact.total_size_bytes).toBe(0);
    });

    test('should return correct counts for server with profile but no runs', async ({ request }) => {
      const serverId = await createServerViaApi(request, 'Test Server', 'localhost', SSH_PORT, 'root', 'testpass');
      const storagePath = path.join(TEST_BASE_PATH, 'backups');
      const storageLocationId = await createStorageLocationViaApi(request, 'Test Storage', storagePath);
      const namingRuleId = await createNamingRuleViaApi(request, 'Simple', '{profile}');

      await createBackupProfileViaApi(request, 'TestProfile', serverId, storageLocationId, namingRuleId, [
        { remote_path: '/backup/small.txt' },
      ]);

      const impact = await getServerDeletionImpact(request, serverId);

      expect(impact.backup_profiles).toBe(1);
      expect(impact.backup_runs).toBe(0);
      expect(impact.backup_files).toBe(0);
      expect(impact.total_size_bytes).toBe(0);
    });

    test('should correctly sum file sizes across multiple profiles and runs', async ({ request }) => {
      const serverId = await createServerViaApi(request, 'Test Server', 'localhost', SSH_PORT, 'root', 'testpass');
      const storagePath = path.join(TEST_BASE_PATH, 'backups');
      const storageLocationId = await createStorageLocationViaApi(request, 'Test Storage', storagePath);
      const namingRuleId = await createNamingRuleViaApi(request, 'Timestamped', '{profile}-{TIMESTAMP}');

      // Create profile with multiple files
      const profileId = await createBackupProfileViaApi(request, 'MultiFile', serverId, storageLocationId, namingRuleId, [
        { remote_path: '/backup/small.txt' },
        { remote_path: '/backup/medium.txt' },
      ]);

      // Run backup twice
      const run1Id = await runBackupViaApi(request, profileId);
      await waitForBackupRunComplete(request, run1Id);

      const run2Id = await runBackupViaApi(request, profileId);
      await waitForBackupRunComplete(request, run2Id);

      const impact = await getServerDeletionImpact(request, serverId);

      expect(impact.backup_profiles).toBe(1);
      expect(impact.backup_runs).toBe(2);
      expect(impact.backup_files).toBe(4); // 2 files * 2 runs
      // small.txt is ~13 bytes, medium.txt is 1000 bytes, total per run ~1013, times 2 runs
      expect(impact.total_size_bytes).toBeGreaterThan(2000);
    });

    test('should include file paths in response', async ({ request }) => {
      const serverId = await createServerViaApi(request, 'Test Server', 'localhost', SSH_PORT, 'root', 'testpass');
      const storagePath = path.join(TEST_BASE_PATH, 'backups');
      const storageLocationId = await createStorageLocationViaApi(request, 'Test Storage', storagePath);
      const namingRuleId = await createNamingRuleViaApi(request, 'Simple', '{profile}');

      const profileId = await createBackupProfileViaApi(request, 'TestBackup', serverId, storageLocationId, namingRuleId, [
        { remote_path: '/backup/small.txt' },
      ]);

      const runId = await runBackupViaApi(request, profileId);
      await waitForBackupRunComplete(request, runId);

      const response = await request.get(`/api/v1/servers/${serverId}/deletion-impact`);
      const impact = await response.json();

      expect(impact.file_paths).toBeDefined();
      expect(impact.file_paths.length).toBe(1);
      expect(impact.file_paths[0]).toContain('small.txt');
    });
  });

  test.describe('Backup Run Deletion Impact', () => {
    test('should return correct counts for single run', async ({ request }) => {
      const serverId = await createServerViaApi(request, 'Test Server', 'localhost', SSH_PORT, 'root', 'testpass');
      const storagePath = path.join(TEST_BASE_PATH, 'backups');
      const storageLocationId = await createStorageLocationViaApi(request, 'Test Storage', storagePath);
      const namingRuleId = await createNamingRuleViaApi(request, 'Simple', '{profile}');

      const profileId = await createBackupProfileViaApi(request, 'TestBackup', serverId, storageLocationId, namingRuleId, [
        { remote_path: '/backup/small.txt' },
        { remote_path: '/backup/medium.txt' },
        { remote_path: '/backup/large.txt' },
      ]);

      const runId = await runBackupViaApi(request, profileId);
      await waitForBackupRunComplete(request, runId);

      const impact = await getBackupRunDeletionImpact(request, runId);

      expect(impact.backup_runs).toBe(1);
      expect(impact.backup_files).toBe(3);
      // small ~13, medium 1000, large 10000
      expect(impact.total_size_bytes).toBeGreaterThan(11000);
    });

    test('should only count files for specific run', async ({ request }) => {
      const serverId = await createServerViaApi(request, 'Test Server', 'localhost', SSH_PORT, 'root', 'testpass');
      const storagePath = path.join(TEST_BASE_PATH, 'backups');
      const storageLocationId = await createStorageLocationViaApi(request, 'Test Storage', storagePath);
      const namingRuleId = await createNamingRuleViaApi(request, 'Timestamped', '{profile}-{TIMESTAMP}');

      const profileId = await createBackupProfileViaApi(request, 'TestBackup', serverId, storageLocationId, namingRuleId, [
        { remote_path: '/backup/small.txt' },
        { remote_path: '/backup/medium.txt' },
      ]);

      // Run backup twice
      const run1Id = await runBackupViaApi(request, profileId);
      await waitForBackupRunComplete(request, run1Id);

      const run2Id = await runBackupViaApi(request, profileId);
      await waitForBackupRunComplete(request, run2Id);

      // Check impact for run1 only
      const impact1 = await getBackupRunDeletionImpact(request, run1Id);
      expect(impact1.backup_runs).toBe(1);
      expect(impact1.backup_files).toBe(2);

      // Check impact for run2 only
      const impact2 = await getBackupRunDeletionImpact(request, run2Id);
      expect(impact2.backup_runs).toBe(1);
      expect(impact2.backup_files).toBe(2);
    });
  });

  test.describe('Storage Location Move Impact', () => {
    test('should return zero counts for empty storage location', async ({ request }) => {
      const storagePath = path.join(TEST_BASE_PATH, 'empty');
      const storageLocationId = await createStorageLocationViaApi(request, 'Empty Storage', storagePath);

      const newPath = path.join(TEST_BASE_PATH, 'new-empty');
      const impact = await getStorageLocationMoveImpact(request, storageLocationId, newPath);

      expect(impact.backup_profiles).toBe(0);
      expect(impact.backup_runs).toBe(0);
      expect(impact.backup_files).toBe(0);
    });

    test('should return correct counts for storage location with backups', async ({ request }) => {
      const serverId = await createServerViaApi(request, 'Test Server', 'localhost', SSH_PORT, 'root', 'testpass');
      const storagePath = path.join(TEST_BASE_PATH, 'backups');
      const storageLocationId = await createStorageLocationViaApi(request, 'Test Storage', storagePath);
      const namingRuleId = await createNamingRuleViaApi(request, 'Simple', '{profile}');

      const profileId = await createBackupProfileViaApi(request, 'TestBackup', serverId, storageLocationId, namingRuleId, [
        { remote_path: '/backup/small.txt' },
        { remote_path: '/backup/medium.txt' },
      ]);

      const runId = await runBackupViaApi(request, profileId);
      await waitForBackupRunComplete(request, runId);

      const newPath = path.join(TEST_BASE_PATH, 'new-backups');
      const impact = await getStorageLocationMoveImpact(request, storageLocationId, newPath);

      expect(impact.backup_profiles).toBe(1);
      expect(impact.backup_runs).toBe(1);
      expect(impact.backup_files).toBe(2);
      expect(impact.files_to_move.length).toBe(2);
    });

    test('should list all files to be moved', async ({ request }) => {
      const serverId = await createServerViaApi(request, 'Test Server', 'localhost', SSH_PORT, 'root', 'testpass');
      const storagePath = path.join(TEST_BASE_PATH, 'backups');
      const storageLocationId = await createStorageLocationViaApi(request, 'Test Storage', storagePath);
      const namingRuleId = await createNamingRuleViaApi(request, 'Simple', '{profile}');

      const profileId = await createBackupProfileViaApi(request, 'TestBackup', serverId, storageLocationId, namingRuleId, [
        { remote_path: '/backup/small.txt' },
        { remote_path: '/backup/large.txt' },
      ]);

      const runId = await runBackupViaApi(request, profileId);
      await waitForBackupRunComplete(request, runId);

      const newPath = path.join(TEST_BASE_PATH, 'moved');
      const impact = await getStorageLocationMoveImpact(request, storageLocationId, newPath);

      expect(impact.files_to_move.length).toBe(2);
      expect(impact.files_to_move.some((f: string) => f.includes('small.txt'))).toBe(true);
      expect(impact.files_to_move.some((f: string) => f.includes('large.txt'))).toBe(true);
    });
  });

  test.describe('Error Handling', () => {
    test('should return 404 for non-existent server', async ({ request }) => {
      const response = await request.get('/api/v1/servers/99999/deletion-impact');
      expect(response.status()).toBe(404);
    });

    test('should return 404 for non-existent backup run', async ({ request }) => {
      const response = await request.get('/api/v1/backup-runs/99999/deletion-impact');
      expect(response.status()).toBe(404);
    });

    test('should return 404 for non-existent storage location', async ({ request }) => {
      const response = await request.get('/api/v1/storage-locations/99999/move-impact?new_path=/tmp/test');
      expect(response.status()).toBe(404);
    });
  });
});
