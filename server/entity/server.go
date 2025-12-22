package entity

import "time"

// Server stores SSH connection details
type Server struct {
	ID             uint      `gorm:"primaryKey" json:"id"`
	Name           string    `gorm:"not null" json:"name"`
	Host           string    `gorm:"not null" json:"host"`
	Port           int       `gorm:"default:22" json:"port"`
	Username       string    `gorm:"not null" json:"username"`
	AuthType       string    `gorm:"type:text;check:auth_type IN ('password', 'key')" json:"auth_type"`
	Password       string    `json:"password,omitempty"`
	PrivateKeyPath string    `json:"-"`
	CreatedAt      time.Time `json:"created_at"`
}
