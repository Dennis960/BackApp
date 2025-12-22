export interface FileRule {
  id: number;
  backup_profile_id: number;
  remote_path: string;
  recursive: boolean;
  exclude_pattern?: string;
  created_at: string;
}

export interface FileRuleCreateInput {
  remote_path: string;
  recursive: boolean;
  exclude_pattern?: string;
}

export interface FileRuleUpdateInput {
  remote_path?: string;
  recursive?: boolean;
  exclude_pattern?: string;
}
