/**
 * API Test Helpers
 * 
 * Functions for interacting with the backapp API in tests
 */
import { APIRequestContext, expect } from '@playwright/test';

/**
 * Reset the database via the API
 */
export async function resetDatabase(request: APIRequestContext): Promise<void> {
  const response = await request.post('/api/v1/test/reset-database');
  if (!response.ok()) {
    throw new Error('Failed to reset database');
  }
}

/**
 * Create a server via the API
 */
export async function createServerViaApi(
  request: APIRequestContext,
  name: string,
  host: string,
  port: number,
  username: string,
  password: string
): Promise<number> {
  const response = await request.post('/api/v1/servers', {
    data: {
      name,
      host,
      port,
      username,
      auth_type: 'password',
      password,
    },
  });
  expect(response.ok()).toBeTruthy();
  const server = await response.json();
  return server.id;
}

/**
 * Delete a server via the API
 */
export async function deleteServerViaApi(request: APIRequestContext, serverId: number): Promise<void> {
  const response = await request.delete(`/api/v1/servers/${serverId}`);
  expect(response.ok()).toBeTruthy();
}

/**
 * Get deletion impact for a server
 */
export async function getServerDeletionImpact(
  request: APIRequestContext,
  serverId: number
): Promise<{ backup_profiles: number; backup_runs: number; backup_files: number; total_size_bytes: number }> {
  const response = await request.get(`/api/v1/servers/${serverId}/deletion-impact`);
  expect(response.ok()).toBeTruthy();
  return response.json();
}

/**
 * Create a storage location via the API
 */
export async function createStorageLocationViaApi(
  request: APIRequestContext,
  name: string,
  basePath: string
): Promise<number> {
  const response = await request.post('/api/v1/storage-locations', {
    data: {
      name,
      base_path: basePath,
    },
  });
  expect(response.ok()).toBeTruthy();
  const location = await response.json();
  return location.id;
}

/**
 * Update a storage location via the API
 */
export async function updateStorageLocationViaApi(
  request: APIRequestContext,
  locationId: number,
  data: { name?: string; base_path?: string }
): Promise<void> {
  const response = await request.put(`/api/v1/storage-locations/${locationId}`, {
    data,
  });
  expect(response.ok()).toBeTruthy();
}

/**
 * Delete a storage location via the API
 */
export async function deleteStorageLocationViaApi(request: APIRequestContext, locationId: number): Promise<void> {
  const response = await request.delete(`/api/v1/storage-locations/${locationId}`);
  expect(response.ok()).toBeTruthy();
}

/**
 * Get move impact for a storage location
 */
export async function getStorageLocationMoveImpact(
  request: APIRequestContext,
  locationId: number,
  newPath: string
): Promise<{ backup_profiles: number; backup_runs: number; backup_files: number; files_to_move: string[] }> {
  const response = await request.get(
    `/api/v1/storage-locations/${locationId}/move-impact?new_path=${encodeURIComponent(newPath)}`
  );
  expect(response.ok()).toBeTruthy();
  return response.json();
}

/**
 * Get deletion impact for a storage location
 */
export async function getStorageLocationDeletionImpact(
  request: APIRequestContext,
  locationId: number
): Promise<{ backup_profiles: number; backup_runs: number; backup_files: number; total_size_bytes: number }> {
  const response = await request.get(`/api/v1/storage-locations/${locationId}/deletion-impact`);
  expect(response.ok()).toBeTruthy();
  return response.json();
}

/**
 * Create a naming rule via the API
 */
export async function createNamingRuleViaApi(
  request: APIRequestContext,
  name: string,
  pattern: string
): Promise<number> {
  const response = await request.post('/api/v1/naming-rules', {
    data: {
      name,
      pattern,
    },
  });
  expect(response.ok()).toBeTruthy();
  const rule = await response.json();
  return rule.id;
}

/**
 * Delete a naming rule via the API
 */
export async function deleteNamingRuleViaApi(request: APIRequestContext, ruleId: number): Promise<void> {
  const response = await request.delete(`/api/v1/naming-rules/${ruleId}`);
  expect(response.ok()).toBeTruthy();
}

