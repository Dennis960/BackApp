import { fetchJSON } from './client';

export interface FileSystemEntry {
  name: string;
  path: string;
  is_dir: boolean;
  size: number;
}

interface FileListResponse {
  entries?: FileSystemEntry[];
  error?: string;
}

export const fileExplorerApi = {
  async listFiles(serverId: number, path?: string): Promise<FileSystemEntry[]> {
    const params = new URLSearchParams();
    if (path) {
      params.append('path', path);
    }
    const queryString = params.toString();
    const url = `/servers/${serverId}/files${queryString ? '?' + queryString : ''}`;
    
    const response = await fetchJSON<FileSystemEntry[] | FileListResponse>(url);
    
    // Handle both response formats
    if (Array.isArray(response)) {
      return response;
    }
    
    // If response has an error, throw it
    if (response.error) {
      throw new Error(response.error);
    }
    
    return response.entries || [];
  },
};
