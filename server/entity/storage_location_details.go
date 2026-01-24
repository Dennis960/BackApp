package entity

import "time"

// LocalStorageLocationDetails stores local storage configuration.
type LocalStorageLocationDetails struct {
	ID                uint      `gorm:"primaryKey" json:"id"`
	StorageLocationID uint      `gorm:"not null;uniqueIndex" json:"storage_location_id"`
	BasePath          string    `gorm:"not null" json:"base_path"`
	CreatedAt         time.Time `json:"created_at"`
}

// SftpStorageLocationDetails stores SFTP storage configuration.
type SftpStorageLocationDetails struct {
	ID                uint      `gorm:"primaryKey" json:"id"`
	StorageLocationID uint      `gorm:"not null;uniqueIndex" json:"storage_location_id"`
	Address           string    `json:"address,omitempty"`
	Port              int       `json:"port,omitempty"`
	RemotePath        string    `json:"remote_path,omitempty"`
	Username          string    `json:"username,omitempty"`
	Password          string    `json:"password,omitempty"`
	SSHKey            string    `json:"ssh_key,omitempty"`
	AuthType          string    `json:"auth_type,omitempty"`
	CreatedAt         time.Time `json:"created_at"`
}
