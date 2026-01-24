package entity

import "time"

// BackupFile tracks individual files downloaded during a run
type BackupFile struct {
	ID          uint       `gorm:"primaryKey" json:"id"`
	BackupRunID uint       `gorm:"not null;constraint:OnDelete:CASCADE" json:"backup_run_id"`
	FileRuleID  uint       `json:"file_rule_id,omitempty"`
	RemotePath  string     `gorm:"not null" json:"remote_path"`
	LocalPath   string     `gorm:"not null" json:"local_path"`
	SizeBytes   int64      `json:"size_bytes"`
	FileSize    int64      `json:"file_size,omitempty"`
	Checksum    string     `json:"checksum,omitempty"`
	Deleted     bool       `gorm:"default:false" json:"deleted"`
	Available   *bool      `gorm:"-" json:"available,omitempty"`
	DeletedAt   *time.Time `json:"deleted_at,omitempty"`
	CreatedAt   time.Time  `json:"created_at"`
}
