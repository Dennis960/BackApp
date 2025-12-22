package controller

import (
	"net/http"

	"backapp-server/service"

	"github.com/gin-gonic/gin"
)

func handleTemplatesList(c *gin.Context) {
	items, err := service.ListTemplates()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, items)
}

func handleTemplateGet(c *gin.Context) {
	id := c.Param("id")
	data, err := service.GetTemplate(id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "template not found"})
		return
	}
	c.Data(http.StatusOK, "application/json", data)
}
