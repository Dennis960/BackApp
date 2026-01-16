package controller

import (
	"backapp-server/config"

	"github.com/gin-gonic/gin"
)

// SetupRouter registers all HTTP routes for the application using gin.
func SetupRouter(r *gin.Engine) {
	// Static files are now served via embedded FS in main.go

	// v1 REST API endpoints
	// Health endpoint (root level) for Docker healthcheck
	r.GET("/health", handleHealth)

	api := r.Group("/api/v1")
	{
		// Health endpoint under API as well
		api.GET("/health", handleHealth)
		api.GET("/servers", handleServersList)
		api.POST("/servers", handleServersCreate)
		api.GET("/servers/:id", handleServerGet)
		api.PUT("/servers/:id", handleServerUpdate)
		api.DELETE("/servers/:id", handleServerDelete)
		api.GET("/servers/:id/deletion-impact", handleServerDeletionImpact)
		api.POST("/servers/:id/test-connection", handleServerTestConnection)
		api.GET("/servers/:id/files", handleServerListFiles)

		api.GET("/storage-locations", handleStorageLocationsList)
		api.POST("/storage-locations", handleStorageLocationsCreate)
		api.PUT("/storage-locations/:id", handleStorageLocationUpdate)
		api.DELETE("/storage-locations/:id", handleStorageLocationDelete)
		api.GET("/storage-locations/:id/move-impact", handleStorageLocationMoveImpact)
		api.GET("/storage-locations/:id/deletion-impact", handleStorageLocationDeletionImpact)
		api.POST("/storage-locations/:id/test-connection", handleStorageLocationTestConnection)
		api.GET("/local-files", handleLocalFilesList)

		api.GET("/naming-rules", handleNamingRulesList)
		api.POST("/naming-rules", handleNamingRulesCreate)
		api.POST("/naming-rules/translate", handleNamingRuleTranslate)
		api.PUT("/naming-rules/:id", handleNamingRuleUpdate)
		api.DELETE("/naming-rules/:id", handleNamingRuleDelete)

		api.GET("/backup-profiles", handleBackupProfilesList)
		api.POST("/backup-profiles", handleBackupProfilesCreate)
		api.GET("/backup-profiles/:id", handleBackupProfileGet)
		api.PUT("/backup-profiles/:id", handleBackupProfileUpdate)
		api.DELETE("/backup-profiles/:id", handleBackupProfileDelete)
		api.POST("/backup-profiles/:id/duplicate", handleBackupProfileDuplicate)
		api.GET("/backup-profiles/:id/commands", handleBackupProfileCommandsList)
		api.POST("/backup-profiles/:id/commands", handleBackupProfileCommandsCreate)
		api.GET("/backup-profiles/:id/file-rules", handleBackupProfileFileRulesList)
		api.POST("/backup-profiles/:id/file-rules", handleBackupProfileFileRulesCreate)
		api.POST("/backup-profiles/:id/run", handleBackupProfileRun)
		api.POST("/backup-profiles/:id/execute", handleBackupProfileExecute)
		api.POST("/backup-profiles/:id/dry-run", handleBackupProfileDryRun)

		api.PUT("/commands/:id", handleCommandUpdate)
		api.DELETE("/commands/:id", handleCommandDelete)

		api.PUT("/file-rules/:id", handleFileRuleUpdate)
		api.DELETE("/file-rules/:id", handleFileRuleDelete)

		api.GET("/backup-runs", handleBackupRunsList)
		api.GET("/backup-runs/:id", handleBackupRunGet)
		api.GET("/backup-runs/:id/files", handleBackupRunFiles)
		api.GET("/backup-runs/:id/logs", handleBackupRunLogs)
		api.GET("/backup-runs/:id/deletion-impact", handleBackupRunDeletionImpact)
		api.DELETE("/backup-runs/:id", handleBackupRunDelete)
		api.GET("/backup-files/:fileId", handleBackupFileGet)
		api.GET("/backup-files/:fileId/download", handleBackupFileDownload)
		api.DELETE("/backup-files/:fileId", handleBackupFileDelete)

		// Push notifications
		api.GET("/notifications/vapid-key", handleGetVAPIDPublicKey)
		api.POST("/notifications/subscribe", handleSubscribePush)
		api.POST("/notifications/unsubscribe", handleUnsubscribePush)
		api.GET("/notifications/subscription", handleGetSubscription)
		api.GET("/notifications/preferences", handleGetNotificationPreferences)
		api.POST("/notifications/preferences", handleCreateNotificationPreference)
		api.PUT("/notifications/preferences/:id", handleUpdateNotificationPreference)
		api.DELETE("/notifications/preferences/:id", handleDeleteNotificationPreference)
		api.POST("/notifications/test", handleSendTestNotification)

		// Storage usage
		api.GET("/storage-usage", handleGetStorageUsage)
		api.GET("/storage-locations/:id/usage", handleGetStorageLocationUsage)

		// Test-only endpoints
		if config.TestMode {
			api.POST("/test/reset-database", handleResetDatabase)
			api.POST("/test/trigger-retention-cleanup", handleTriggerRetentionCleanup)
			api.PUT("/test/backup-runs/:id/date", handleUpdateBackupRunDate)
		}
	}
}
