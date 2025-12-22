package entity

import "time"

type BackupRunLog struct {
	ID          uint      `json:"id" gorm:"primaryKey"`
	BackupRunID uint      `json:"backup_run_id" gorm:"not null;index"`
	BackupRun   BackupRun `json:"-" gorm:"foreignKey:BackupRunID"`
	Timestamp   time.Time `json:"timestamp" gorm:"not null"`
	Level       string    `json:"level" gorm:"not null"` // INFO, WARNING, ERROR, DEBUG
	Message     string    `json:"message" gorm:"type:text;not null"`
	CreatedAt   time.Time `json:"created_at"`
}
