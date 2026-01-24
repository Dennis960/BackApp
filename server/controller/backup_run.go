package controller

import (
	"net/http"
	"path/filepath"
	"strconv"

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

	location, err := service.GetStorageLocationForRun(file.BackupRunID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to resolve storage location"})
		return
	}
	backend, err := service.NewStorageBackend(location)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to open storage backend"})
		return
	}
	defer backend.Close()

	reader, err := backend.OpenReader(file.LocalPath)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "file not found on storage"})
		return
	}
	defer reader.Close()

	fileInfo, err := backend.Stat(file.LocalPath)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "file not found on storage"})
		return
	}

	c.DataFromReader(
		http.StatusOK,
		fileInfo.Size(),
		"application/octet-stream",
		reader,
		map[string]string{"Content-Disposition": "attachment; filename=" + filepath.Base(file.RemotePath)},
	)
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
