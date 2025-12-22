import type { FileRule, FileRuleCreateInput, FileRuleUpdateInput } from '../types/file-rule';
import { fetchJSON, fetchWithoutResponse } from './client';

export const fileRuleApi = {
  async listByProfile(profileId: number): Promise<FileRule[]> {
    return fetchJSON<FileRule[]>(`/backup-profiles/${profileId}/file-rules`);
  },

  async create(profileId: number, data: FileRuleCreateInput): Promise<FileRule> {
    return fetchJSON<FileRule>(`/backup-profiles/${profileId}/file-rules`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
  },

  async update(id: number, data: FileRuleUpdateInput): Promise<FileRule> {
    return fetchJSON<FileRule>(`/file-rules/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
  },

  async delete(id: number): Promise<boolean> {
    return fetchWithoutResponse(`/file-rules/${id}`, {
      method: 'DELETE',
    });
  },
};
