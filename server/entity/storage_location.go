package entity

import "time"

// StorageLocation defines where backups are stored locally
type StorageLocation struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	Name      string    `gorm:"not null" json:"name"`
	BasePath  string    `gorm:"not null" json:"base_path"`
	CreatedAt time.Time `json:"created_at"`
}
