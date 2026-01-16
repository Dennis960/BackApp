package service

import (
	"fmt"
	"io"
	"log"
	"os"
	"os/exec"
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
		if rule.Compress {
			return s.transferDirectoryCompressed(rule)
		}
		if rule.Recursive {
			return s.transferDirectory(rule)
		}
		// Non-recursive directory transfer
		return s.transferDirectoryShallow(rule)
	}

	// Single file transfer
	if rule.Compress {
		return s.transferSingleFileCompressed(rule)
	}
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

// transferDirectoryCompressed archives a directory on the remote host and transfers the archive.
func (s *FileTransferService) transferDirectoryCompressed(rule entity.FileRule) ([]entity.BackupFile, error) {
	baseName := path.Base(rule.RemotePath)
	if baseName == "." || baseName == "/" || baseName == "" {
		return nil, fmt.Errorf("invalid directory path for compression: %s", rule.RemotePath)
	}
	if !s.storageBackend.IsLocal() {
		return s.transferDirectoryCompressedViaLocal(rule, baseName)
	}
	parentDir := path.Dir(rule.RemotePath)
	if parentDir == "." {
		parentDir = "/"
	}

	compressFormat := s.compressionFormat(rule.CompressFormat)
	archiveName := s.archiveName(compressFormat)
	localPath := s.joinDestPath(archiveName)

	tmpArchive := fmt.Sprintf("/tmp/backapp-%d-%d-%d.%s", s.runID, rule.ID, time.Now().UnixNano(), compressFormat)
	tmpList := fmt.Sprintf("/tmp/backapp-%d-%d-%d.list", s.runID, rule.ID, time.Now().UnixNano())
	listCmd := s.buildFileListCommand(parentDir, baseName, tmpList)
	var archiveCmd string
	if compressFormat == "zip" {
		archiveCmd = s.buildZipCommand(parentDir, tmpArchive, tmpList, rule.ExcludePattern)
	} else {
		archiveCmd = s.build7zCommand(parentDir, tmpArchive, tmpList, rule.ExcludePattern, rule.CompressPassword)
	}
	s.logToDatabase("INFO", fmt.Sprintf("Compressing directory with %s: %s", compressFormat, rule.RemotePath))
	if output, err := s.sshClient.RunCommand(listCmd); err != nil {
		listOutput := strings.TrimSpace(output)
		s.logPermissionIssues("find", listOutput)
		return nil, fmt.Errorf("failed to build file list: %v", err)
	}
	defer s.sshClient.RunCommand(fmt.Sprintf("rm -f %s", shellQuote(tmpList)))

	if output, err := s.sshClient.RunCommand(archiveCmd); err != nil {
		cmdOutput := strings.TrimSpace(output)
		s.logPermissionIssues(compressFormat, cmdOutput)
		cmdDetails := formatCommandFailure(err, cmdOutput)
		return nil, fmt.Errorf("failed to create %s archive: %s", compressFormat, cmdDetails)
	} else {
		cmdOutput := strings.TrimSpace(output)
		s.logPermissionIssues(compressFormat, cmdOutput)
		if strings.Contains(cmdOutput, "WARNING:") {
			s.logToDatabase("WARN", fmt.Sprintf("%s completed with warnings: %s", compressFormat, strings.TrimSpace(cmdOutput)))
		}
	}
	defer s.sshClient.RunCommand(fmt.Sprintf("rm -f %s", shellQuote(tmpArchive)))

	fileSize, _ := s.getRemoteFileSize(tmpArchive)
	if err := s.copyRemoteFile(tmpArchive, localPath); err != nil {
		return nil, fmt.Errorf("failed to copy archive: %v", err)
	}

	backupFile := entity.BackupFile{
		RemotePath: archiveName,
		LocalPath:  localPath,
		SizeBytes:  fileSize,
		FileSize:   fileSize,
		FileRuleID: rule.ID,
	}

	return []entity.BackupFile{backupFile}, nil
}

