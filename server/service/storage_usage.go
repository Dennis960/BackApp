package service

import (
	"os"
	"path/filepath"

	"backapp-server/entity"
)

type diskUsage struct {
	Total int64
	Free  int64
	Used  int64
	Ok    bool
}

// GetStorageUsage returns storage usage information for all storage locations
func GetStorageUsage() (*entity.TotalStorageUsage, error) {
	var locations []entity.StorageLocation
	if err := DB.Find(&locations).Error; err != nil {
		return nil, err
	}

	result := &entity.TotalStorageUsage{
		Locations: make([]entity.StorageUsage, 0, len(locations)),
	}

	for _, loc := range locations {
		usage := entity.StorageUsage{
			StorageLocationID: loc.ID,
			Name:              loc.Name,
			BasePath:          StorageBasePath(&loc),
			Enabled:           loc.Enabled,
		}

		if !loc.Enabled {
			result.Locations = append(result.Locations, usage)
			continue
		}

		storageType := NormalizeStorageType(&loc)
		if storageType == storageTypeLocal {
			if disk, err := getDiskUsage(loc.BasePath); err == nil && disk.Ok {
				usage.TotalBytes = disk.Total
				usage.FreeBytes = disk.Free
				usage.UsedBytes = disk.Used

				if usage.TotalBytes > 0 {
					usage.UsedPercent = float64(usage.UsedBytes) / float64(usage.TotalBytes) * 100
					usage.FreePercent = float64(usage.FreeBytes) / float64(usage.TotalBytes) * 100
				}

				result.TotalBytes += usage.TotalBytes
				result.FreeBytes += usage.FreeBytes
				result.UsedBytes += usage.UsedBytes
			}
		}

		if storageType == storageTypeLocal {
			// Calculate backup size for this location
			backupSize, backupCount := calculateBackupSize(loc.BasePath)
			usage.BackupSizeBytes = backupSize
			usage.BackupCount = backupCount
			result.TotalBackupSize += backupSize
			result.TotalBackups += backupCount
		} else if storageType == storageTypeSFTP {
			if backupSize, backupCount, err := getSFTPBackupSize(&loc); err == nil {
				usage.BackupSizeBytes = backupSize
				usage.BackupCount = backupCount
				result.TotalBackupSize += backupSize
				result.TotalBackups += backupCount
			}
			if disk, err := getSFTPDiskUsage(&loc); err == nil && disk.Ok {
				usage.TotalBytes = disk.Total
				usage.FreeBytes = disk.Free
				usage.UsedBytes = disk.Used

				if usage.TotalBytes > 0 {
					usage.UsedPercent = float64(usage.UsedBytes) / float64(usage.TotalBytes) * 100
					usage.FreePercent = float64(usage.FreeBytes) / float64(usage.TotalBytes) * 100
				}

				result.TotalBytes += usage.TotalBytes
				result.FreeBytes += usage.FreeBytes
				result.UsedBytes += usage.UsedBytes
			}
		}

		result.Locations = append(result.Locations, usage)
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
		BasePath:          StorageBasePath(&loc),
		Enabled:           loc.Enabled,
	}

	if !loc.Enabled {
		return usage, nil
	}

	storageType := NormalizeStorageType(&loc)
	if storageType == storageTypeLocal {
		if disk, err := getDiskUsage(loc.BasePath); err == nil && disk.Ok {
			usage.TotalBytes = disk.Total
			usage.FreeBytes = disk.Free
			usage.UsedBytes = disk.Used

			if usage.TotalBytes > 0 {
				usage.UsedPercent = float64(usage.UsedBytes) / float64(usage.TotalBytes) * 100
				usage.FreePercent = float64(usage.FreeBytes) / float64(usage.TotalBytes) * 100
			}
		}
	}

	if storageType == storageTypeLocal {
		// Calculate backup size
		usage.BackupSizeBytes, usage.BackupCount = calculateBackupSize(loc.BasePath)
	} else if storageType == storageTypeSFTP {
		if backupSize, backupCount, err := getSFTPBackupSize(&loc); err == nil {
			usage.BackupSizeBytes = backupSize
			usage.BackupCount = backupCount
		}
		if disk, err := getSFTPDiskUsage(&loc); err == nil && disk.Ok {
			usage.TotalBytes = disk.Total
			usage.FreeBytes = disk.Free
			usage.UsedBytes = disk.Used

			if usage.TotalBytes > 0 {
				usage.UsedPercent = float64(usage.UsedBytes) / float64(usage.TotalBytes) * 100
				usage.FreePercent = float64(usage.FreeBytes) / float64(usage.TotalBytes) * 100
			}
		}
	}

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
