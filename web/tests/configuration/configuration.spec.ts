import { expect, test } from '@playwright/test';
import {
  createBackupProfileViaApi,
  createNamingRuleViaApi,
  createServerViaApi,
  createStorageLocationViaApi,
  resetDatabase,
} from '../helpers/api-helpers';

test.describe('configuration import and export', () => {
  test.beforeEach(async ({ request }) => {
    await resetDatabase(request);
  });

  test('exports all configuration resources in a stable portable shape', async ({ page, request }) => {
    const serverId = await createServerViaApi(request, 'Export Test Server', '192.0.2.10', 2222, 'backup', 'test-password');
    const storageLocationId = await createStorageLocationViaApi(request, 'Export Test Storage', '/tmp/backapp-export-test');
    const namingRuleId = await createNamingRuleViaApi(request, 'Export Test Naming', '{profile}-{YYYY}');
    await createBackupProfileViaApi(
      request,
      'Export Test Profile',
      serverId,
      storageLocationId,
      namingRuleId,
      [{ remote_path: '/etc/hosts' }]
    );

    await page.goto('/configuration');
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Export configuration' }).click();
    const download = await downloadPromise;
    const exportData = JSON.parse(await download.createReadStream().then(async (stream) => {
      if (!stream) throw new Error('Export download stream was not available');
      const chunks: Buffer[] = [];
      for await (const chunk of stream) chunks.push(Buffer.from(chunk));
      return Buffer.concat(chunks).toString('utf8');
    }));

    expect(download.suggestedFilename()).toBe('backapp-configuration.json');
    expect(exportData.version).toBe(1);
    expect(exportData.servers).toEqual(expect.arrayContaining([
      expect.objectContaining({
        name: 'Export Test Server',
        host: '192.0.2.10',
        port: 2222,
        username: 'backup',
        auth_type: 'password',
        password: 'test-password',
      }),
    ]));
    expect(exportData.storage_locations).toEqual(expect.arrayContaining([
      expect.objectContaining({
        name: 'Export Test Storage',
        base_path: '/tmp/backapp-export-test',
      }),
    ]));
    expect(exportData.naming_rules).toEqual(expect.arrayContaining([
      expect.objectContaining({
        name: 'Export Test Naming',
        pattern: '{profile}-{YYYY}',
      }),
    ]));
    expect(exportData.profiles).toEqual(expect.arrayContaining([
      expect.objectContaining({
        name: 'Export Test Profile',
        server: expect.objectContaining({ name: 'Export Test Server' }),
        storage_location: expect.objectContaining({ name: 'Export Test Storage' }),
        naming_rule: expect.objectContaining({ name: 'Export Test Naming' }),
        configuration_yaml: expect.stringContaining('source: "/etc/hosts"'),
      }),
    ]));

    const addResponse = await request.post('/api/v1/configuration/import', {
      data: { configuration: exportData, mode: 'add' },
    });
    expect(addResponse.ok()).toBeTruthy();
    const profilesResponse = await request.get('/api/v1/backup-profiles');
    expect(profilesResponse.ok()).toBeTruthy();
    const profiles = await profilesResponse.json();
    expect(profiles.map((profile: { name: string }) => profile.name)).toEqual(
      expect.arrayContaining(['Export Test Profile', 'Export Test Profile (Imported)'])
    );
  });
});
