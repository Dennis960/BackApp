import type { Server } from './server';
import type { StorageLocation } from './storage-location';
import type { NamingRule } from './naming-rule';
import type { BackupRun } from './backup-run';

export interface BackupProfile {
  id: number;
  name: string;
  server_id: number;
  storage_location_id: number;
  naming_rule_id: number;
  schedule_cron?: string;
  retention_days?: number | null;
  enabled: boolean;
  configuration_yaml?: string;
  created_at: string;
  server?: Server;
  storage_location?: StorageLocation;
  naming_rule?: NamingRule;
  backup_runs?: BackupRun[];
}

export interface BackupProfileCreateInput {
  name: string;
  server_id: number;
  storage_location_id: number;
  naming_rule_id: number;
  schedule_cron?: string;
  retention_days?: number | null;
  enabled: boolean;
  configuration_yaml?: string;
}

export interface BackupProfileUpdateInput {
  name?: string;
  server_id?: number;
  storage_location_id?: number;
  naming_rule_id?: number;
  schedule_cron?: string;
  retention_days?: number | null;
  enabled?: boolean;
  configuration_yaml?: string;
}
