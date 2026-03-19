package service

import (
	"fmt"
	"log"
	"path"
	"path/filepath"
	"strings"
	"time"

	"backapp-server/entity"
)

// FileTransferService handles file transfers with include/exclude rules
type FileTransferService struct {
	sshClient      *SSHClient
	storageBackend StorageBackend
	destDir        string
	runID          uint
}

// NewFileTransferService creates a new file transfer service
func NewFileTransferService(sshClient *SSHClient, storageBackend StorageBackend, destDir string, runID uint) *FileTransferService {
	return &FileTransferService{
		sshClient:      sshClient,
		storageBackend: storageBackend,
		destDir:        destDir,
		runID:          runID,
	}
}

// logToDatabase writes a log entry to the database
func (s *FileTransferService) logToDatabase(level, message string) {
	logEntry := &entity.BackupRunLog{
		BackupRunID: s.runID,
		Timestamp:   time.Now(),
		Level:       level,
		Message:     message,
	}
	if err := DB.Create(logEntry).Error; err != nil {
		log.Printf("Failed to save log to database: %v", err)
	}
}

// TransferFiles transfers files according to file rules
func (s *FileTransferService) TransferFiles(fileRules []entity.FileRule) ([]entity.BackupFile, error) {
	var backupFiles []entity.BackupFile

	// Ensure destination directory exists
	if err := s.storageBackend.EnsureDir(s.destDir); err != nil {
		s.logToDatabase("ERROR", fmt.Sprintf("Failed to create destination directory: %v", err))
		return nil, fmt.Errorf("failed to create destination directory: %v", err)
	}

	for i, rule := range fileRules {
		s.logToDatabase("INFO", fmt.Sprintf("Processing rule %d/%d: %s", i+1, len(fileRules), rule.RemotePath))
		files, err := s.transferFileRule(rule)
		if err != nil {
			s.logToDatabase("ERROR", fmt.Sprintf("Failed to transfer files for rule %d: %v", rule.ID, err))
			return nil, fmt.Errorf("failed to transfer files for rule %d: %v", rule.ID, err)
		}
		s.logToDatabase("INFO", fmt.Sprintf("Rule %d complete: transferred %d files", i+1, len(files)))
		backupFiles = append(backupFiles, files...)
	}

	return backupFiles, nil
}

// transferFileRule transfers files for a single file rule
func (s *FileTransferService) transferFileRule(rule entity.FileRule) ([]entity.BackupFile, error) {
	s.logToDatabase("DEBUG", fmt.Sprintf("Checking remote path: %s", rule.RemotePath))
	// Check if remote path exists and is a file or directory
	checkCmd := fmt.Sprintf("test -e '%s' && echo exists || echo notfound", rule.RemotePath)
	output, err := s.sshClient.RunCommand(checkCmd)
	if err != nil || strings.TrimSpace(output) != "exists" {
		s.logToDatabase("ERROR", fmt.Sprintf("Remote path does not exist: %s", rule.RemotePath))
		return nil, fmt.Errorf("remote path does not exist: %s", rule.RemotePath)
	}

	// Check if it's a directory
	isDirCmd := fmt.Sprintf("test -d '%s' && echo yes || echo no", rule.RemotePath)
	isDirOutput, err := s.sshClient.RunCommand(isDirCmd)
	if err != nil {
		return nil, fmt.Errorf("failed to check if path is directory: %v", err)
	}

	isDir := strings.TrimSpace(isDirOutput) == "yes"

	if isDir {
				if rule.Recursive {
			return s.transferDirectory(rule)
		}
		// Non-recursive directory transfer
		return s.transferDirectoryShallow(rule)
	}

	// Single file transfer
	return s.transferSingleFile(rule)
}

