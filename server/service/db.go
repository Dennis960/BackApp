package service

import (
	"backapp-server/entity"
	"log"
	"os"

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

	// Enable foreign key support for SQLite
	sqlDB, err := DB.DB()
	if err != nil {
		log.Fatalf("Failed to get raw database connection: %v", err)
	}
	_, err = sqlDB.Exec("PRAGMA foreign_keys = ON")
	if err != nil {
		log.Printf("Warning: Failed to enable foreign keys: %v", err)
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
		&entity.PushSubscription{},
		&entity.NotificationPreference{},
		&entity.VAPIDKeys{},
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
				Type:     storageTypeLocal,
			},
			{
				Name:     "Archive",
				BasePath: "/var/backups/archive",
				Type:     storageTypeLocal,
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
				Name:    "Backup-Format",
				Pattern: "{YYYY}{MM}{DD}-{profile}",
			},
			{
				Name:    "Date-Time Format",
				Pattern: "{profile}-{YYYY}-{MM}-{DD}_{HH}-{MM}-{SS}",
			},
			{
				Name:    "Simple Date Format",
				Pattern: "{profile}-{YYYY}{MM}{DD}",
			},
			{
				Name:    "Timestamp Format",
				Pattern: "{profile}-{TIMESTAMP}",
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

func ResetDatabase() {
	sqlDB, err := DB.DB()
	if err != nil {
		log.Fatalf("Failed to get raw database connection: %v", err)
	}

	// Close the existing database connection
	if err := sqlDB.Close(); err != nil {
		log.Printf("Warning: Failed to close database connection: %v", err)
	}

	// Delete the existing database file
	if err := os.Remove("app.db"); err != nil {
		log.Printf("Warning: Failed to delete database file: %v", err)
	}

	// Re-initialize the database
	InitDB("app.db")
}
