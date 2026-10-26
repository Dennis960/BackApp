import { fetchJSON } from './client';

export interface ConfigurationImportResult {
  servers: number;
  storage_locations: number;
  naming_rules: number;
  profiles: number;
}

export interface ConfigurationImportImpact {
  servers: number;
  storage_locations: number;
  naming_rules: number;
  backup_profiles: number;
  backup_runs: number;
  backup_files: number;
  total_size_bytes: number;
  file_paths?: string[];
}

export const configurationApi = {
  async export(): Promise<Blob> {
    const response = await fetch('/api/v1/configuration/export');
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.blob();
  },

  async import(data: unknown, mode: 'overwrite' | 'add'): Promise<ConfigurationImportResult> {
    return fetchJSON<ConfigurationImportResult>('/configuration/import', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ configuration: data, mode }),
    });
  },

  async importImpact(data: unknown, mode: 'overwrite' | 'add'): Promise<ConfigurationImportImpact> {
    return fetchJSON<ConfigurationImportImpact>('/configuration/import-impact', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ configuration: data, mode }),
    });
  },
};
