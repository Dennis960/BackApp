package entity

import "time"

// FileRule defines what files or directories to copy
type FileRule struct {
	ID              uint      `gorm:"primaryKey" json:"id"`
	BackupProfileID uint      `gorm:"not null" json:"backup_profile_id"`
	RemotePath      string    `gorm:"not null" json:"remote_path"`
	Recursive       bool      `gorm:"default:true" json:"recursive"`
	ExcludePattern  string    `json:"exclude_pattern,omitempty"`
	CreatedAt       time.Time `json:"created_at"`
}
