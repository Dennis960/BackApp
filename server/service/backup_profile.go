package service

import (
	"backapp-server/entity"
	"fmt"

	"gorm.io/gorm"
)

func ServiceListBackupProfiles() ([]entity.BackupProfile, error) {
	var profiles []entity.BackupProfile
	if err := DB.
		Preload("Server").
		Preload("StorageLocation").
		Preload("NamingRule").
		Preload("Commands").
		Preload("FileRules").
		Preload("BackupRuns", func(db *gorm.DB) *gorm.DB {
			return db.Order("start_time DESC").Limit(10)
		}).
		Find(&profiles).Error; err != nil {
		return nil, err
	}

	return profiles, nil
}

func ServiceListBackupProfilesForExport() ([]entity.BackupProfile, error) {
	var profiles []entity.BackupProfile
	if err := DB.
		Preload("Server").
		Preload("StorageLocation").
		Preload("NamingRule").
		Preload("Commands").
		Preload("FileRules").
		Find(&profiles).Error; err != nil {
		return nil, err
	}

	return profiles, nil
}

func ServiceExportBackupProfiles() ([]entity.BackupProfile, error) {
	return ServiceListBackupProfilesForExport()
}

func ServiceImportBackupProfiles(
	db *gorm.DB,
	inputs []entity.BackupProfile,
	serverIDs map[string]uint,
	locationIDs map[string]uint,
	ruleIDs map[string]uint,
) (int, error) {
	imported := 0
	for _, input := range inputs {
		if input.Server == nil || input.StorageLocation == nil || input.NamingRule == nil {
			return 0, fmt.Errorf("profile %q is missing a server, storage location, or naming rule", input.Name)
		}
		serverID, ok := serverIDs[input.Server.Name]
		if !ok {
			return 0, fmt.Errorf("profile %q references unknown server %q", input.Name, input.Server.Name)
		}
		locationID, ok := locationIDs[input.StorageLocation.Name]
		if !ok {
			return 0, fmt.Errorf("profile %q references unknown storage location %q", input.Name, input.StorageLocation.Name)
		}
		ruleID, ok := ruleIDs[input.NamingRule.Name]
		if !ok {
			return 0, fmt.Errorf("profile %q references unknown naming rule %q", input.Name, input.NamingRule.Name)
		}

		var profile entity.BackupProfile
		query := db.Where("name = ?", input.Name).First(&profile)
		if query.Error != nil && query.Error != gorm.ErrRecordNotFound {
			return 0, query.Error
		}
		profile.Name = input.Name
		profile.ServerID = serverID
		profile.StorageLocationID = locationID
		profile.NamingRuleID = ruleID
		profile.ScheduleCron = input.ScheduleCron
		profile.RetentionDays = input.RetentionDays
		profile.Enabled = input.Enabled
		if query.Error == gorm.ErrRecordNotFound {
			if err := db.Create(&profile).Error; err != nil {
				return 0, fmt.Errorf("failed to import profile %q: %w", profile.Name, err)
			}
		} else if err := db.Save(&profile).Error; err != nil {
			return 0, fmt.Errorf("failed to update profile %q: %w", profile.Name, err)
		}

		if err := db.Where("backup_profile_id = ?", profile.ID).Delete(&entity.Command{}).Error; err != nil {
			return 0, err
		}
		if err := db.Where("backup_profile_id = ?", profile.ID).Delete(&entity.FileRule{}).Error; err != nil {
			return 0, err
		}
		for _, command := range input.Commands {
			command.ID = 0
			command.BackupProfileID = profile.ID
			if err := db.Create(&command).Error; err != nil {
				return 0, fmt.Errorf("failed to import commands for profile %q: %w", profile.Name, err)
			}
		}
		for _, fileRule := range input.FileRules {
			fileRule.ID = 0
			fileRule.BackupProfileID = profile.ID
			if err := db.Create(&fileRule).Error; err != nil {
				return 0, fmt.Errorf("failed to import file rules for profile %q: %w", profile.Name, err)
			}
		}
		imported++
	}
	return imported, nil
}

func ServiceCreateBackupProfile(input *entity.BackupProfile) (*entity.BackupProfile, error) {
	if err := DB.Create(input).Error; err != nil {
		return nil, err
	}

	// Schedule the profile if it has a cron expression and is enabled
	scheduler := GetScheduler()
	if err := scheduler.ScheduleProfile(input); err != nil {
		// Log error but don't fail the creation
		// The profile is created, just not scheduled
	}

	return input, nil
}

func ServiceGetBackupProfile(id uint) (*entity.BackupProfile, error) {
	var profile entity.BackupProfile
	if err := DB.First(&profile, id).Error; err != nil {
		return nil, err
	}
	return &profile, nil
}

func ServiceUpdateBackupProfile(id uint, input *entity.BackupProfile) (*entity.BackupProfile, error) {
	profile, err := ServiceGetBackupProfile(id)
	if err != nil {
		return nil, err
	}
	profile.Name = input.Name
	profile.ServerID = input.ServerID
	profile.StorageLocationID = input.StorageLocationID
	profile.NamingRuleID = input.NamingRuleID
	profile.ScheduleCron = input.ScheduleCron
	profile.RetentionDays = input.RetentionDays
	profile.Enabled = input.Enabled
	if err := DB.Save(profile).Error; err != nil {
		return nil, err
	}

	// Update schedule
	scheduler := GetScheduler()
	if err := scheduler.ScheduleProfile(profile); err != nil {
		// Log error but don't fail the update
	}

	return profile, nil
}

func ServiceDeleteBackupProfile(id uint) error {
	// Unschedule first
	scheduler := GetScheduler()
	scheduler.UnscheduleProfile(id)

	return DB.Delete(&entity.BackupProfile{}, id).Error
}

func ServiceDuplicateBackupProfile(id uint) (*entity.BackupProfile, error) {
	original, err := ServiceGetBackupProfileFull(id)
	if err != nil {
		return nil, err
	}

	// Create a copy of the original profile
	duplicate := *original
	duplicate.ID = 0 // Reset ID for new record
	duplicate.Name = original.Name + " (Copy)"
	duplicate.Enabled = false // Duplicates are disabled by default

	// Clear associations to prevent GORM from modifying original records
	duplicate.Commands = nil
	duplicate.FileRules = nil
	duplicate.BackupRuns = nil
	duplicate.Server = nil
	duplicate.StorageLocation = nil
	duplicate.NamingRule = nil

	// Save the duplicate profile
	if err := DB.Create(&duplicate).Error; err != nil {
		return nil, err
	}

	// Duplicate associated commands
	for _, cmd := range original.Commands {
		newCmd := cmd
		newCmd.ID = 0
		newCmd.BackupProfileID = duplicate.ID
		if err := DB.Create(&newCmd).Error; err != nil {
			return nil, err
		}
	}

	// Duplicate associated file rules
	for _, rule := range original.FileRules {
		newRule := rule
		newRule.ID = 0
		newRule.BackupProfileID = duplicate.ID
		if err := DB.Create(&newRule).Error; err != nil {
			return nil, err
		}
	}

	return &duplicate, nil
}

func ServiceGetBackupProfileFull(id uint) (*entity.BackupProfile, error) {
	var profile entity.BackupProfile
	if err := DB.
		Preload("Server").
		Preload("StorageLocation").
		Preload("NamingRule").
		Preload("Commands").
		Preload("FileRules").
		First(&profile, id).Error; err != nil {
		return nil, err
	}
	if profile.Server != nil {
		profile.Server = sanitizeServer(profile.Server)
	}
	return &profile, nil
}
