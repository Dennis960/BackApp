export interface StorageLocation {
  id: number;
  name: string;
  base_path: string;
  created_at: string;
}

export interface StorageLocationCreateInput {
  name: string;
  base_path: string;
}
