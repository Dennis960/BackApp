package service

import (
	"fmt"
	"log"
	"path/filepath"
	"sort"
	"time"

	"backapp-server/entity"
)

// BackupExecutor handles the execution of backup profiles
type BackupExecutor struct{}

// NewBackupExecutor creates a new backup executor
func NewBackupExecutor() *BackupExecutor {
	return &BackupExecutor{}
}

// logToDatabase writes a log entry to the database
func (e *BackupExecutor) logToDatabase(runID uint, level, message string) {
	logEntry := &entity.BackupRunLog{
		BackupRunID: runID,
		Timestamp:   time.Now(),
		Level:       level,
		Message:     message,
	}
	if err := DB.Create(logEntry).Error; err != nil {
		log.Printf("Failed to save log to database: %v", err)
	}
	// Also log to console
	log.Printf("[%s] %s", level, message)
}

// ExecuteBackup executes a backup profile
func (e *BackupExecutor) ExecuteBackup(profileID uint, allowDisabled bool) error {
	// Load the backup profile with all relations
	var profile entity.BackupProfile
	if err := DB.Preload("Server").
		Preload("StorageLocation").
		Preload("NamingRule").
		Preload("Commands").
		Preload("FileRules").
		First(&profile, profileID).Error; err != nil {
		return fmt.Errorf("failed to load backup profile: %v", err)
	}

	// Check if profile is enabled (unless manually allowed)
	if !profile.Enabled && !allowDisabled {
		return fmt.Errorf("backup profile is disabled")
	}
	if profile.StorageLocation != nil && !profile.StorageLocation.Enabled {
		return fmt.Errorf("storage location is disabled")
	}

	// Create backup run record
	run := &entity.BackupRun{
		BackupProfileID: profileID,
		Status:          "running",
		StartTime:       time.Now(),
	}
	if err := DB.Create(run).Error; err != nil {
		return fmt.Errorf("failed to create backup run: %v", err)
	}

	e.logToDatabase(run.ID, "INFO", fmt.Sprintf("Starting backup for profile: %s", profile.Name))

	// Send notification for backup started
	if NotificationSvc != nil {
		go NotificationSvc.NotifyBackupStarted(profileID, profile.Name)
	}

	// Execute backup and update status
	err := e.executeBackupInternal(&profile, run)

	// Update run status
	run.EndTime = time.Now()
	duration := run.EndTime.Sub(run.StartTime)
	if err != nil {
		run.Status = "failed"
		run.ErrorMessage = err.Error()
		e.logToDatabase(run.ID, "ERROR", fmt.Sprintf("Backup failed: %v", err))

		// Send failure notification
		if NotificationSvc != nil {
			go NotificationSvc.NotifyBackupFailed(profileID, profile.Name, err.Error())

			// Check for consecutive failures
			failureCount := GetConsecutiveFailureCount(profileID)
			if failureCount > 1 {
				go NotificationSvc.NotifyConsecutiveFailures(profileID, profile.Name, failureCount)
			}
		}
	} else {
		run.Status = "completed"
		e.logToDatabase(run.ID, "INFO", "Backup completed successfully")

		// Send success notification
		if NotificationSvc != nil {
			go NotificationSvc.NotifyBackupSuccess(profileID, profile.Name, duration)
		}

		// Check storage usage and notify if low
		go CheckLowStorage()
	}

	// Update the run record - using Save with the full struct
	if updateErr := DB.Save(run).Error; updateErr != nil {
		log.Printf("Failed to update backup run status: %v", updateErr)
		e.logToDatabase(run.ID, "ERROR", fmt.Sprintf("Failed to update run status: %v", updateErr))
	} else {
		e.logToDatabase(run.ID, "DEBUG", fmt.Sprintf("Run status updated to: %s", run.Status))
	}

	return err
}

