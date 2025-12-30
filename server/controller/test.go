package controller

import (
	"net/http"

	"backapp-server/service"

	"github.com/gin-gonic/gin"
)

func handleResetDatabase(c *gin.Context) {
	service.ResetDatabase()
	c.JSON(http.StatusOK, gin.H{"status": "database reset"})
}
