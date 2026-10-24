package service

import (
	"os"
	"path/filepath"
	"syscall"

	"backapp-server/entity"
)

// GetStorageUsage returns storage usage information for all storage locations
func GetStorageUsage() (*entity.TotalStorageUsage, error) {
	var locations []entity.StorageLocation
	if err := DB.Find(&locations).Error; err != nil {
		return nil, err
	}

	result := &entity.TotalStorageUsage{
		Locations: make([]entity.StorageUsage, 0, len(locations)),
		Profiles:  make([]entity.BackupProfileStorageUsage, 0),
	}

	for _, loc := range locations {
		usage := entity.StorageUsage{
			StorageLocationID: loc.ID,
			Name:              loc.Name,
			BasePath:          loc.BasePath,
		}

		// Get filesystem stats
		var stat syscall.Statfs_t
		if err := syscall.Statfs(loc.BasePath, &stat); err == nil {
			usage.TotalBytes = int64(stat.Blocks) * int64(stat.Bsize)
			usage.FreeBytes = int64(stat.Bavail) * int64(stat.Bsize)
			usage.UsedBytes = usage.TotalBytes - usage.FreeBytes

			if usage.TotalBytes > 0 {
				usage.UsedPercent = float64(usage.UsedBytes) / float64(usage.TotalBytes) * 100
				usage.FreePercent = float64(usage.FreeBytes) / float64(usage.TotalBytes) * 100
			}

			result.TotalBytes += usage.TotalBytes
			result.FreeBytes += usage.FreeBytes
			result.UsedBytes += usage.UsedBytes
		}

		// Calculate backup size for this location
		backupSize, backupCount := calculateBackupSize(loc.BasePath)
		usage.BackupSizeBytes = backupSize
		usage.BackupCount = backupCount
		result.TotalBackupSize += backupSize
		result.TotalBackups += backupCount

		result.Locations = append(result.Locations, usage)
	}

	if err := DB.Table("backup_profiles").
		Select(`backup_profiles.id AS backup_profile_id,
			backup_profiles.name AS profile_name,
			storage_locations.id AS storage_location_id,
			storage_locations.name AS storage_location_name,
			storage_locations.base_path AS base_path,
			COUNT(backup_files.id) AS backup_count,
			COALESCE(SUM(CASE WHEN backup_files.size_bytes > 0 THEN backup_files.size_bytes ELSE backup_files.file_size END), 0) AS backup_size_bytes`).
		Joins("LEFT JOIN storage_locations ON storage_locations.id = backup_profiles.storage_location_id").
		Joins("LEFT JOIN backup_runs ON backup_runs.backup_profile_id = backup_profiles.id").
		Joins("LEFT JOIN backup_files ON backup_files.backup_run_id = backup_runs.id AND backup_files.deleted = ?", false).
		Group("backup_profiles.id, backup_profiles.name, storage_locations.id, storage_locations.name, storage_locations.base_path").
		Order("backup_profiles.name").
		Scan(&result.Profiles).Error; err != nil {
		return nil, err
	}

	// Calculate overall percentages
	if result.TotalBytes > 0 {
		result.UsedPercent = float64(result.UsedBytes) / float64(result.TotalBytes) * 100
		result.FreePercent = float64(result.FreeBytes) / float64(result.TotalBytes) * 100
	}

	return result, nil
}

// GetStorageLocationUsage returns storage usage for a specific location
func GetStorageLocationUsage(locationID uint) (*entity.StorageUsage, error) {
	var loc entity.StorageLocation
	if err := DB.First(&loc, locationID).Error; err != nil {
		return nil, err
	}

	usage := &entity.StorageUsage{
		StorageLocationID: loc.ID,
		Name:              loc.Name,
		BasePath:          loc.BasePath,
	}

	// Get filesystem stats
	var stat syscall.Statfs_t
	if err := syscall.Statfs(loc.BasePath, &stat); err == nil {
		usage.TotalBytes = int64(stat.Blocks) * int64(stat.Bsize)
		usage.FreeBytes = int64(stat.Bavail) * int64(stat.Bsize)
		usage.UsedBytes = usage.TotalBytes - usage.FreeBytes

		if usage.TotalBytes > 0 {
			usage.UsedPercent = float64(usage.UsedBytes) / float64(usage.TotalBytes) * 100
			usage.FreePercent = float64(usage.FreeBytes) / float64(usage.TotalBytes) * 100
		}
	}

	// Calculate backup size
	usage.BackupSizeBytes, usage.BackupCount = calculateBackupSize(loc.BasePath)

	return usage, nil
}

// calculateBackupSize recursively calculates the total size of backups in a directory
func calculateBackupSize(path string) (int64, int64) {
	var totalSize int64
	var fileCount int64

	filepath.Walk(path, func(filePath string, info os.FileInfo, err error) error {
		if err != nil {
			return nil // Skip files we can't access
		}
		if !info.IsDir() {
			totalSize += info.Size()
			fileCount++
		}
		return nil
	})

	return totalSize, fileCount
}

// CheckLowStorage checks all storage locations for low storage and sends notifications
func CheckLowStorage() {
	usage, err := GetStorageUsage()
	if err != nil {
		return
	}

	for _, loc := range usage.Locations {
		if loc.TotalBytes > 0 && NotificationSvc != nil {
			NotificationSvc.NotifyLowStorage(loc.Name, loc.FreePercent)
		}
	}
}
