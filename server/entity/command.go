package entity

import "time"

// Command is executed over SSH before or after file transfer
type Command struct {
	ID              uint      `gorm:"primaryKey" json:"id"`
	BackupProfileID uint      `gorm:"not null" json:"backup_profile_id"`
	Command         string    `gorm:"not null" json:"command"`
	RunOrder        int       `gorm:"not null" json:"run_order"`
	RunStage        string    `gorm:"type:text;check:run_stage IN ('pre', 'post')" json:"run_stage"`
	CreatedAt       time.Time `json:"created_at"`
}
