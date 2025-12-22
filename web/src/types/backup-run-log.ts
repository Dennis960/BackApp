export interface BackupRunLog {
  id: number;
  backup_run_id: number;
  timestamp: string;
  level: 'INFO' | 'WARNING' | 'ERROR' | 'DEBUG';
  message: string;
  created_at: string;
}
