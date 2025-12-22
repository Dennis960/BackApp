package entity

import "time"

// BackupRun represents each execution of a backup profile
type BackupRun struct {
	ID              uint       `gorm:"primaryKey" json:"id"`
	BackupProfileID uint       `gorm:"not null" json:"backup_profile_id"`
	StartTime       time.Time  `json:"start_time"`
	EndTime         time.Time  `json:"end_time,omitempty"`
	StartedAt       *time.Time `json:"started_at,omitempty"`
	FinishedAt      *time.Time `json:"finished_at,omitempty"`
	Status          string     `gorm:"type:text" json:"status"`
	LocalBackupPath string     `json:"local_backup_path,omitempty"`
	TotalFiles      int        `json:"total_files"`
	TotalSizeBytes  int64      `json:"total_size_bytes"`
	ErrorMessage    string     `json:"error_message,omitempty"`
	Log             string     `json:"log,omitempty"`

	BackupFiles []BackupFile `json:"backup_files,omitempty"`
}
