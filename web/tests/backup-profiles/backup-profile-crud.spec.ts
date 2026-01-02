/**
 * Backup Profile CRUD Tests
 * 
 * Tests for backup profile management: create, read, update, delete, duplicate
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
  deleteBackupProfileViaApi,
} from '../helpers/api-helpers';
import { cleanupTestDirectory, TEST_BASE_PATH } from '../helpers/fs-helpers';
import { startFakeSSHServer } from '../helpers/fake-ssh-server';

test.describe('Backup Profile CRUD Operations', () => {
  let sshServer: SSHServer;
  const SSH_PORT = 2231;

  test.beforeAll(async () => {
    sshServer = await startFakeSSHServer(SSH_PORT, 'root', 'testpass');
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

  test.describe('API Tests', () => {
    test('should create backup profile', async ({ request }) => {
      const serverId = await createServerViaApi(request, 'Test Server', 'localhost', SSH_PORT, 'root', 'testpass');
      const storagePath = path.join(TEST_BASE_PATH, 'backups');
      const storageLocationId = await createStorageLocationViaApi(request, 'Test Storage', storagePath);
      const namingRuleId = await createNamingRuleViaApi(request, 'Simple', '{profile}');

      const profileId = await createBackupProfileViaApi(
        request,
        'Test Profile',
        serverId,
        storageLocationId,
        namingRuleId,
        [{ remote_path: '/backup/data.sql' }]
      );

      expect(profileId).toBeGreaterThan(0);

      // Verify profile exists
      const response = await request.get(`/api/v1/backup-profiles/${profileId}`);
      expect(response.ok()).toBeTruthy();
      const profile = await response.json();
      expect(profile.name).toBe('Test Profile');
      expect(profile.server_id).toBe(serverId);
      expect(profile.storage_location_id).toBe(storageLocationId);
      expect(profile.naming_rule_id).toBe(namingRuleId);
      expect(profile.enabled).toBe(true);
    });

    test('should list all backup profiles', async ({ request }) => {
      const serverId = await createServerViaApi(request, 'Server', 'localhost', SSH_PORT, 'root', 'testpass');
      const storagePath = path.join(TEST_BASE_PATH, 'backups');
      const storageLocationId = await createStorageLocationViaApi(request, 'Storage', storagePath);
      const namingRuleId = await createNamingRuleViaApi(request, 'Rule', '{profile}');

      await createBackupProfileViaApi(request, 'Profile 1', serverId, storageLocationId, namingRuleId, []);
      await createBackupProfileViaApi(request, 'Profile 2', serverId, storageLocationId, namingRuleId, []);

      const response = await request.get('/api/v1/backup-profiles');
      expect(response.ok()).toBeTruthy();
      const profiles = await response.json();
      expect(profiles.length).toBe(2);
      expect(profiles.map((p: any) => p.name)).toContain('Profile 1');
      expect(profiles.map((p: any) => p.name)).toContain('Profile 2');
    });

    test('should update backup profile', async ({ request }) => {
      const serverId = await createServerViaApi(request, 'Server', 'localhost', SSH_PORT, 'root', 'testpass');
      const storagePath = path.join(TEST_BASE_PATH, 'backups');
      const storageLocationId = await createStorageLocationViaApi(request, 'Storage', storagePath);
      const namingRuleId = await createNamingRuleViaApi(request, 'Rule', '{profile}');

      const profileId = await createBackupProfileViaApi(
        request,
        'Original',
        serverId,
        storageLocationId,
        namingRuleId,
        []
      );

      const updateResponse = await request.put(`/api/v1/backup-profiles/${profileId}`, {
        data: {
          name: 'Updated',
          server_id: serverId,
          storage_location_id: storageLocationId,
          naming_rule_id: namingRuleId,
          enabled: false,
        },
      });
      expect(updateResponse.ok()).toBeTruthy();

      const getResponse = await request.get(`/api/v1/backup-profiles/${profileId}`);
      const profile = await getResponse.json();
      expect(profile.name).toBe('Updated');
      expect(profile.enabled).toBe(false);
    });

    test('should delete backup profile', async ({ request }) => {
      const serverId = await createServerViaApi(request, 'Server', 'localhost', SSH_PORT, 'root', 'testpass');
      const storagePath = path.join(TEST_BASE_PATH, 'backups');
      const storageLocationId = await createStorageLocationViaApi(request, 'Storage', storagePath);
      const namingRuleId = await createNamingRuleViaApi(request, 'Rule', '{profile}');

      const profileId = await createBackupProfileViaApi(
        request,
        'To Delete',
        serverId,
        storageLocationId,
        namingRuleId,
        []
      );

      await deleteBackupProfileViaApi(request, profileId);

      const response = await request.get(`/api/v1/backup-profiles/${profileId}`);
      expect(response.status()).toBe(404);
    });

    test('should duplicate backup profile', async ({ request }) => {
      const serverId = await createServerViaApi(request, 'Server', 'localhost', SSH_PORT, 'root', 'testpass');
      const storagePath = path.join(TEST_BASE_PATH, 'backups');
      const storageLocationId = await createStorageLocationViaApi(request, 'Storage', storagePath);
      const namingRuleId = await createNamingRuleViaApi(request, 'Rule', '{profile}');

      const profileId = await createBackupProfileViaApi(
        request,
        'Original Profile',
        serverId,
        storageLocationId,
        namingRuleId,
        [{ remote_path: '/backup/data.sql' }]
      );

      const duplicateResponse = await request.post(`/api/v1/backup-profiles/${profileId}/duplicate`);
      expect(duplicateResponse.ok()).toBeTruthy();
      const duplicate = await duplicateResponse.json();

      expect(duplicate.id).not.toBe(profileId);
      expect(duplicate.name).toContain('Original Profile');
      expect(duplicate.server_id).toBe(serverId);
      expect(duplicate.storage_location_id).toBe(storageLocationId);
    });

    test('should return 404 for non-existent profile', async ({ request }) => {
      const response = await request.get('/api/v1/backup-profiles/99999');
      expect(response.status()).toBe(404);
    });

    test('should create profile with multiple file rules', async ({ request }) => {
      const serverId = await createServerViaApi(request, 'Server', 'localhost', SSH_PORT, 'root', 'testpass');
      const storagePath = path.join(TEST_BASE_PATH, 'backups');
      const storageLocationId = await createStorageLocationViaApi(request, 'Storage', storagePath);
      const namingRuleId = await createNamingRuleViaApi(request, 'Rule', '{profile}');

      const profileId = await createBackupProfileViaApi(
        request,
        'Multi-File Profile',
        serverId,
        storageLocationId,
        namingRuleId,
        [
          { remote_path: '/backup/db.sql', recursive: false },
          { remote_path: '/backup/config/', recursive: true },
          { remote_path: '/backup/logs/', recursive: true },
        ]
      );

      const fileRulesResponse = await request.get(`/api/v1/backup-profiles/${profileId}/file-rules`);
      expect(fileRulesResponse.ok()).toBeTruthy();
      const fileRules = await fileRulesResponse.json();
      expect(fileRules.length).toBe(3);
    });
  });

  test.describe('UI Tests', () => {
    // NOTE: The system creates default storage locations and naming rules on DB reset,
    // so we cannot test for "no prerequisites" scenario anymore.
    // The test 'should display prerequisites alert when no storage locations exist' was removed.

    test('should list backup profiles', async ({ page, request }) => {
      const serverId = await createServerViaApi(request, 'Server', 'localhost', SSH_PORT, 'root', 'testpass');
      const storagePath = path.join(TEST_BASE_PATH, 'backups');
      const storageLocationId = await createStorageLocationViaApi(request, 'Storage', storagePath);
      const namingRuleId = await createNamingRuleViaApi(request, 'Rule', '{profile}');

      await createBackupProfileViaApi(request, 'Profile Alpha', serverId, storageLocationId, namingRuleId, []);
      await createBackupProfileViaApi(request, 'Profile Beta', serverId, storageLocationId, namingRuleId, []);

      await page.goto('/backup-profiles');

      await expect(page.getByText('Profile Alpha')).toBeVisible();
      await expect(page.getByText('Profile Beta')).toBeVisible();
    });

    test('should show profile detail page', async ({ page, request }) => {
      const serverId = await createServerViaApi(request, 'Server', 'localhost', SSH_PORT, 'root', 'testpass');
      const storagePath = path.join(TEST_BASE_PATH, 'backups');
      const storageLocationId = await createStorageLocationViaApi(request, 'Storage', storagePath);
      const namingRuleId = await createNamingRuleViaApi(request, 'Rule', '{profile}');

      const profileId = await createBackupProfileViaApi(
        request,
        'Detail Profile',
        serverId,
        storageLocationId,
        namingRuleId,
        []
      );

      await page.goto(`/backup-profiles/${profileId}`);

      await expect(page.getByText('Detail Profile')).toBeVisible();
    });
  });
});
