package entity

import "time"

// BackupProfile defines a backup configuration
type BackupProfile struct {
	ID                uint      `gorm:"primaryKey" json:"id"`
	Name              string    `gorm:"not null" json:"name"`
	ServerID          uint      `gorm:"not null" json:"server_id"`
	StorageLocationID uint      `gorm:"not null" json:"storage_location_id"`
	NamingRuleID      uint      `gorm:"not null" json:"naming_rule_id"`
	ScheduleCron      string    `json:"schedule_cron,omitempty"`
	Enabled           bool      `gorm:"default:true" json:"enabled"`
	CreatedAt         time.Time `json:"created_at"`

	Server          *Server          `json:"server,omitempty"`
	StorageLocation *StorageLocation `json:"storage_location,omitempty"`
	NamingRule      *NamingRule      `json:"naming_rule,omitempty"`
	Commands        []Command        `json:"commands,omitempty"`
	FileRules       []FileRule       `json:"file_rules,omitempty"`
	BackupRuns      []BackupRun      `json:"backup_runs,omitempty"`
}
