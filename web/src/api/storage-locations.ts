import type { StorageLocation, StorageLocationCreateInput } from '../types/storage-location';
import { fetchJSON, fetchWithoutResponse } from './client';

export const storageLocationApi = {
  async list(): Promise<StorageLocation[]> {
    return fetchJSON<StorageLocation[]>('/storage-locations');
  },

  async create(data: StorageLocationCreateInput): Promise<StorageLocation> {
    return fetchJSON<StorageLocation>('/storage-locations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
  },

  async update(id: number, data: StorageLocationCreateInput): Promise<StorageLocation> {
    return fetchJSON<StorageLocation>(`/storage-locations/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
  },

  async delete(id: number): Promise<boolean> {
    return fetchWithoutResponse(`/storage-locations/${id}`, {
      method: 'DELETE',
    });
  },
};
