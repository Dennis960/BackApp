package service

import (
	"backapp-server/entity"
)

// ServiceGetBackupRunLogs retrieves all logs for a specific backup run
func ServiceGetBackupRunLogs(runID uint) ([]entity.BackupRunLog, error) {
	var logs []entity.BackupRunLog
	err := DB.Where("backup_run_id = ?", runID).
		Order("timestamp ASC").
		Find(&logs).Error
	return logs, err
}
