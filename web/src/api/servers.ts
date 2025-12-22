import type { Server, ServerCreateInput } from '../types/server';
import { fetchJSON, fetchWithoutResponse } from './client';

export const serverApi = {
  async list(): Promise<Server[]> {
    return fetchJSON<Server[]>('/servers');
  },

  async get(id: number): Promise<Server> {
    return fetchJSON<Server>(`/servers/${id}`);
  },

  async create(formData: FormData): Promise<Server> {
    return fetchJSON<Server>('/servers', {
      method: 'POST',
      body: formData,
    });
  },

  async update(id: number, data: Partial<ServerCreateInput>): Promise<Server> {
    return fetchJSON<Server>(`/servers/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
  },

  async delete(id: number): Promise<boolean> {
    return fetchWithoutResponse(`/servers/${id}`, {
      method: 'DELETE',
    });
  },

  async testConnection(id: number): Promise<{ success: boolean; message: string }> {
    return fetchJSON<{ success: boolean; message: string }>(`/servers/${id}/test-connection`, {
      method: 'POST',
    });
  },
};
