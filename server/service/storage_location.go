package service

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"backapp-server/entity"
)

func ServiceListStorageLocations() ([]entity.StorageLocation, error) {
	var locs []entity.StorageLocation
	if err := DB.Find(&locs).Error; err != nil {
		return nil, err
	}
	return locs, nil
}

func ServiceGetStorageLocation(id uint) (*entity.StorageLocation, error) {
	var loc entity.StorageLocation
	if err := DB.First(&loc, id).Error; err != nil {
		return nil, err
	}
	return &loc, nil
}

func ServiceCreateStorageLocation(input *entity.StorageLocation) (*entity.StorageLocation, error) {
	input.Enabled = true
	if input.Type == "" {
		input.Type = storageTypeLocal
	}
	if input.Type == storageTypeSFTP && input.AuthType == "" {
		if input.SSHKey != "" {
			input.AuthType = "key"
		} else if input.Password != "" {
			input.AuthType = "password"
		}
	}
	if err := DB.Create(input).Error; err != nil {
		return nil, err
	}
	return input, nil
}

// StorageLocationMoveImpact represents what will be affected by moving a storage location
type StorageLocationMoveImpact struct {
	BackupProfiles int      `json:"backup_profiles"`
	BackupRuns     int      `json:"backup_runs"`
	BackupFiles    int      `json:"backup_files"`
	TotalSizeBytes int64    `json:"total_size_bytes"`
	FilesToMove    []string `json:"files_to_move,omitempty"`
	OldPath        string   `json:"old_path"`
	NewPath        string   `json:"new_path"`
}

// ServiceGetStorageLocationMoveImpact returns the impact of moving a storage location
func ServiceGetStorageLocationMoveImpact(id uint, newPath string) (*StorageLocationMoveImpact, error) {
	var location entity.StorageLocation
	if err := DB.First(&location, id).Error; err != nil {
		return nil, err
	}

	impact := &StorageLocationMoveImpact{
		OldPath: StorageBasePath(&location),
		NewPath: newPath,
	}

	// Get all backup profiles using this storage location
	var profiles []entity.BackupProfile
	if err := DB.Where("storage_location_id = ?", id).Find(&profiles).Error; err != nil {
		return nil, err
	}
	impact.BackupProfiles = len(profiles)

	// Get all backup runs and files for these profiles
	for _, profile := range profiles {
		var runs []entity.BackupRun
		if err := DB.Where("backup_profile_id = ?", profile.ID).Find(&runs).Error; err != nil {
			return nil, err
		}
		impact.BackupRuns += len(runs)

		for _, run := range runs {
			var files []entity.BackupFile
			if err := DB.Where("backup_run_id = ?", run.ID).Find(&files).Error; err != nil {
				return nil, err
			}
			impact.BackupFiles += len(files)
			for _, file := range files {
				impact.TotalSizeBytes += file.SizeBytes
				if file.LocalPath != "" && strings.HasPrefix(file.LocalPath, impact.OldPath) {
					impact.FilesToMove = append(impact.FilesToMove, file.LocalPath)
				}
			}
		}
	}

	return impact, nil
}

// ServiceGetStorageLocationDeletionImpact returns the impact of deleting a storage location
func ServiceGetStorageLocationDeletionImpact(id uint) (*DeletionImpact, error) {
	// Check if any backup profiles reference this storage location
	var count int64
	if err := DB.Model(&entity.BackupProfile{}).Where("storage_location_id = ?", id).Count(&count).Error; err != nil {
		return nil, err
	}

	impact := &DeletionImpact{
		BackupProfiles: int(count),
	}

	if count > 0 {
		// Get all profiles and their backup data
		var profiles []entity.BackupProfile
		if err := DB.Where("storage_location_id = ?", id).Find(&profiles).Error; err != nil {
			return nil, err
		}

		for _, profile := range profiles {
			var runs []entity.BackupRun
			if err := DB.Where("backup_profile_id = ?", profile.ID).Find(&runs).Error; err != nil {
				return nil, err
			}
			impact.BackupRuns += len(runs)

			for _, run := range runs {
				var files []entity.BackupFile
				if err := DB.Where("backup_run_id = ?", run.ID).Find(&files).Error; err != nil {
					return nil, err
				}
				impact.BackupFiles += len(files)
				for _, file := range files {
					impact.TotalSizeBytes += file.SizeBytes
					if file.LocalPath != "" {
						impact.FilePaths = append(impact.FilePaths, file.LocalPath)
					}
				}
			}
		}
	}

	return impact, nil
}

