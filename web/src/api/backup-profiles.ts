import type { BackupProfile, BackupProfileCreateInput, BackupProfileUpdateInput } from '../types/backup-profile';
import { fetchJSON, fetchWithoutResponse } from './client';

export const backupProfileApi = {
  async list(): Promise<BackupProfile[]> {
    return fetchJSON<BackupProfile[]>('/backup-profiles');
  },

  async get(id: number): Promise<BackupProfile> {
    return fetchJSON<BackupProfile>(`/backup-profiles/${id}`);
  },

  async create(data: BackupProfileCreateInput): Promise<BackupProfile> {
    return fetchJSON<BackupProfile>('/backup-profiles', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
  },

  async update(id: number, data: BackupProfileUpdateInput): Promise<BackupProfile> {
    return fetchJSON<BackupProfile>(`/backup-profiles/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
  },

  async duplicate(id: number): Promise<BackupProfile> {
    return fetchJSON<BackupProfile>(`/backup-profiles/${id}/duplicate`, {
      method: 'POST',
    });
  },

  async delete(id: number): Promise<boolean> {
    return fetchWithoutResponse(`/backup-profiles/${id}`, {
      method: 'DELETE',
    });
  },

  async run(id: number): Promise<{ backup_run_id: number; message: string }> {
    return fetchJSON<{ backup_run_id: number; message: string }>(`/backup-profiles/${id}/run`, {
      method: 'POST',
    });
  },

  async dryRun(id: number): Promise<{ message: string; commands: string[]; files: string[] }> {
    return fetchJSON<{ message: string; commands: string[]; files: string[] }>(`/backup-profiles/${id}/dry-run`, {
      method: 'POST',
    });
  },

  async execute(id: number): Promise<{ message: string; profile_id: number }> {
    return fetchJSON<{ message: string; profile_id: number }>(`/backup-profiles/${id}/execute`, {
      method: 'POST',
    });
  },
};
