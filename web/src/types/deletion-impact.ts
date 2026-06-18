export interface DeletionImpact {
  backup_profiles: number;
  backup_runs: number;
  backup_files: number;
  total_size_bytes: number;
  file_paths?: string[];
  backup_path?: string;
}

export interface StorageLocationMoveImpact {
  backup_profiles: number;
  backup_runs: number;
  backup_files: number;
  total_size_bytes: number;
  files_to_move?: string[];
  old_path: string;
  new_path: string;
}
