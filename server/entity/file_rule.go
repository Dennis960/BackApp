package entity

import "time"

// FileRule defines what files or directories to copy
type FileRule struct {
	ID              uint      `gorm:"primaryKey" json:"id"`
	BackupProfileID uint      `gorm:"not null;constraint:OnDelete:CASCADE" json:"backup_profile_id"`
	RemotePath      string    `gorm:"not null" json:"remote_path"`
	Recursive       bool      `gorm:"default:true" json:"recursive"`
	Compress        bool      `gorm:"default:false" json:"compress"`
	CompressFormat  string    `json:"compress_format,omitempty"`
	CompressPassword string   `json:"compress_password,omitempty"`
	ExcludePattern  string    `json:"exclude_pattern,omitempty"`
	CreatedAt       time.Time `json:"created_at"`
}
