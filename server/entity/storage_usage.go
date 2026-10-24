package entity

// StorageUsage represents disk usage information for a storage location
type StorageUsage struct {
	StorageLocationID uint    `json:"storage_location_id"`
	Name              string  `json:"name"`
	BasePath          string  `json:"base_path"`
	TotalBytes        int64   `json:"total_bytes"`
	UsedBytes         int64   `json:"used_bytes"`
	FreeBytes         int64   `json:"free_bytes"`
	UsedPercent       float64 `json:"used_percent"`
	FreePercent       float64 `json:"free_percent"`
	BackupCount       int64   `json:"backup_count"`
	BackupSizeBytes   int64   `json:"backup_size_bytes"`
}

type BackupProfileStorageUsage struct {
	BackupProfileID     uint   `json:"backup_profile_id" gorm:"column:backup_profile_id"`
	ProfileName         string `json:"profile_name" gorm:"column:profile_name"`
	StorageLocationID   uint   `json:"storage_location_id" gorm:"column:storage_location_id"`
	StorageLocationName string `json:"storage_location_name" gorm:"column:storage_location_name"`
	BasePath            string `json:"base_path" gorm:"column:base_path"`
	BackupCount         int64  `json:"backup_count" gorm:"column:backup_count"`
	BackupSizeBytes     int64  `json:"backup_size_bytes" gorm:"column:backup_size_bytes"`
}

// TotalStorageUsage represents aggregated storage usage across all locations
type TotalStorageUsage struct {
	TotalBytes      int64                       `json:"total_bytes"`
	UsedBytes       int64                       `json:"used_bytes"`
	FreeBytes       int64                       `json:"free_bytes"`
	UsedPercent     float64                     `json:"used_percent"`
	FreePercent     float64                     `json:"free_percent"`
	TotalBackups    int64                       `json:"total_backups"`
	TotalBackupSize int64                       `json:"total_backup_size_bytes"`
	Locations       []StorageUsage              `json:"locations"`
	Profiles        []BackupProfileStorageUsage `json:"profiles"`
}
