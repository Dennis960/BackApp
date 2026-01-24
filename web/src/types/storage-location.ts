export interface StorageLocation {
  id: number;
  name: string;
  base_path: string;
  type?: 'local' | 'sftp';
  address?: string;
  port?: number;
  remote_path?: string;
  username?: string;
  password?: string;
  ssh_key?: string;
  auth_type?: 'key' | 'password';
  enabled?: boolean;
  created_at: string;
}

export interface StorageLocationCreateInput {
  name: string;
  base_path?: string;
  type?: 'local' | 'sftp';
  address?: string;
  port?: number;
  remote_path?: string;
  username?: string;
  password?: string;
  ssh_key?: string;
  auth_type?: 'key' | 'password';
  enabled?: boolean;
}
