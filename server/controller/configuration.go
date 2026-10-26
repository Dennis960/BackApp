package controller

import (
	"encoding/json"
	"net/http"

	"backapp-server/service"

	"github.com/gin-gonic/gin"
)

type configurationImportRequest struct {
	Configuration service.ConfigurationExport     `json:"configuration"`
	Mode          service.ConfigurationImportMode `json:"mode"`
}

func handleConfigurationExport(c *gin.Context) {
	configuration, err := service.ServiceExportConfiguration()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.Header("Content-Disposition", `attachment; filename="backapp-configuration.json"`)
	c.Header("Content-Type", "application/json")
	c.JSON(http.StatusOK, configuration)
}

func handleConfigurationImport(c *gin.Context) {
	var request configurationImportRequest
	if err := json.NewDecoder(c.Request.Body).Decode(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid configuration JSON"})
		return
	}

	result, err := service.ServiceImportConfiguration(&request.Configuration, request.Mode)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, result)
}

func handleConfigurationImportImpact(c *gin.Context) {
	var request configurationImportRequest
	if err := json.NewDecoder(c.Request.Body).Decode(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid configuration JSON"})
		return
	}

	impact, err := service.ServiceGetConfigurationImportImpact(&request.Configuration, request.Mode)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, impact)
}