// ServiceUpdateStorageLocation updates a storage location and moves files if path changed
func ServiceUpdateStorageLocation(id uint, input *entity.StorageLocation, setEnabled bool) (*entity.StorageLocation, error) {
	var location entity.StorageLocation
	if err := DB.First(&location, id).Error; err != nil {
		return nil, err
	}

	oldStorageType := NormalizeStorageType(&location)
	oldBasePath := StorageBasePath(&location)

	if input.Name != "" {
		location.Name = input.Name
	}
	if input.Type != "" {
		location.Type = input.Type
	}
	if input.BasePath != "" {
		location.BasePath = input.BasePath
	}
	if input.Address != "" {
		location.Address = input.Address
	}
	if input.Port != 0 {
		location.Port = input.Port
	}
	if input.RemotePath != "" {
		location.RemotePath = input.RemotePath
	}
	if input.Username != "" {
		location.Username = input.Username
	}
	if input.Password != "" {
		location.Password = input.Password
	}
	if input.SSHKey != "" {
		location.SSHKey = input.SSHKey
	}
	if input.AuthType != "" {
		location.AuthType = input.AuthType
	}
	if setEnabled {
		location.Enabled = input.Enabled
	}
	shouldDisableProfiles := setEnabled && location.Enabled == false

	newStorageType := NormalizeStorageType(&location)
	newBasePath := StorageBasePath(&location)

	// If path changed, move files to the new location (local only)
	if oldStorageType == storageTypeLocal && newStorageType == storageTypeLocal && newBasePath != "" && newBasePath != oldBasePath {
		// Track directories that may become empty after moving files
		dirsToCleanup := make(map[string]bool)

		// Get all backup files that need to be moved
		var profiles []entity.BackupProfile
		if err := DB.Where("storage_location_id = ?", id).Find(&profiles).Error; err != nil {
			return nil, err
		}

		for _, profile := range profiles {
			var runs []entity.BackupRun
			if err := DB.Where("backup_profile_id = ?", profile.ID).Find(&runs).Error; err != nil {
				return nil, err
			}

			for _, run := range runs {
				var files []entity.BackupFile
				if err := DB.Where("backup_run_id = ?", run.ID).Find(&files).Error; err != nil {
					return nil, err
				}

				for _, file := range files {
					// Skip files that have been deleted - they don't exist on disk anymore
					if file.Deleted {
						continue
					}

					if file.LocalPath != "" && strings.HasPrefix(file.LocalPath, oldBasePath) {
						// Check if file actually exists on disk before trying to move it
						if _, err := os.Stat(file.LocalPath); os.IsNotExist(err) {
							// File doesn't exist on disk, skip it but update the path in DB
							relativePath := strings.TrimPrefix(file.LocalPath, oldBasePath)
							newLocalPath := filepath.Join(newBasePath, relativePath)
							file.LocalPath = newLocalPath
							if err := DB.Save(&file).Error; err != nil {
								return nil, err
							}
							continue
						}

						// Track the parent directory for cleanup
						dirsToCleanup[filepath.Dir(file.LocalPath)] = true

						// Calculate new path
						relativePath := strings.TrimPrefix(file.LocalPath, oldBasePath)
						newLocalPath := filepath.Join(newBasePath, relativePath)

						// Create destination directory
						if err := os.MkdirAll(filepath.Dir(newLocalPath), 0755); err != nil {
							return nil, fmt.Errorf("failed to create directory %s: %w", filepath.Dir(newLocalPath), err)
						}

						// Move the file
						if err := os.Rename(file.LocalPath, newLocalPath); err != nil {
							// If rename fails (e.g., cross-device), try copy+delete
							if err := copyFile(file.LocalPath, newLocalPath); err != nil {
								return nil, fmt.Errorf("failed to move file %s to %s: %w", file.LocalPath, newLocalPath, err)
							}
							os.Remove(file.LocalPath) // Best effort cleanup
						}

						// Update the file record
						file.LocalPath = newLocalPath
						if err := DB.Save(&file).Error; err != nil {
							return nil, err
						}
					}
				}

				// Update run's local backup path if it exists
				if run.LocalBackupPath != "" && strings.HasPrefix(run.LocalBackupPath, oldBasePath) {
					// Track the old directory for cleanup
					dirsToCleanup[filepath.Dir(run.LocalBackupPath)] = true

					relativePath := strings.TrimPrefix(run.LocalBackupPath, oldBasePath)
					run.LocalBackupPath = filepath.Join(newBasePath, relativePath)
					if err := DB.Save(&run).Error; err != nil {
						return nil, err
					}
				}
			}
		}

		// Clean up empty directories in the old path
		for dir := range dirsToCleanup {
			removeEmptyDirs(dir)
		}
		// Also try to remove the old base path itself and its empty parents
		removeEmptyDirs(oldBasePath)

	}

	if err := DB.Save(&location).Error; err != nil {
		return nil, err
	}
	if shouldDisableProfiles {
		if err := DB.Model(&entity.BackupProfile{}).
			Where("storage_location_id = ?", id).
			Update("enabled", false).Error; err != nil {
			return nil, err
		}
	}
	return &location, nil
}

// copyFile copies a file from src to dst
func copyFile(src, dst string) error {
	sourceFile, err := os.Open(src)
	if err != nil {
		return err
	}
	defer sourceFile.Close()

	destFile, err := os.Create(dst)
	if err != nil {
		return err
	}
	defer destFile.Close()

	_, err = destFile.ReadFrom(sourceFile)
	if err != nil {
		return err
	}

	// Copy file permissions
	srcInfo, err := os.Stat(src)
	if err != nil {
		return err
	}
	return os.Chmod(dst, srcInfo.Mode())
}

// removeEmptyDirs removes empty directories starting from the given path
// and walking up the directory tree, removing all empty parent directories.
func removeEmptyDirs(dir string) {
	dir = filepath.Clean(dir)

	for dir != "/" && dir != "." && len(dir) > 1 {
		// Check if directory is empty
		entries, err := os.ReadDir(dir)
		if err != nil {
			return // Directory doesn't exist or can't be read
		}

		if len(entries) > 0 {
			return // Directory is not empty, stop
		}

		// Try to remove the empty directory
		if err := os.Remove(dir); err != nil {
			return // Can't remove, stop
		}

		// Move up to parent directory
		dir = filepath.Dir(dir)
	}
}

func ServiceDeleteStorageLocation(id string) error {
	// Check for dependent backup profiles
	var count int64
	if err := DB.Model(&entity.BackupProfile{}).Where("storage_location_id = ?", id).Count(&count).Error; err != nil {
		return err
	}
	if count > 0 {
		return fmt.Errorf("cannot delete storage location: %d backup profile(s) still reference it", count)
	}

	return DB.Delete(&entity.StorageLocation{}, "id = ?", id).Error
}
