package controller

import (
	"net/http"
	"strconv"

	"backapp-server/entity"
	"backapp-server/service"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// ---- v1: Naming Rules ----

func handleNamingRulesList(c *gin.Context) {
	rules, err := service.ServiceListNamingRules()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, rules)
}

func handleNamingRulesCreate(c *gin.Context) {
	var input entity.NamingRule
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid JSON body"})
		return
	}
	if input.Name == "" || input.Pattern == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "missing required fields"})
		return
	}
	result, err := service.ServiceCreateNamingRule(&input)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, result)
}

func handleNamingRuleUpdate(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}
	var input entity.NamingRule
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid JSON body"})
		return
	}
	result, err := service.ServiceUpdateNamingRule(uint(id), &input)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "naming rule not found"})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		}
		return
	}
	c.JSON(http.StatusOK, result)
}

func handleNamingRuleDelete(c *gin.Context) {
	id := c.Param("id")
	err := service.ServiceDeleteNamingRule(id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "naming rule deleted"})
}

func handleNamingRuleTranslate(c *gin.Context) {
	var input struct {
		Pattern string `json:"pattern" binding:"required"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "pattern is required"})
		return
	}

	translated := service.ServiceTranslateNamingPattern(input.Pattern)
	c.JSON(http.StatusOK, gin.H{"result": translated})
}
