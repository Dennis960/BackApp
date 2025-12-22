export interface BackupFile {
  id: number;
  backup_run_id: number;
  remote_path?: string;
  local_path: string;
  size_bytes?: number;
  file_size?: number;
  checksum?: string;
  created_at: string;
}
