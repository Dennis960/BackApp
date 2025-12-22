package service

import "backapp-server/entity"

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
	return files, nil
}

func ServiceGetBackupFile(fileID uint) (*entity.BackupFile, error) {
	var file entity.BackupFile
	if err := DB.First(&file, fileID).Error; err != nil {
		return nil, err
	}
	return &file, nil
}
