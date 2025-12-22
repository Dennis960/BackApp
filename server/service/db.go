package service

import (
	"backapp-server/entity"
	"log"

	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

var DB *gorm.DB

func InitDB(dataSourceName string) {
	var err error
	DB, err = gorm.Open(sqlite.Open(dataSourceName), &gorm.Config{})
	if err != nil {
		log.Fatalf("Failed to open database: %v", err)
	}

	// Auto-migrate the schema
	err = DB.AutoMigrate(
		&entity.Server{},
		&entity.StorageLocation{},
		&entity.NamingRule{},
		&entity.BackupProfile{},
		&entity.Command{},
		&entity.FileRule{},
		&entity.BackupRun{},
		&entity.BackupFile{},
		&entity.BackupRunLog{},
	)
	if err != nil {
		log.Fatalf("Failed to migrate database: %v", err)
	}

	// Initialize default storage locations and naming rules
	initializeDefaults()
}

func initializeDefaults() {
	// Check if any storage locations exist
	var storageCount int64
	if err := DB.Model(&entity.StorageLocation{}).Count(&storageCount).Error; err != nil {
		log.Printf("Error checking storage locations: %v", err)
		return
	}

	// Initialize default storage locations if none exist
	if storageCount == 0 {
		defaultStorageLocations := []entity.StorageLocation{
			{
				Name:     "Local Backups",
				BasePath: "/var/backups/app",
			},
			{
				Name:     "Archive",
				BasePath: "/var/backups/archive",
			},
		}
		for _, loc := range defaultStorageLocations {
			if err := DB.Create(&loc).Error; err != nil {
				log.Printf("Error creating default storage location '%s': %v", loc.Name, err)
			} else {
				log.Printf("Created default storage location: %s", loc.Name)
			}
		}
	}

	// Check if any naming rules exist
	var ruleCount int64
	if err := DB.Model(&entity.NamingRule{}).Count(&ruleCount).Error; err != nil {
		log.Printf("Error checking naming rules: %v", err)
		return
	}

	// Initialize default naming rules if none exist
	if ruleCount == 0 {
		defaultNamingRules := []entity.NamingRule{
			{
				Name:    "Date-Time Format",
				Pattern: "backup-{YYYY}-{MM}-{DD}_{HH}-{MM}-{SS}",
			},
			{
				Name:    "Simple Date Format",
				Pattern: "backup-{YYYY}{MM}{DD}",
			},
			{
				Name:    "Timestamp Format",
				Pattern: "backup-{TIMESTAMP}",
			},
		}
		for _, rule := range defaultNamingRules {
			if err := DB.Create(&rule).Error; err != nil {
				log.Printf("Error creating default naming rule '%s': %v", rule.Name, err)
			} else {
				log.Printf("Created default naming rule: %s", rule.Name)
			}
		}
	}
}