func (s *FileTransferService) transferSingleFileCompressed(rule entity.FileRule) ([]entity.BackupFile, error) {
	fileName := path.Base(rule.RemotePath)
	if fileName == "." || fileName == "/" || fileName == "" {
		return nil, fmt.Errorf("invalid file path for compression: %s", rule.RemotePath)
	}
	archiveFormat := s.compressionFormat(rule.CompressFormat)
	archiveName := s.archiveName(archiveFormat)
	localPath := s.joinDestPath(archiveName)

	if !s.storageBackend.IsLocal() {
		return s.transferSingleFileCompressedViaLocal(rule, fileName, archiveFormat, archiveName, localPath)
	}

	parentDir := path.Dir(rule.RemotePath)
	if parentDir == "." {
		parentDir = "/"
	}

	tmpArchive := fmt.Sprintf("/tmp/backapp-%d-%d-%d.%s", s.runID, rule.ID, time.Now().UnixNano(), archiveFormat)
	var archiveCmd string
	if archiveFormat == "zip" {
		archiveCmd = s.buildZipCommandForFile(parentDir, tmpArchive, fileName)
	} else {
		archiveCmd = s.build7zCommandForFile(parentDir, tmpArchive, fileName, rule.CompressPassword)
	}
	s.logToDatabase("INFO", fmt.Sprintf("Compressing file with %s: %s", archiveFormat, rule.RemotePath))
	if output, err := s.sshClient.RunCommand(archiveCmd); err != nil {
		cmdOutput := strings.TrimSpace(output)
		s.logPermissionIssues(archiveFormat, cmdOutput)
		cmdDetails := formatCommandFailure(err, cmdOutput)
		return nil, fmt.Errorf("failed to create %s archive: %s", archiveFormat, cmdDetails)
	}
	defer s.sshClient.RunCommand(fmt.Sprintf("rm -f %s", shellQuote(tmpArchive)))

	fileSize, _ := s.getRemoteFileSize(tmpArchive)
	if err := s.copyRemoteFile(tmpArchive, localPath); err != nil {
		return nil, fmt.Errorf("failed to copy archive: %v", err)
	}

	backupFile := entity.BackupFile{
		RemotePath: archiveName,
		LocalPath:  localPath,
		SizeBytes:  fileSize,
		FileSize:   fileSize,
		FileRuleID: rule.ID,
	}

	return []entity.BackupFile{backupFile}, nil
}