// executeBackupInternal performs the actual backup execution
func (e *BackupExecutor) executeBackupInternal(profile *entity.BackupProfile, run *entity.BackupRun) error {
	// Create SSH client
	e.logToDatabase(run.ID, "INFO", fmt.Sprintf("Connecting to server: %s@%s:%d", profile.Server.Username, profile.Server.Host, profile.Server.Port))
	sshClient, err := NewSSHClient(profile.Server)
	if err != nil {
		e.logToDatabase(run.ID, "ERROR", fmt.Sprintf("Failed to create SSH client: %v", err))
		return fmt.Errorf("failed to create SSH client: %v", err)
	}
	defer sshClient.Close()
	e.logToDatabase(run.ID, "INFO", "SSH connection established")

	// Execute pre-backup commands
	e.logToDatabase(run.ID, "INFO", "Executing pre-backup commands")
	if err := e.executeCommands(sshClient, profile.Commands, "pre", run.ID); err != nil {
		e.logToDatabase(run.ID, "ERROR", fmt.Sprintf("Pre-backup commands failed: %v", err))
		return fmt.Errorf("pre-backup commands failed: %v", err)
	}

	// Generate backup directory name using naming rule
	backupDirName := e.generateBackupName(profile)
	backupBasePath := StorageBasePath(profile.StorageLocation)
	backupDir := JoinStoragePath(profile.StorageLocation, backupBasePath, backupDirName)
	e.logToDatabase(run.ID, "INFO", fmt.Sprintf("Backup directory: %s", backupDir))

	storageBackend, err := NewStorageBackend(profile.StorageLocation)
	if err != nil {
		e.logToDatabase(run.ID, "ERROR", fmt.Sprintf("Failed to initialize storage backend: %v", err))
		return fmt.Errorf("failed to initialize storage backend: %v", err)
	}
	defer storageBackend.Close()

	// Create backup directory
	if err := storageBackend.EnsureDir(backupDir); err != nil {
		e.logToDatabase(run.ID, "ERROR", fmt.Sprintf("Failed to create backup directory: %v", err))
		return fmt.Errorf("failed to create backup directory: %v", err)
	}
	if storageBackend.IsLocal() {
		absBackupDir, absErr := filepath.Abs(backupDir)
		if absErr != nil {
			e.logToDatabase(run.ID, "ERROR", fmt.Sprintf("Failed to get absolute path of backup directory: %v", absErr))
		} else {
			e.logToDatabase(run.ID, "INFO", fmt.Sprintf("Absolute backup directory path: %s", absBackupDir))
		}
	}
	e.logToDatabase(run.ID, "INFO", "Backup directory created")
	run.LocalBackupPath = backupDir

	// Transfer files
	e.logToDatabase(run.ID, "INFO", fmt.Sprintf("Starting file transfer (%d rules)", len(profile.FileRules)))
	transferService := NewFileTransferService(sshClient, storageBackend, backupDir, run.ID)
	backupFiles, err := transferService.TransferFiles(profile.FileRules)
	if err != nil {
		e.logToDatabase(run.ID, "ERROR", fmt.Sprintf("File transfer failed: %v", err))
		return fmt.Errorf("file transfer failed: %v", err)
	}
	e.logToDatabase(run.ID, "INFO", fmt.Sprintf("File transfer completed: %d files", len(backupFiles)))

	// Save backup files to database
	for i := range backupFiles {
		backupFiles[i].BackupRunID = run.ID
		if err := DB.Create(&backupFiles[i]).Error; err != nil {
			log.Printf("Failed to save backup file record: %v", err)
		}
	}

	// Calculate total size
	var totalSize int64
	for _, file := range backupFiles {
		totalSize += file.SizeBytes
	}
	run.TotalSizeBytes = totalSize
	run.TotalFiles = len(backupFiles)
	e.logToDatabase(run.ID, "INFO", fmt.Sprintf("Total size: %.2f MB, Total files: %d", float64(totalSize)/1024/1024, len(backupFiles)))

	// Execute post-backup commands
	e.logToDatabase(run.ID, "INFO", "Executing post-backup commands")
	if err := e.executeCommands(sshClient, profile.Commands, "post", run.ID); err != nil {
		e.logToDatabase(run.ID, "ERROR", fmt.Sprintf("Post-backup commands failed: %v", err))
		return fmt.Errorf("post-backup commands failed: %v", err)
	}

	return nil
}

// executeCommands executes commands in order for a specific stage (pre/post)
func (e *BackupExecutor) executeCommands(sshClient *SSHClient, commands []entity.Command, stage string, runID uint) error {
	// Filter commands by stage
	var stageCommands []entity.Command
	for _, cmd := range commands {
		if cmd.RunStage == stage {
			stageCommands = append(stageCommands, cmd)
		}
	}

	// Sort by run_order
	sort.Slice(stageCommands, func(i, j int) bool {
		return stageCommands[i].RunOrder < stageCommands[j].RunOrder
	})

	// Execute commands in order
	for _, cmd := range stageCommands {
		workDir := cmd.WorkingDirectory
		if workDir == "" {
			workDir = "/"
		}
		e.logToDatabase(runID, "INFO", fmt.Sprintf("Executing %s command in %s: %s", stage, workDir, cmd.Command))
		output, err := sshClient.RunCommandInDir(cmd.Command, workDir)
		if err != nil {
			e.logToDatabase(runID, "ERROR", fmt.Sprintf("Command failed: %s, error: %v", cmd.Command, err))
			return fmt.Errorf("command '%s' failed: %v, output: %s", cmd.Command, err, output)
		}
		if output != "" {
			e.logToDatabase(runID, "DEBUG", fmt.Sprintf("Command output: %s", output))
		}
	}

	return nil
}

// generateBackupName generates a backup directory name using the naming rule
func (e *BackupExecutor) generateBackupName(profile *entity.BackupProfile) string {
	return translatePattern(
		profile.NamingRule.Pattern,
		profile.Server.Name,
		profile.Server.Host,
		profile.Name,
	)
}
