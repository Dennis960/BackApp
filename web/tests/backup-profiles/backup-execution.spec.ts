/**
 * Backup Execution Tests
 * 
 * Tests for running backups and verifying backup run results
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
} from '../helpers/api-helpers';
import {
  cleanupTestDirectory,
  TEST_BASE_PATH,
  fileExistsOnDisk,
  getAllFilesInDirectory,
  readTestFile,
} from '../helpers/fs-helpers';
import {
  startFakeSSHServerWithFiles,
  createVirtualFile,
  createVirtualDirectory,
  type VirtualFile,
} from '../helpers/fake-ssh-server';

test.describe('Backup Execution', () => {
  let sshServer: SSHServer;
  const SSH_PORT = 2232;

  test.beforeAll(async () => {
    const virtualFiles = new Map<string, VirtualFile>();
    virtualFiles.set('/', createVirtualDirectory());
    virtualFiles.set('/backup', createVirtualDirectory());
    virtualFiles.set('/backup/db_dump.sql', createVirtualFile('-- Database dump\nCREATE TABLE users;'));
    virtualFiles.set('/backup/config.json', createVirtualFile('{"setting": "value", "debug": true}'));
    virtualFiles.set('/backup/app.log', createVirtualFile('2026-01-02 10:00:00 INFO Starting application'));

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

  test.describe('Run Backup via API', () => {
    test('should execute backup and download single file', async ({ request }) => {
      const serverId = await createServerViaApi(request, 'Test Server', 'localhost', SSH_PORT, 'root', 'testpass');
      const storagePath = path.join(TEST_BASE_PATH, 'backups');
      const storageLocationId = await createStorageLocationViaApi(request, 'Test Storage', storagePath);
      const namingRuleId = await createNamingRuleViaApi(request, 'Simple', '{profile}');

      const profileId = await createBackupProfileViaApi(
        request,
        'SingleFile',
        serverId,
        storageLocationId,
        namingRuleId,
        [{ remote_path: '/backup/db_dump.sql' }]
      );

      const runId = await runBackupViaApi(request, profileId);
      const run = await waitForBackupRunComplete(request, runId);

      expect(run.status).toBe('completed');
      expect(run.total_files).toBe(1);

      // Verify file was downloaded
      const files = await getBackupRunFilesViaApi(request, runId);
      expect(files.length).toBe(1);
      expect(files[0].local_path).toContain('db_dump.sql');
      expect(fileExistsOnDisk(files[0].local_path)).toBe(true);

      // Verify file content
      const content = readTestFile(files[0].local_path);
      expect(content).toContain('CREATE TABLE users');
    });

    test('should execute backup with multiple file rules', async ({ request }) => {
      const serverId = await createServerViaApi(request, 'Test Server', 'localhost', SSH_PORT, 'root', 'testpass');
      const storagePath = path.join(TEST_BASE_PATH, 'backups');
      const storageLocationId = await createStorageLocationViaApi(request, 'Test Storage', storagePath);
      const namingRuleId = await createNamingRuleViaApi(request, 'Simple', '{profile}');

      const profileId = await createBackupProfileViaApi(
        request,
        'MultiFile',
        serverId,
        storageLocationId,
        namingRuleId,
        [
          { remote_path: '/backup/db_dump.sql' },
          { remote_path: '/backup/config.json' },
          { remote_path: '/backup/app.log' },
        ]
      );

      const runId = await runBackupViaApi(request, profileId);
      const run = await waitForBackupRunComplete(request, runId);

      expect(run.status).toBe('completed');
      expect(run.total_files).toBe(3);

      // Verify all files were downloaded
      const files = await getBackupRunFilesViaApi(request, runId);
      expect(files.length).toBe(3);

      const fileNames = files.map((f: any) => path.basename(f.local_path));
      expect(fileNames).toContain('db_dump.sql');
      expect(fileNames).toContain('config.json');
      expect(fileNames).toContain('app.log');
    });

    test('should create proper directory structure for backups', async ({ request }) => {
      const serverId = await createServerViaApi(request, 'Test Server', 'localhost', SSH_PORT, 'root', 'testpass');
      const storagePath = path.join(TEST_BASE_PATH, 'backups');
      const storageLocationId = await createStorageLocationViaApi(request, 'Test Storage', storagePath);
      const namingRuleId = await createNamingRuleViaApi(request, 'Timestamped', '{profile}-{TIMESTAMP}');

      const profileId = await createBackupProfileViaApi(
        request,
        'TestProfile',
        serverId,
        storageLocationId,
        namingRuleId,
        [{ remote_path: '/backup/db_dump.sql' }]
      );

      const runId = await runBackupViaApi(request, profileId);
      await waitForBackupRunComplete(request, runId);

      // Verify directory structure
      const allFiles = getAllFilesInDirectory(storagePath);
      expect(allFiles.length).toBeGreaterThan(0);

      // Files should be in a directory that starts with 'TestProfile-'
      const files = await getBackupRunFilesViaApi(request, runId);
      expect(files[0].local_path).toContain('TestProfile-');
    });

    test('should record backup run logs', async ({ request }) => {
      const serverId = await createServerViaApi(request, 'Test Server', 'localhost', SSH_PORT, 'root', 'testpass');
      const storagePath = path.join(TEST_BASE_PATH, 'backups');
      const storageLocationId = await createStorageLocationViaApi(request, 'Test Storage', storagePath);
      const namingRuleId = await createNamingRuleViaApi(request, 'Simple', '{profile}');

      const profileId = await createBackupProfileViaApi(
        request,
        'LogTest',
        serverId,
        storageLocationId,
        namingRuleId,
        [{ remote_path: '/backup/db_dump.sql' }]
      );

      const runId = await runBackupViaApi(request, profileId);
      await waitForBackupRunComplete(request, runId);

      // Get logs
      const logsResponse = await request.get(`/api/v1/backup-runs/${runId}/logs`);
      expect(logsResponse.ok()).toBeTruthy();
      const logs = await logsResponse.json();

      expect(logs.length).toBeGreaterThan(0);

      // Should have INFO logs about starting and completing
      const logMessages = logs.map((l: any) => l.message);
      expect(logMessages.some((m: string) => m.includes('Starting backup'))).toBe(true);
      expect(logMessages.some((m: string) => m.includes('completed'))).toBe(true);
    });

    test('should handle backup run to same profile multiple times', async ({ request }) => {
      const serverId = await createServerViaApi(request, 'Test Server', 'localhost', SSH_PORT, 'root', 'testpass');
      const storagePath = path.join(TEST_BASE_PATH, 'backups');
      const storageLocationId = await createStorageLocationViaApi(request, 'Test Storage', storagePath);
      const namingRuleId = await createNamingRuleViaApi(request, 'Timestamped', '{profile}-{TIMESTAMP}');

      const profileId = await createBackupProfileViaApi(
        request,
        'MultiRun',
        serverId,
        storageLocationId,
        namingRuleId,
        [{ remote_path: '/backup/db_dump.sql' }]
      );

      // Run backup twice
      const runId1 = await runBackupViaApi(request, profileId);
      await waitForBackupRunComplete(request, runId1);

      // Wait a second to ensure different timestamp
      await new Promise((resolve) => setTimeout(resolve, 1100));

      const runId2 = await runBackupViaApi(request, profileId);
      await waitForBackupRunComplete(request, runId2);

      // Both runs should exist
      const runsResponse = await request.get(`/api/v1/backup-runs?profile_id=${profileId}`);
      const runs = await runsResponse.json();
      expect(runs.length).toBe(2);

      // Both should have files
      const files1 = await getBackupRunFilesViaApi(request, runId1);
      const files2 = await getBackupRunFilesViaApi(request, runId2);
      expect(files1.length).toBe(1);
      expect(files2.length).toBe(1);

      // Files should be in different directories
      expect(files1[0].local_path).not.toBe(files2[0].local_path);
    });
  });

  test.describe('Backup Run Detail', () => {
    test('should get backup run details', async ({ request }) => {
      const serverId = await createServerViaApi(request, 'Test Server', 'localhost', SSH_PORT, 'root', 'testpass');
      const storagePath = path.join(TEST_BASE_PATH, 'backups');
      const storageLocationId = await createStorageLocationViaApi(request, 'Test Storage', storagePath);
      const namingRuleId = await createNamingRuleViaApi(request, 'Simple', '{profile}');

      const profileId = await createBackupProfileViaApi(
        request,
        'DetailTest',
        serverId,
        storageLocationId,
        namingRuleId,
        [{ remote_path: '/backup/db_dump.sql' }]
      );

      const runId = await runBackupViaApi(request, profileId);
      await waitForBackupRunComplete(request, runId);

      const response = await request.get(`/api/v1/backup-runs/${runId}`);
      expect(response.ok()).toBeTruthy();
      const run = await response.json();

      expect(run.id).toBe(runId);
      expect(run.backup_profile_id).toBe(profileId);
      expect(run.status).toBe('completed');
      expect(run.start_time).toBeDefined();
      expect(run.end_time).toBeDefined();
    });

    test('should list all backup runs', async ({ request }) => {
      const serverId = await createServerViaApi(request, 'Test Server', 'localhost', SSH_PORT, 'root', 'testpass');
      const storagePath = path.join(TEST_BASE_PATH, 'backups');
      const storageLocationId = await createStorageLocationViaApi(request, 'Test Storage', storagePath);
      const namingRuleId = await createNamingRuleViaApi(request, 'Simple', '{profile}-{TIMESTAMP}');

      const profileId = await createBackupProfileViaApi(
        request,
        'ListTest',
        serverId,
        storageLocationId,
        namingRuleId,
        [{ remote_path: '/backup/db_dump.sql' }]
      );

      // Create multiple runs
      const runId1 = await runBackupViaApi(request, profileId);
      await waitForBackupRunComplete(request, runId1);
      const runId2 = await runBackupViaApi(request, profileId);
      await waitForBackupRunComplete(request, runId2);

      const response = await request.get('/api/v1/backup-runs');
      expect(response.ok()).toBeTruthy();
      const runs = await response.json();

      expect(runs.length).toBeGreaterThanOrEqual(2);
      const runIds = runs.map((r: any) => r.id);
      expect(runIds).toContain(runId1);
      expect(runIds).toContain(runId2);
    });

    test('should filter backup runs by profile ID', async ({ request }) => {
      const serverId = await createServerViaApi(request, 'Test Server', 'localhost', SSH_PORT, 'root', 'testpass');
      const storagePath = path.join(TEST_BASE_PATH, 'backups');
      const storageLocationId = await createStorageLocationViaApi(request, 'Test Storage', storagePath);
      const namingRuleId = await createNamingRuleViaApi(request, 'Simple', '{profile}-{TIMESTAMP}');

      const profileId1 = await createBackupProfileViaApi(
        request,
        'Profile1',
        serverId,
        storageLocationId,
        namingRuleId,
        [{ remote_path: '/backup/db_dump.sql' }]
      );

      const profileId2 = await createBackupProfileViaApi(
        request,
        'Profile2',
        serverId,
        storageLocationId,
        namingRuleId,
        [{ remote_path: '/backup/config.json' }]
      );

      // Run each profile once
      const runId1 = await runBackupViaApi(request, profileId1);
      await waitForBackupRunComplete(request, runId1);
      const runId2 = await runBackupViaApi(request, profileId2);
      await waitForBackupRunComplete(request, runId2);

      // Filter by profile 1
      const response = await request.get(`/api/v1/backup-runs?profile_id=${profileId1}`);
      const runs = await response.json();

      expect(runs.length).toBe(1);
      expect(runs[0].backup_profile_id).toBe(profileId1);
    });
  });

  test.describe('Dry Run', () => {
    test('should return preview without executing backup', async ({ request }) => {
      const serverId = await createServerViaApi(request, 'Test Server', 'localhost', SSH_PORT, 'root', 'testpass');
      const storagePath = path.join(TEST_BASE_PATH, 'backups');
      const storageLocationId = await createStorageLocationViaApi(request, 'Test Storage', storagePath);
      const namingRuleId = await createNamingRuleViaApi(request, 'Simple', '{profile}');

      const profileId = await createBackupProfileViaApi(
        request,
        'DryRunTest',
        serverId,
        storageLocationId,
        namingRuleId,
        [{ remote_path: '/backup/db_dump.sql' }, { remote_path: '/backup/config.json' }]
      );

      const response = await request.post(`/api/v1/backup-profiles/${profileId}/dry-run`);
      expect(response.ok()).toBeTruthy();
      const result = await response.json();

      expect(result.message).toBeDefined();
      expect(result.profile).toBeDefined();
      expect(result.file_rules).toBeDefined();
      expect(result.file_rules.length).toBe(2);

      // Should not have created any actual backup runs
      const runsResponse = await request.get(`/api/v1/backup-runs?profile_id=${profileId}`);
      const runs = await runsResponse.json();
      expect(runs.length).toBe(0);
    });
  });
});