func (s *FileTransferService) transferSingleFileCompressedViaLocal(rule entity.FileRule, fileName, archiveFormat, archiveName, destPath string) ([]entity.BackupFile, error) {
	tmpRoot, err := os.MkdirTemp("", "backapp-archive-")
	if err != nil {
		return nil, fmt.Errorf("failed to create temp directory: %v", err)
	}
	defer os.RemoveAll(tmpRoot)

	localFile := filepath.Join(tmpRoot, fileName)
	if err := s.sshClient.CopyFileFromRemote(rule.RemotePath, localFile); err != nil {
		return nil, fmt.Errorf("failed to download file for compression: %v", err)
	}

	localArchive := filepath.Join(tmpRoot, archiveName)
	if archiveFormat == "zip" {
		if err := runLocalZipArchive(tmpRoot, fileName, localArchive, ""); err != nil {
			return nil, fmt.Errorf("failed to create zip archive locally: %v", err)
		}
	} else {
		if err := runLocal7zArchive(tmpRoot, fileName, localArchive, rule.CompressPassword); err != nil {
			return nil, fmt.Errorf("failed to create 7z archive locally: %v", err)
		}
	}

	fileInfo, err := os.Stat(localArchive)
	if err != nil {
		return nil, fmt.Errorf("failed to stat local archive: %v", err)
	}

	if err := s.copyLocalFileToStorage(localArchive, destPath); err != nil {
		return nil, fmt.Errorf("failed to upload archive: %v", err)
	}

	backupFile := entity.BackupFile{
		RemotePath: archiveName,
		LocalPath:  destPath,
		SizeBytes:  fileInfo.Size(),
		FileSize:   fileInfo.Size(),
		FileRuleID: rule.ID,
	}

	return []entity.BackupFile{backupFile}, nil
}
func (s *FileTransferService) transferDirectoryCompressedViaLocal(rule entity.FileRule, baseName string) ([]entity.BackupFile, error) {
	compressFormat := s.compressionFormat(rule.CompressFormat)
	archiveName := s.archiveName(compressFormat)
	destPath := s.joinDestPath(archiveName)

	tmpRoot, err := os.MkdirTemp("", "backapp-7z-")
	if err != nil {
		return nil, fmt.Errorf("failed to create temp directory: %v", err)
	}
	defer os.RemoveAll(tmpRoot)

	localDir := filepath.Join(tmpRoot, baseName)
	if err := os.MkdirAll(localDir, 0755); err != nil {
		return nil, fmt.Errorf("failed to create temp directory: %v", err)
	}

	s.logToDatabase("INFO", fmt.Sprintf("Downloading directory for local compression: %s", rule.RemotePath))
	tmpService := NewFileTransferService(s.sshClient, &localStorageBackend{}, localDir, s.runID)
	if _, err := tmpService.transferDirectory(rule); err != nil {
		return nil, fmt.Errorf("failed to download directory for compression: %v", err)
	}

	localArchive := filepath.Join(tmpRoot, archiveName)
	if compressFormat == "zip" {
		if err := runLocalZipArchive(tmpRoot, baseName, localArchive, rule.ExcludePattern); err != nil {
			return nil, fmt.Errorf("failed to create zip archive locally: %v", err)
		}
	} else {
		if err := runLocal7zArchive(tmpRoot, baseName, localArchive, rule.CompressPassword); err != nil {
			return nil, fmt.Errorf("failed to create 7z archive locally: %v", err)
		}
	}

	fileInfo, err := os.Stat(localArchive)
	if err != nil {
		return nil, fmt.Errorf("failed to stat local archive: %v", err)
	}

	if err := s.copyLocalFileToStorage(localArchive, destPath); err != nil {
		return nil, fmt.Errorf("failed to upload archive: %v", err)
	}

	backupFile := entity.BackupFile{
		RemotePath: archiveName,
		LocalPath:  destPath,
		SizeBytes:  fileInfo.Size(),
		FileSize:   fileInfo.Size(),
		FileRuleID: rule.ID,
	}

	return []entity.BackupFile{backupFile}, nil
}

func runLocal7zArchive(workDir, sourceName, archivePath, password string) error {
	args := []string{"a", "-t7z", "-mx=9"}
	if password != "" {
		args = append(args, "-mhe=on", "-p"+password)
	}
	args = append(args, archivePath, sourceName)

	cmd := exec.Command("7z", args...)
	cmd.Dir = workDir
	output, err := cmd.CombinedOutput()
	if err != nil {
		return fmt.Errorf("7z failed: %v (%s)", err, strings.TrimSpace(string(output)))
	}
	return nil
}

func (s *FileTransferService) copyLocalFileToStorage(localPath, destPath string) error {
	reader, err := os.Open(localPath)
	if err != nil {
		return err
	}
	defer reader.Close()

	writer, err := s.storageBackend.OpenWriter(destPath)
	if err != nil {
		return err
	}
	defer writer.Close()

	_, err = io.Copy(writer, reader)
	return err
}

func (s *FileTransferService) archiveName(format string) string {
	baseName := s.destDirBase()
	extension := "." + format
	if !strings.HasSuffix(baseName, extension) {
		baseName += extension
	}
	return baseName
}

func (s *FileTransferService) destDirBase() string {
	if s.storageBackend.IsLocal() {
		return filepath.Base(s.destDir)
	}
	return path.Base(s.destDir)
}