/**
 * Create a backup profile via the API
 */
export async function createBackupProfileViaApi(
  request: APIRequestContext,
  name: string,
  serverId: number,
  storageLocationId: number,
  namingRuleId: number,
  fileRules: Array<{ remote_path: string; recursive?: boolean }>
): Promise<number> {
  const response = await request.post('/api/v1/backup-profiles', {
    data: {
      name,
      server_id: serverId,
      storage_location_id: storageLocationId,
      naming_rule_id: namingRuleId,
      enabled: true,
      file_rules: fileRules.map((rule, index) => ({
        remote_path: rule.remote_path,
        recursive: rule.recursive ?? false,
        run_order: index + 1,
      })),
    },
  });
  expect(response.ok()).toBeTruthy();
  const profile = await response.json();
  return profile.id;
}

/**
 * Delete a backup profile via the API
 */
export async function deleteBackupProfileViaApi(request: APIRequestContext, profileId: number): Promise<void> {
  const response = await request.delete(`/api/v1/backup-profiles/${profileId}`);
  expect(response.ok()).toBeTruthy();
}

/**
 * Run a backup via the API and return the run ID
 */
export async function runBackupViaApi(
  request: APIRequestContext,
  profileId: number
): Promise<number> {
  // Trigger the backup execution
  const execResponse = await request.post(`/api/v1/backup-profiles/${profileId}/execute`);
  expect(execResponse.ok()).toBeTruthy();

  // Wait a bit for the backup to start
  await new Promise((resolve) => setTimeout(resolve, 500));

  // Get the backup runs for this profile and return the latest
  const runsResponse = await request.get(`/api/v1/backup-runs?profile_id=${profileId}`);
  expect(runsResponse.ok()).toBeTruthy();
  const runs = await runsResponse.json();
  if (runs.length === 0) {
    throw new Error('No backup runs found after triggering backup');
  }
  return Math.max(...runs.map((r: { id: number }) => r.id));
}

/**
 * Wait for a backup run to complete
 */
export async function waitForBackupRunComplete(
  request: APIRequestContext,
  runId: number,
  timeoutMs = 30000
): Promise<{ status: string; total_files: number }> {
  const startTime = Date.now();
  while (Date.now() - startTime < timeoutMs) {
    const response = await request.get(`/api/v1/backup-runs/${runId}`);
    if (!response.ok()) {
      const text = await response.text();
      throw new Error(`Failed to get backup run ${runId}: ${response.status()} - ${text}`);
    }
    const run = await response.json();
    if (run.status === 'completed' || run.status === 'failed') {
      return run;
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`Backup run ${runId} did not complete within ${timeoutMs}ms`);
}

/**
 * Get backup run files via the API
 */
export async function getBackupRunFilesViaApi(
  request: APIRequestContext,
  runId: number
): Promise<Array<{ id: number; local_path: string; deleted: boolean }>> {
  const response = await request.get(`/api/v1/backup-runs/${runId}/files`);
  expect(response.ok()).toBeTruthy();
  return response.json();
}

/**
 * Get deletion impact for a backup run
 */
export async function getBackupRunDeletionImpact(
  request: APIRequestContext,
  runId: number
): Promise<{ backup_runs: number; backup_files: number; total_size_bytes: number }> {
  const response = await request.get(`/api/v1/backup-runs/${runId}/deletion-impact`);
  expect(response.ok()).toBeTruthy();
  return response.json();
}

/**
 * Delete a backup run via the API
 */
export async function deleteBackupRunViaApi(request: APIRequestContext, runId: number): Promise<void> {
  const response = await request.delete(`/api/v1/backup-runs/${runId}`);
  expect(response.ok()).toBeTruthy();
}

/**
 * Delete a backup file via the API
 */
export async function deleteBackupFileViaApi(request: APIRequestContext, fileId: number): Promise<void> {
  const response = await request.delete(`/api/v1/backup-files/${fileId}`);
  expect(response.ok()).toBeTruthy();
}
