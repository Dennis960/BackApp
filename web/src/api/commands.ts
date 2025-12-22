import type { Command, CommandCreateInput, CommandUpdateInput } from '../types/command';
import { fetchJSON, fetchWithoutResponse } from './client';

export const commandApi = {
  async listByProfile(profileId: number): Promise<Command[]> {
    return fetchJSON<Command[]>(`/backup-profiles/${profileId}/commands`);
  },

  async create(profileId: number, data: CommandCreateInput): Promise<Command> {
    return fetchJSON<Command>(`/backup-profiles/${profileId}/commands`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
  },

  async update(id: number, data: CommandUpdateInput): Promise<Command> {
    return fetchJSON<Command>(`/commands/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
  },

  async delete(id: number): Promise<boolean> {
    return fetchWithoutResponse(`/commands/${id}`, {
      method: 'DELETE',
    });
  },
};
