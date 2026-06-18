package controller

import (
	"archive/zip"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"

	"backapp-server/service"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// ---- v1: Backup Runs ----

func handleBackupRunsList(c *gin.Context) {
	var profileFilter *int
	if profileIDStr := c.Query("profile_id"); profileIDStr != "" {
		if profileID, err := strconv.Atoi(profileIDStr); err == nil {
			profileFilter = &profileID
		}
	}
	status := c.Query("status")
	runs, err := service.ServiceListBackupRuns(profileFilter, status)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, runs)
}

func handleBackupRunGet(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}
	run, err := service.ServiceGetBackupRun(uint(id))
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "backup run not found"})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		}
		return
	}
	c.JSON(http.StatusOK, run)
}

func handleBackupRunFiles(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}
	files, err := service.ServiceListBackupFilesForRun(uint(id))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, files)
}

func handleBackupRunDownloadZip(c *gin.Context) {
	runID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}

	files, err := service.ServiceListBackupFilesForRun(uint(runID))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	type zipSource struct {
		file   *os.File
		header *zip.FileHeader
	}

	sources := make([]zipSource, 0, len(files))
	for _, file := range files {
		if file.Deleted || file.LocalPath == "" {
			continue
		}

		stat, err := os.Stat(file.LocalPath)
		if err != nil {
			continue
		}

		openedFile, err := os.Open(file.LocalPath)
		if err != nil {
			continue
		}

		header, err := zip.FileInfoHeader(stat)
		if err != nil {
			_ = openedFile.Close()
			continue
		}
		header.Method = zip.Deflate
		header.Name = zipEntryName(uint(runID), file.RemotePath, file.LocalPath)

		sources = append(sources, zipSource{file: openedFile, header: header})
	}

	if len(sources) == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "no downloadable files found for this run"})
		return
	}
	defer func() {
		for _, source := range sources {
			_ = source.file.Close()
		}
	}()

	zipName := fmt.Sprintf("backup-run-%d.zip", runID)
	c.Header("Content-Type", "application/zip")
	c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=%q", zipName))
	c.Header("Content-Transfer-Encoding", "binary")
	c.Status(http.StatusOK)

	zipWriter := zip.NewWriter(c.Writer)
	for _, source := range sources {
		writer, err := zipWriter.CreateHeader(source.header)
		if err != nil {
			continue
		}
		if _, err := source.file.Seek(0, 0); err != nil {
			continue
		}
		if _, err := io.Copy(writer, source.file); err != nil {
			continue
		}
	}
	_ = zipWriter.Close()
}

func zipEntryName(runID uint, remotePath, localPath string) string {
	name := strings.TrimSpace(remotePath)
	if name == "" {
		name = strings.TrimSpace(localPath)
	}
	name = filepath.ToSlash(name)
	name = strings.TrimPrefix(name, "/")
	name = strings.TrimPrefix(name, "./")
	for strings.HasPrefix(name, "../") {
		name = strings.TrimPrefix(name, "../")
	}
	if name == "" || name == "." || name == ".." {
		name = fmt.Sprintf("file-%d", runID)
	}
	return fmt.Sprintf("backup-run-%d/%s", runID, name)
}

func handleBackupRunLogs(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}
	logs, err := service.ServiceGetBackupRunLogs(uint(id))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, logs)
}

func handleBackupRunDeletionImpact(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}

	impact, err := service.ServiceGetBackupRunDeletionImpact(uint(id))
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "backup run not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, impact)
}

func handleBackupRunDelete(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}

	if err := service.ServiceDeleteBackupRun(uint(id)); err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "backup run not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.Status(http.StatusOK)
}

func handleBackupFileDownload(c *gin.Context) {
	fileID, err := strconv.ParseUint(c.Param("fileId"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid file id"})
		return
	}

	file, err := service.ServiceGetBackupFile(uint(fileID))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "file not found"})
		return
	}

	// Check if file is marked as deleted
	if file.Deleted {
		c.JSON(http.StatusGone, gin.H{"error": "file has been deleted", "deleted": true})
		return
	}

	// Check if file exists on disk
	if _, err := os.Stat(file.LocalPath); os.IsNotExist(err) {
		c.JSON(http.StatusNotFound, gin.H{"error": "file not found on disk"})
		return
	}

	// Serve the file for download
	c.FileAttachment(file.LocalPath, filepath.Base(file.RemotePath))
}

func handleBackupFileDelete(c *gin.Context) {
	fileID, err := strconv.ParseUint(c.Param("fileId"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid file id"})
		return
	}

	if err := service.ServiceDeleteBackupFile(uint(fileID)); err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "file not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.Status(http.StatusOK)
}

func handleBackupFileGet(c *gin.Context) {
	fileID, err := strconv.ParseUint(c.Param("fileId"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid file id"})
		return
	}

	file, err := service.ServiceGetBackupFile(uint(fileID))
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "file not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, file)
}