// transferSingleFile transfers a single file
func (s *FileTransferService) transferSingleFile(rule entity.FileRule) ([]entity.BackupFile, error) {
	fileName := filepath.Base(rule.RemotePath)
	localPath := s.joinDestPath(fileName)

	s.logToDatabase("DEBUG", fmt.Sprintf("Transferring file: %s", rule.RemotePath))
	// Get file size
	sizeCmd := fmt.Sprintf("stat -c%%s '%s' 2>/dev/null || stat -f%%z '%s'", rule.RemotePath, rule.RemotePath)
	sizeOutput, err := s.sshClient.RunCommand(sizeCmd)
	if err != nil {
		s.logToDatabase("ERROR", fmt.Sprintf("Failed to get file size for %s: %v", rule.RemotePath, err))
		return nil, fmt.Errorf("failed to get file size: %v", err)
	}

	var fileSize int64
	fmt.Sscanf(strings.TrimSpace(sizeOutput), "%d", &fileSize)

	// Download file
	if err := s.copyRemoteFile(rule.RemotePath, localPath); err != nil {
		s.logToDatabase("ERROR", fmt.Sprintf("Failed to copy file %s: %v", rule.RemotePath, err))
		return nil, fmt.Errorf("failed to copy file: %v", err)
	}
	s.logToDatabase("DEBUG", fmt.Sprintf("File transferred successfully: %s (%.2f KB)", fileName, float64(fileSize)/1024))

	backupFile := entity.BackupFile{
		RemotePath: rule.RemotePath,
		LocalPath:  localPath,
		SizeBytes:  fileSize,
		FileSize:   fileSize,
		FileRuleID: rule.ID,
	}

	return []entity.BackupFile{backupFile}, nil
}

// transferDirectoryShallow transfers only files in the directory (non-recursive)
func (s *FileTransferService) transferDirectoryShallow(rule entity.FileRule) ([]entity.BackupFile, error) {
	// List files in directory (non-recursive)
	listCmd := fmt.Sprintf("find '%s' -maxdepth 1 -type f", rule.RemotePath)
	output, err := s.sshClient.RunCommand(listCmd)
	if err != nil {
		return nil, fmt.Errorf("failed to list files: %v", err)
	}

	files := strings.Split(strings.TrimSpace(output), "\n")
	var backupFiles []entity.BackupFile

	for _, file := range files {
		file = strings.TrimSpace(file)
		if file == "" {
			continue
		}

		if s.shouldExclude(file, rule.ExcludePattern) {
			continue
		}

		// Create a temporary rule for this single file
		singleFileRule := entity.FileRule{
			ID:         rule.ID,
			RemotePath: file,
		}

		transferred, err := s.transferSingleFile(singleFileRule)
		if err != nil {
			return nil, fmt.Errorf("failed to transfer file %s: %v", file, err)
		}

		backupFiles = append(backupFiles, transferred...)
	}

	return backupFiles, nil
}

// transferDirectory transfers a directory recursively
func (s *FileTransferService) transferDirectory(rule entity.FileRule) ([]entity.BackupFile, error) {
	s.logToDatabase("INFO", fmt.Sprintf("Listing files in directory: %s", rule.RemotePath))
	// Build find command with exclude pattern if provided
	findCmd := fmt.Sprintf("find '%s' -type f", rule.RemotePath)

	output, err := s.sshClient.RunCommand(findCmd)
	if err != nil {
		s.logToDatabase("ERROR", fmt.Sprintf("Failed to list files in %s: %v", rule.RemotePath, err))
		return nil, fmt.Errorf("failed to list files: %v", err)
	}

	files := strings.Split(strings.TrimSpace(output), "\n")
	s.logToDatabase("INFO", fmt.Sprintf("Found %d files to transfer", len(files)))
	var backupFiles []entity.BackupFile

	for _, file := range files {
		file = strings.TrimSpace(file)
		if file == "" {
			continue
		}

		if s.shouldExclude(file, rule.ExcludePattern) {
			continue
		}

		// Preserve directory structure
		relPath := strings.TrimPrefix(file, rule.RemotePath)
		relPath = strings.TrimPrefix(relPath, "/")
		localPath := s.joinDestPath(relPath)

		// Create parent directory
		if err := s.storageBackend.EnsureDir(s.destDirForPath(localPath)); err != nil {
			return nil, fmt.Errorf("failed to create directory: %v", err)
		}

		// Get file size
		sizeCmd := fmt.Sprintf("stat -c%%s '%s' 2>/dev/null || stat -f%%z '%s'", file, file)
		sizeOutput, err := s.sshClient.RunCommand(sizeCmd)
		if err != nil {
			continue // Skip files that can't be stat'd
		}

		var fileSize int64
		fmt.Sscanf(strings.TrimSpace(sizeOutput), "%d", &fileSize)

		// Download file
		if err := s.copyRemoteFile(file, localPath); err != nil {
			return nil, fmt.Errorf("failed to copy file %s: %v", file, err)
		}

		backupFile := entity.BackupFile{
			RemotePath: file,
			LocalPath:  localPath,
			SizeBytes:  fileSize,
			FileSize:   fileSize,
			FileRuleID: rule.ID,
		}

		backupFiles = append(backupFiles, backupFile)
	}

	return backupFiles, nil
}

