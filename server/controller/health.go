package controller

import (
	"net/http"

	"backapp-server/service"

	"github.com/gin-gonic/gin"
)

// handleHealth provides a simple health endpoint and DB connectivity check
func handleHealth(c *gin.Context) {
	if service.DB == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"status": "unhealthy", "error": "db not initialized"})
		return
	}

	if err := service.DB.Exec("SELECT 1").Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"status": "unhealthy", "error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"status": "ok"})
}
