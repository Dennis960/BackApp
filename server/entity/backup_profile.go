package entity

import "time"

// BackupProfile defines a backup configuration
type BackupProfile struct {
	ID                uint      `gorm:"primaryKey" json:"id"`
	Name              string    `gorm:"not null" json:"name"`
	ServerID          uint      `gorm:"not null;constraint:OnDelete:RESTRICT" json:"server_id"`
	StorageLocationID uint      `gorm:"not null;constraint:OnDelete:RESTRICT" json:"storage_location_id"`
	NamingRuleID      uint      `gorm:"not null;constraint:OnDelete:RESTRICT" json:"naming_rule_id"`
	ScheduleCron      string    `json:"schedule_cron,omitempty"`
	RetentionDays     *int      `json:"retention_days"` // nil or 0 means keep forever
	Enabled           bool      `json:"enabled"`
	ConfigurationYAML string    `json:"configuration_yaml,omitempty"`
	CreatedAt         time.Time `json:"created_at"`

	Server          *Server          `gorm:"foreignKey:ServerID" json:"server,omitempty"`
	StorageLocation *StorageLocation `gorm:"foreignKey:StorageLocationID" json:"storage_location,omitempty"`
	NamingRule      *NamingRule      `gorm:"foreignKey:NamingRuleID" json:"naming_rule,omitempty"`
	BackupRuns      []BackupRun      `gorm:"foreignKey:BackupProfileID;constraint:OnDelete:CASCADE" json:"backup_runs,omitempty"`
}
