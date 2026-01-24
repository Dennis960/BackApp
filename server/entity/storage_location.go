package entity

import "time"

// StorageLocation defines where backups are stored
type StorageLocation struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	Name      string    `gorm:"not null" json:"name"`
	BasePath  string    `json:"base_path"`
	Type      string    `gorm:"default:local" json:"type"`
	Address   string    `gorm:"->" json:"address,omitempty"`
	Port      int       `gorm:"->" json:"port,omitempty"`
	RemotePath string   `gorm:"->" json:"remote_path,omitempty"`
	Username  string    `gorm:"->" json:"username,omitempty"`
	Password  string    `gorm:"->" json:"password,omitempty"`
	SSHKey    string    `gorm:"->" json:"ssh_key,omitempty"`
	AuthType  string    `gorm:"->" json:"auth_type,omitempty"`
	Enabled   bool      `gorm:"default:true" json:"enabled"`
	CreatedAt time.Time `json:"created_at"`
}
