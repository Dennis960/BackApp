package entity

import "time"

// NamingRule controls how backup folders/files are named
type NamingRule struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	Name      string    `gorm:"not null" json:"name"`
	Pattern   string    `gorm:"not null" json:"pattern"`
	CreatedAt time.Time `json:"created_at"`
}
