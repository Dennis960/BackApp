import type { NamingRule, NamingRuleCreateInput } from '../types/naming-rule';
import type { DeletionImpact } from '../types/deletion-impact';
import { fetchJSON, fetchWithoutResponse } from './client';

export const namingRuleApi = {
  async list(): Promise<NamingRule[]> {
    return fetchJSON<NamingRule[]>('/naming-rules');
  },

  async create(data: NamingRuleCreateInput): Promise<NamingRule> {
    return fetchJSON<NamingRule>('/naming-rules', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
  },

  async update(id: number, data: NamingRuleCreateInput): Promise<NamingRule> {
    return fetchJSON<NamingRule>(`/naming-rules/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
  },

  async delete(id: number): Promise<boolean> {
    return fetchWithoutResponse(`/naming-rules/${id}`, {
      method: 'DELETE',
    });
  },

  async getDeletionImpact(id: number): Promise<DeletionImpact> {
    return fetchJSON<DeletionImpact>(`/naming-rules/${id}/deletion-impact`);
  },

  async translate(pattern: string): Promise<string> {
    const response = await fetchJSON<{ result: string }>('/naming-rules/translate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ pattern }),
    });
    return response.result;
  },
};
