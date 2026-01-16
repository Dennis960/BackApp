package entity

import "time"

// StorageLocation defines where backups are stored
type StorageLocation struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	Name      string    `gorm:"not null" json:"name"`
	BasePath  string    `gorm:"not null" json:"base_path"`
	Type      string    `gorm:"default:local" json:"type"`
	Address   string    `json:"address,omitempty"`
	Port      int       `json:"port,omitempty"`
	RemotePath string   `json:"remote_path,omitempty"`
	Username  string    `json:"username,omitempty"`
	Password  string    `json:"password,omitempty"`
	SSHKey    string    `json:"ssh_key,omitempty"`
	AuthType  string    `json:"auth_type,omitempty"`
	Enabled   bool      `gorm:"default:true" json:"enabled"`
	CreatedAt time.Time `json:"created_at"`
}
