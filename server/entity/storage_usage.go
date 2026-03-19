package entity

// StorageUsage represents disk usage information for a storage location
type StorageUsage struct {
	StorageLocationID uint    `json:"storage_location_id"`
	Name              string  `json:"name"`
	BasePath          string  `json:"base_path"`
	Enabled           bool    `json:"enabled"`
	TotalBytes        int64   `json:"total_bytes"`
	UsedBytes         int64   `json:"used_bytes"`
	FreeBytes         int64   `json:"free_bytes"`
	UsedPercent       float64 `json:"used_percent"`
	FreePercent       float64 `json:"free_percent"`
	BackupCount       int64   `json:"backup_count"`
	BackupSizeBytes   int64   `json:"backup_size_bytes"`
}

// TotalStorageUsage represents aggregated storage usage across all locations
type TotalStorageUsage struct {
	TotalBytes      int64          `json:"total_bytes"`
	UsedBytes       int64          `json:"used_bytes"`
	FreeBytes       int64          `json:"free_bytes"`
	UsedPercent     float64        `json:"used_percent"`
	FreePercent     float64        `json:"free_percent"`
	TotalBackups    int64          `json:"total_backups"`
	TotalBackupSize int64          `json:"total_backup_size_bytes"`
	Locations       []StorageUsage `json:"locations"`
}