func (s *FileTransferService) compressionFormat(format string) string {
	value := strings.ToLower(strings.TrimSpace(format))
	if value == "zip" {
		return "zip"
	}
	return "7z"
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

func (s *FileTransferService) buildZipCommand(parentDir, tmpArchive, listFile, excludePattern string) string {
	excludeArgs := s.buildZipExcludeArgs(excludePattern)
	cmd := fmt.Sprintf("cd %s && zip -q -9 -@%s %s < %s",
		shellQuote(parentDir),
		excludeArgs,
		shellQuote(tmpArchive),
		shellQuote(listFile),
	)
	return cmd
}

func (s *FileTransferService) buildZipCommandForFile(parentDir, tmpArchive, fileName string) string {
	cmd := fmt.Sprintf("cd %s && zip -q -9 %s %s",
		shellQuote(parentDir),
		shellQuote(tmpArchive),
		shellQuote(fileName),
	)
	return cmd
}

func (s *FileTransferService) buildZipExcludeArgs(excludePattern string) string {
	if excludePattern == "" {
		return ""
	}
	patterns := strings.Split(excludePattern, ",")
	var parts []string
	for _, pattern := range patterns {
		pattern = strings.TrimSpace(pattern)
		if pattern == "" {
			continue
		}
		if strings.Contains(pattern, "/") {
			parts = append(parts, fmt.Sprintf(" -x %s", shellQuote(pattern)))
			continue
		}
		parts = append(parts, fmt.Sprintf(" -x %s", shellQuote(pattern)))
		parts = append(parts, fmt.Sprintf(" -x %s", shellQuote("*/"+pattern)))
	}
	return strings.Join(parts, "")
}

func (s *FileTransferService) build7zCommand(parentDir, tmpArchive, listFile, excludePattern, password string) string {
	excludeArgs := s.build7zExcludeArgs(excludePattern)
	passwordArgs := ""
	if password != "" {
		passwordArgs = fmt.Sprintf(" %s %s", shellQuote("-mhe=on"), shellQuote("-p"+password))
	}
	cmd := fmt.Sprintf("cd %s && 7z a -t7z -bd -y -snl -mx=9%s%s %s %s; rc=$?; if [ $rc -eq 1 ]; then exit 0; fi; exit $rc",
		shellQuote(parentDir),
		excludeArgs,
		passwordArgs,
		shellQuote(tmpArchive),
		shellQuote("@"+listFile),
	)
	return cmd
}

func (s *FileTransferService) build7zExcludeArgs(excludePattern string) string {
	if excludePattern == "" {
		return ""
	}
	patterns := strings.Split(excludePattern, ",")
	var parts []string
	for _, pattern := range patterns {
		pattern = strings.TrimSpace(pattern)
		if pattern == "" {
			continue
		}
		if strings.Contains(pattern, "/") {
			parts = append(parts, fmt.Sprintf(" %s", shellQuote("-xr!"+pattern)))
			continue
		}
		parts = append(parts, fmt.Sprintf(" %s", shellQuote("-xr!"+pattern)))
		parts = append(parts, fmt.Sprintf(" %s", shellQuote("-xr!*/"+pattern)))
	}
	return strings.Join(parts, "")
}

func (s *FileTransferService) build7zCommandForFile(parentDir, tmpArchive, fileName, password string) string {
	passwordArgs := ""
	if password != "" {
		passwordArgs = fmt.Sprintf(" %s %s", shellQuote("-mhe=on"), shellQuote("-p"+password))
	}
	cmd := fmt.Sprintf("cd %s && 7z a -t7z -bd -y -snl -mx=9%s %s %s; rc=$?; if [ $rc -eq 1 ]; then exit 0; fi; exit $rc",
		shellQuote(parentDir),
		passwordArgs,
		shellQuote(tmpArchive),
		shellQuote(fileName),
	)
	return cmd
}
func runLocalZipArchive(workDir, sourceName, archivePath, excludePattern string) error {
	args := []string{"-r", "-9", archivePath, sourceName}
	if excludePattern != "" {
		patterns := strings.Split(excludePattern, ",")
		for _, pattern := range patterns {
			pattern = strings.TrimSpace(pattern)
			if pattern == "" {
				continue
			}
			args = append(args, "-x", pattern)
			if !strings.Contains(pattern, "/") {
				args = append(args, "-x", "*/"+pattern)
			}
		}
	}
	cmd := exec.Command("zip", args...)
	cmd.Dir = workDir
	output, err := cmd.CombinedOutput()
	if err != nil {
		return fmt.Errorf("zip failed: %v (%s)", err, strings.TrimSpace(string(output)))
	}
	return nil
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
