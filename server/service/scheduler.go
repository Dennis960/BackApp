package service

import (
	"log"
	"sync"

	"backapp-server/entity"

	"github.com/robfig/cron/v3"
)

// BackupScheduler manages scheduled backup executions
type BackupScheduler struct {
	cron     *cron.Cron
	jobs     map[uint]cron.EntryID // profileID -> cronEntryID
	executor *BackupExecutor
	mu       sync.RWMutex
}

var (
	scheduler     *BackupScheduler
	schedulerOnce sync.Once
)

// GetScheduler returns the singleton scheduler instance
func GetScheduler() *BackupScheduler {
	schedulerOnce.Do(func() {
		scheduler = &BackupScheduler{
			cron:     cron.New(),
			jobs:     make(map[uint]cron.EntryID),
			executor: NewBackupExecutor(),
		}
		scheduler.cron.Start()
	})
	return scheduler
}

// ScheduleProfile schedules a backup profile for automatic execution
func (s *BackupScheduler) ScheduleProfile(profile *entity.BackupProfile) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	// Remove existing schedule if any
	if entryID, exists := s.jobs[profile.ID]; exists {
		s.cron.Remove(entryID)
		delete(s.jobs, profile.ID)
	}

	// Only schedule if enabled and has a cron expression
	if !profile.Enabled || profile.ScheduleCron == "" {
		return nil
	}

	// Add new schedule
	entryID, err := s.cron.AddFunc(profile.ScheduleCron, func() {
		log.Printf("Running scheduled backup for profile %d: %s", profile.ID, profile.Name)
		if err := s.executor.ExecuteBackup(profile.ID); err != nil {
			log.Printf("Scheduled backup failed for profile %d: %v", profile.ID, err)
		}
	})

	if err != nil {
		return err
	}

	s.jobs[profile.ID] = entryID
	log.Printf("Scheduled backup profile %d (%s) with cron: %s", profile.ID, profile.Name, profile.ScheduleCron)

	return nil
}

// UnscheduleProfile removes a backup profile from the schedule
func (s *BackupScheduler) UnscheduleProfile(profileID uint) {
	s.mu.Lock()
	defer s.mu.Unlock()

	if entryID, exists := s.jobs[profileID]; exists {
		s.cron.Remove(entryID)
		delete(s.jobs, profileID)
		log.Printf("Unscheduled backup profile %d", profileID)
	}
}

// LoadAllSchedules loads and schedules all enabled backup profiles with cron expressions
func (s *BackupScheduler) LoadAllSchedules() error {
	var profiles []entity.BackupProfile
	if err := DB.Where("enabled = ? AND schedule_cron != ''", true).Find(&profiles).Error; err != nil {
		return err
	}

	for i := range profiles {
		if err := s.ScheduleProfile(&profiles[i]); err != nil {
			log.Printf("Failed to schedule profile %d: %v", profiles[i].ID, err)
		}
	}

	log.Printf("Loaded %d scheduled backup profiles", len(profiles))
	return nil
}

// Stop stops the scheduler
func (s *BackupScheduler) Stop() {
	s.cron.Stop()
}
