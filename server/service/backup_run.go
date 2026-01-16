package service

import (
	"os"
	"path/filepath"
	"time"

	"backapp-server/entity"
)

func ServiceCreateBackupRun(profileID uint) (*entity.BackupRun, error) {
	run := &entity.BackupRun{
		BackupProfileID: profileID,
		Status:          "pending",
	}
	if err := DB.Create(run).Error; err != nil {
		return nil, err
	}
	return run, nil
}

func ServiceListBackupRuns(profileID *int, status string) ([]entity.BackupRun, error) {
	query := DB.Model(&entity.BackupRun{})
	if profileID != nil {
		query = query.Where("backup_profile_id = ?", *profileID)
	}
	if status != "" {
		query = query.Where("status = ?", status)
	}
	var runs []entity.BackupRun
	if err := query.Find(&runs).Error; err != nil {
		return nil, err
	}
	return runs, nil
}

func ServiceGetBackupRun(id uint) (*entity.BackupRun, error) {
	var run entity.BackupRun
	if err := DB.First(&run, id).Error; err != nil {
		return nil, err
	}
	return &run, nil
}

func ServiceListBackupFilesForRun(runID uint) ([]entity.BackupFile, error) {
	var files []entity.BackupFile
	if err := DB.Where("backup_run_id = ?", runID).Find(&files).Error; err != nil {
		return nil, err
	}
	if len(files) == 0 {
		return files, nil
	}

	location, err := GetStorageLocationForRun(runID)
	if err != nil {
		return files, nil
	}
	backend, err := NewStorageBackend(location)
	if err != nil {
		return files, nil
	}
	defer backend.Close()

	for i := range files {
		if files[i].Deleted {
			continue
		}
		available := files[i].LocalPath != ""
		if available {
			if _, err := backend.Stat(files[i].LocalPath); err != nil {
				available = false
			}
		}
		files[i].Available = &available
	}
	return files, nil
}

func ServiceGetBackupFile(fileID uint) (*entity.BackupFile, error) {
	var file entity.BackupFile
	if err := DB.First(&file, fileID).Error; err != nil {
		return nil, err
	}
	return &file, nil
}

// ServiceDeleteBackupFile deletes an individual backup file from disk and marks it as deleted in DB
func ServiceDeleteBackupFile(fileID uint) error {
	var file entity.BackupFile
	if err := DB.First(&file, fileID).Error; err != nil {
		return err
	}

	location, err := GetStorageLocationForRun(file.BackupRunID)
	if err != nil {
		return err
	}
	backend, err := NewStorageBackend(location)
	if err != nil {
		return err
	}
	defer backend.Close()

	// Delete the file from storage if it exists
	if file.LocalPath != "" {
		parentDir := filepath.Dir(file.LocalPath)
		if err := backend.Remove(file.LocalPath); err == nil && backend.IsLocal() {
			// Clean up empty parent directories
			removeEmptyDirs(parentDir)
		}
	}

	// Mark as deleted
	now := time.Now()
	file.Deleted = true
	file.DeletedAt = &now
	return DB.Save(&file).Error
}

// ServiceDeleteBackupRun deletes a backup run and associated files and logs
func ServiceDeleteBackupRun(runID uint) error {
	// Ensure it exists
	var run entity.BackupRun
	if err := DB.First(&run, runID).Error; err != nil {
		return err
	}

	location, err := GetStorageLocationForRun(runID)
	if err != nil {
		return err
	}
	backend, err := NewStorageBackend(location)
	if err != nil {
		return err
	}
	defer backend.Close()

	// Get all backup files for this run to delete from disk
	var files []entity.BackupFile
	if err := DB.Where("backup_run_id = ?", runID).Find(&files).Error; err != nil {
		return err
	}

	// Track directories for cleanup
	dirsToCleanup := make(map[string]bool)

	// Delete files from disk
	for _, file := range files {
		if file.LocalPath != "" {
			dirsToCleanup[filepath.Dir(file.LocalPath)] = true
			backend.Remove(file.LocalPath) // Ignore errors, best effort cleanup
		}
	}

	// Clean up empty directories
	if backend.IsLocal() {
		for dir := range dirsToCleanup {
			removeEmptyDirs(dir)
		}
	}

	// Delete dependent records: logs and files
	if err := DB.Where("backup_run_id = ?", runID).Delete(&entity.BackupRunLog{}).Error; err != nil {
		return err
	}
	if err := DB.Where("backup_run_id = ?", runID).Delete(&entity.BackupFile{}).Error; err != nil {
		return err
	}

	// Delete the run itself
	if err := DB.Delete(&run).Error; err != nil {
		return err
	}

	return nil
}

// DeletionImpact represents what will be affected by a deletion operation
type DeletionImpact struct {
	BackupProfiles int      `json:"backup_profiles"`
	BackupRuns     int      `json:"backup_runs"`
	BackupFiles    int      `json:"backup_files"`
	TotalSizeBytes int64    `json:"total_size_bytes"`
	FilePaths      []string `json:"file_paths,omitempty"`
}

// ServiceGetBackupRunDeletionImpact returns the impact of deleting a backup run
func ServiceGetBackupRunDeletionImpact(runID uint) (*DeletionImpact, error) {
	var run entity.BackupRun
	if err := DB.First(&run, runID).Error; err != nil {
		return nil, err
	}

	var files []entity.BackupFile
	if err := DB.Where("backup_run_id = ?", runID).Find(&files).Error; err != nil {
		return nil, err
	}

	impact := &DeletionImpact{
		BackupRuns:  1,
		BackupFiles: len(files),
	}

	for _, file := range files {
		impact.TotalSizeBytes += file.SizeBytes
		if file.LocalPath != "" {
			impact.FilePaths = append(impact.FilePaths, file.LocalPath)
		}
	}

	return impact, nil
}

func GetStorageLocationForRun(runID uint) (*entity.StorageLocation, error) {
	var run entity.BackupRun
	if err := DB.First(&run, runID).Error; err != nil {
		return nil, err
	}

	var profile entity.BackupProfile
	if err := DB.Preload("StorageLocation").First(&profile, run.BackupProfileID).Error; err != nil {
		return nil, err
	}
	if profile.StorageLocation == nil {
		return nil, os.ErrNotExist
	}
	return profile.StorageLocation, nil
}
