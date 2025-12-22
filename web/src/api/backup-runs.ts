import type { BackupRun } from '../types/backup-run';
import type { BackupFile } from '../types/backup-file';
import type { BackupRunLog } from '../types/backup-run-log';
import { fetchJSON } from './client';

export const backupRunApi = {
  async list(params?: { profileId?: number; status?: string }): Promise<BackupRun[]> {
    const query = new URLSearchParams();
    if (params?.profileId !== undefined) {
      query.set('profile_id', params.profileId.toString());
    }
    if (params?.status) {
      query.set('status', params.status);
    }

    const qs = query.toString();
    const url = qs ? `/backup-runs?${qs}` : '/backup-runs';
    return fetchJSON<BackupRun[]>(url);
  },

  async get(id: number): Promise<BackupRun> {
    return fetchJSON<BackupRun>(`/backup-runs/${id}`);
  },

  async getFiles(id: number): Promise<BackupFile[]> {
    return fetchJSON<BackupFile[]>(`/backup-runs/${id}/files`);
  },

  async getLogs(id: number): Promise<BackupRunLog[]> {
    return fetchJSON<BackupRunLog[]>(`/backup-runs/${id}/logs`);
  },
};
