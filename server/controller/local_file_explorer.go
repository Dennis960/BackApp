package controller

import (
	"net/http"

	"backapp-server/service"

	"github.com/gin-gonic/gin"
)

// handleLocalFilesList lists files and directories at a given local path
func handleLocalFilesList(c *gin.Context) {
	path := c.Query("path")
	if path == "" {
		path = "/"
	}

	entries, err := service.ServiceListLocalFiles(path)
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
