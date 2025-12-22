package controller

import (
	"io"
	"net/http"
	"strconv"
	"strings"

	"backapp-server/entity"
	"backapp-server/service"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// ---- v1: Servers ----

func handleServersList(c *gin.Context) {
	servers, err := service.ServiceListServers()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, servers)
}

func handleServersCreate(c *gin.Context) {
	ct := c.GetHeader("Content-Type")
	if strings.HasPrefix(ct, "multipart/form-data") {
		// Handle browser form uploads with either SSH key file or password
		if err := c.Request.ParseMultipartForm(10 << 20); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "failed to parse multipart form"})
			return
		}
		name := c.PostForm("name")
		host := c.PostForm("host")
		username := c.PostForm("username")
		portStr := c.PostForm("port")
		authType := c.PostForm("auth_type")
		password := c.PostForm("password")
		if name == "" || host == "" || username == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "missing required fields"})
			return
		}
		port := 22
		if portStr != "" {
			if p, err := strconv.Atoi(portStr); err == nil {
				port = p
			}
		}
		if authType == "password" {
			if password == "" {
				c.JSON(http.StatusBadRequest, gin.H{"error": "password is required for password auth"})
				return
			}
			// Optionally: test password SSH connection here if desired
			server := &entity.Server{
				Name:     name,
				Host:     host,
				Port:     port,
				Username: username,
				AuthType: "password",
				Password: password,
			}
			if err := service.DB.Create(server).Error; err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
				return
			}
			c.JSON(http.StatusCreated, server)
			return
		}
		// Default to keyfile auth
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
		// Test the SSH connection before storing
		if err := service.TestSSHConnection(host, username, string(keyContent)); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "SSH connection test failed: " + err.Error()})
			return
		}
		server, err := service.ServiceCreateServerWithKey(name, host, port, username, keyContent)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusCreated, server)
		return
	}

	// JSON body for API clients
	var input entity.Server
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid JSON body"})
		return
	}
	if input.Name == "" || input.Host == "" || input.Username == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "missing required fields"})
		return
	}
	server, err := service.ServiceCreateServerFromJSON(&input)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, server)
}

func handleServerGet(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}
	server, err := service.ServiceGetServer(uint(id))
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "server not found"})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		}
		return
	}
	c.JSON(http.StatusOK, server)
}

func handleServerUpdate(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}
	var input entity.Server
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid JSON body"})
		return
	}
	updated, err := service.ServiceUpdateServer(uint(id), &input)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, updated)
}

func handleServerDelete(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}
	if err := service.ServiceDeleteServer(uint(id)); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.Status(http.StatusOK)
}

func handleServerTestConnection(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}
	server, err := service.GetServerByID(uint(id))
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "server not found"})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		}
		return
	}
	if err := service.TestSSHConnectionUsingServer(server); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": err.Error(),
		})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "SSH connection successful",
	})
}

func handleServerListFiles(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}
	path := c.Query("path")
	if path == "" {
		path = "/home"
	}

	entries, err := service.ServiceListServerFiles(uint(id), path)
	if err != nil {
		// Return a more user-friendly error with an empty list
		c.JSON(http.StatusOK, gin.H{
			"entries": []interface{}{},
			"error":   err.Error(),
		})
		return
	}
	c.JSON(http.StatusOK, entries)
}
