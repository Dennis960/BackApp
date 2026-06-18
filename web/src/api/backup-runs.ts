import type { BackupRun } from '../types/backup-run';
import type { BackupFile } from '../types/backup-file';
import type { BackupRunLog } from '../types/backup-run-log';
import type { DeletionImpact } from '../types/deletion-impact';
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

  async getDeletionImpact(id: number): Promise<DeletionImpact> {
    return fetchJSON<DeletionImpact>(`/backup-runs/${id}/deletion-impact`);
  },

  async delete(id: number): Promise<boolean> {
    await fetchJSON(`/backup-runs/${id}`, { method: 'DELETE' });
    return true;
  },
};

export const backupFileApi = {
  async get(id: number): Promise<BackupFile> {
    return fetchJSON<BackupFile>(`/backup-files/${id}`);
  },

  async delete(id: number): Promise<boolean> {
    await fetchJSON(`/backup-files/${id}`, { method: 'DELETE' });
    return true;
  },

  getDownloadUrl(id: number): string {
    return `/api/v1/backup-files/${id}/download`;
  },
};

export const backupRunDownloadApi = {
  getZipDownloadUrl(id: number): string {
    return `/api/v1/backup-runs/${id}/download-zip`;
  },
};
