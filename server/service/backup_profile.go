package service

import (
	"backapp-server/entity"

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