// shouldExclude checks if a file should be excluded based on the pattern
func (s *FileTransferService) shouldExclude(filePath, excludePattern string) bool {
	if excludePattern == "" {
		return false
	}

	// Simple pattern matching - supports wildcards
	patterns := strings.Split(excludePattern, ",")
	for _, pattern := range patterns {
		pattern = strings.TrimSpace(pattern)
		if pattern == "" {
			continue
		}

		// Simple wildcard matching
		matched, err := filepath.Match(pattern, filepath.Base(filePath))
		if err == nil && matched {
			return true
		}

		// Check if pattern is in the path
		if strings.Contains(filePath, pattern) {
			return true
		}
	}

	return false
}

func (s *FileTransferService) joinDestPath(relPath string) string {
	if s.storageBackend.IsLocal() {
		return filepath.Join(s.destDir, relPath)
	}
	return path.Join(s.destDir, relPath)
}

func (s *FileTransferService) destDirForPath(filePath string) string {
	if s.storageBackend.IsLocal() {
		return filepath.Dir(filePath)
	}
	return path.Dir(filePath)
}

func (s *FileTransferService) copyRemoteFile(remotePath, destPath string) error {
	if s.storageBackend.IsLocal() {
		return s.sshClient.CopyFileFromRemote(remotePath, destPath)
	}
	writer, err := s.storageBackend.OpenWriter(destPath)
	if err != nil {
		return err
	}
	defer writer.Close()
	return s.sshClient.CopyFileFromRemoteToWriter(remotePath, writer)
}

func (s *FileTransferService) getRemoteFileSize(remotePath string) (int64, error) {
	sizeCmd := fmt.Sprintf("stat -c%%s '%s' 2>/dev/null || stat -f%%z '%s'", remotePath, remotePath)
	sizeOutput, err := s.sshClient.RunCommand(sizeCmd)
	if err != nil {
		return 0, err
	}

	var fileSize int64
	fmt.Sscanf(strings.TrimSpace(sizeOutput), "%d", &fileSize)
	return fileSize, nil
}

func (s *FileTransferService) buildFileListCommand(parentDir, baseName, listFile string) string {
	cmd := fmt.Sprintf(
		"cd %s && find %s -xdev -print > %s 2> %s.err; cat %s.err; rm -f %s.err; if [ ! -s %s ]; then exit 1; fi; exit 0",
		shellQuote(parentDir),
		shellQuote(baseName),
		shellQuote(listFile),
		shellQuote(listFile),
		shellQuote(listFile),
		shellQuote(listFile),
		shellQuote(listFile),
	)
	return cmd
}

func formatCommandFailure(err error, output string) string {
	if output != "" {
		return fmt.Sprintf("%v (%s)", err, output)
	}
	return err.Error()
}

func (s *FileTransferService) logPermissionIssues(tool, output string) {
	if output == "" {
		return
	}
	lines := strings.Split(output, "\n")
	for _, line := range lines {
		line = strings.TrimSpace(line)
		if line == "" {
			continue
		}
		lower := strings.ToLower(line)
		if strings.Contains(lower, "permission denied") ||
			strings.Contains(lower, "access is denied") ||
			strings.Contains(lower, "zugriff verweigert") ||
			strings.Contains(lower, "operation not permitted") ||
			strings.Contains(lower, "errno=13") ||
			strings.Contains(lower, "eacces") {
			s.logToDatabase("ERROR", fmt.Sprintf("%s permission error: %s", tool, line))
		}
	}
}

func shellQuote(value string) string {
	if value == "" {
		return "''"
	}
	return "'" + strings.ReplaceAll(value, "'", "'\"'\"'") + "'"
}
