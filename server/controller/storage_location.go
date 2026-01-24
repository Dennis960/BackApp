package controller

import (
	"encoding/json"
	"io"
	"net/http"
	"strconv"
	"strings"

	"backapp-server/entity"
	"backapp-server/service"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// ---- v1: Storage Locations ----

func handleStorageLocationsList(c *gin.Context) {
	locs, err := service.ServiceListStorageLocations()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, locs)
}

func handleStorageLocationsCreate(c *gin.Context) {
	ct := c.GetHeader("Content-Type")
	if strings.HasPrefix(ct, "multipart/form-data") {
		if err := c.Request.ParseMultipartForm(10 << 20); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "failed to parse multipart form"})
			return
		}
		name := c.PostForm("name")
		storageType := c.PostForm("type")
		basePath := c.PostForm("base_path")
		address := c.PostForm("address")
		remotePath := c.PostForm("remote_path")
		username := c.PostForm("username")
		authType := c.PostForm("auth_type")
		password := c.PostForm("password")
		port := 22
		if portStr := c.PostForm("port"); portStr != "" {
			if p, err := strconv.Atoi(portStr); err == nil {
				port = p
			}
		}

		if name == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "missing required fields"})
			return
		}
		if storageType == "" {
			storageType = "local"
		}

		if storageType == "local" {
			if basePath == "" {
				c.JSON(http.StatusBadRequest, gin.H{"error": "missing base_path for local storage"})
				return
			}
			loc := &entity.StorageLocation{
				Name:     name,
				Type:     storageType,
				BasePath: basePath,
			}
			created, err := service.ServiceCreateStorageLocation(loc)
			if err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
				return
			}
			c.JSON(http.StatusCreated, created)
			return
		}

		if storageType != "sftp" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "unsupported storage type"})
			return
		}
		if address == "" || remotePath == "" || username == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "missing required sftp fields"})
			return
		}

		location := &entity.StorageLocation{
			Name:       name,
			Type:       storageType,
			Address:    address,
			Port:       port,
			RemotePath: remotePath,
			Username:   username,
			AuthType:   authType,
		}

		if authType == "password" {
			if password == "" {
				c.JSON(http.StatusBadRequest, gin.H{"error": "password is required for password auth"})
				return
			}
			location.Password = password
		} else {
			file, _, err := c.Request.FormFile("keyfile")
			if err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": "missing or invalid keyfile"})
				return
			}
			defer file.Close()
			keyContent, err := io.ReadAll(file)
			if err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to read key file"})
				return
			}
			if len(keyContent) == 0 {
				c.JSON(http.StatusBadRequest, gin.H{"error": "key file is empty"})
				return
			}
			location.SSHKey = string(keyContent)
			location.AuthType = "key"
		}

		created, err := service.ServiceCreateStorageLocation(location)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusCreated, created)
		return
	}

	var input entity.StorageLocation
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid JSON body"})
		return
	}
	if input.Name == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "missing required fields"})
		return
	}
	storageType := service.NormalizeStorageType(&input)
	if storageType == "local" {
		if input.BasePath == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "missing base_path for local storage"})
			return
		}
	} else if storageType == "sftp" {
		if input.Address == "" || input.RemotePath == "" || input.Username == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "missing required sftp fields"})
			return
		}
		switch input.AuthType {
		case "password":
			if input.Password == "" {
				c.JSON(http.StatusBadRequest, gin.H{"error": "password is required for password auth"})
				return
			}
		case "key":
			if input.SSHKey == "" {
				c.JSON(http.StatusBadRequest, gin.H{"error": "ssh key is required for key auth"})
				return
			}
		default:
			if input.Password == "" && input.SSHKey == "" {
				c.JSON(http.StatusBadRequest, gin.H{"error": "missing sftp authentication"})
				return
			}
		}
	} else {
		c.JSON(http.StatusBadRequest, gin.H{"error": "unsupported storage type"})
		return
	}
	loc, err := service.ServiceCreateStorageLocation(&input)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, loc)
}

func handleStorageLocationUpdate(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}
	var input entity.StorageLocation
	rawBody, err := c.GetRawData()
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid JSON body"})
		return
	}
	if err := json.Unmarshal(rawBody, &input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid JSON body"})
		return
	}
	var rawMap map[string]interface{}
	if err := json.Unmarshal(rawBody, &rawMap); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid JSON body"})
		return
	}
	_, setEnabled := rawMap["enabled"]

	loc, err := service.ServiceUpdateStorageLocation(uint(id), &input, setEnabled)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "storage location not found"})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		}
		return
	}
	c.JSON(http.StatusOK, loc)
}

func handleStorageLocationMoveImpact(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}

	newPath := c.Query("new_path")
	if newPath == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "new_path query parameter required"})
		return
	}

	impact, err := service.ServiceGetStorageLocationMoveImpact(uint(id), newPath)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "storage location not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, impact)
}

func handleStorageLocationDeletionImpact(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}

	impact, err := service.ServiceGetStorageLocationDeletionImpact(uint(id))
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "storage location not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, impact)
}

func handleStorageLocationDelete(c *gin.Context) {
	id := c.Param("id")
	err := service.ServiceDeleteStorageLocation(id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "storage location deleted"})
}

func handleStorageLocationTestConnection(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}

	location, err := service.ServiceGetStorageLocation(uint(id))
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "storage location not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	if service.NormalizeStorageType(location) != "sftp" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "connection test is only supported for sftp storage"})
		return
	}

	if err := service.TestSFTPConnection(location); err != nil {
		c.JSON(http.StatusOK, gin.H{"success": false, "message": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "message": "connection successful"})
}
