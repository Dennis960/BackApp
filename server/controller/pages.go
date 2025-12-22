package controller

import (
	"path/filepath"

	"github.com/gin-gonic/gin"
)

var staticDir string

// SetupPageRoutes registers HTML page routes
func SetupPageRoutes(r *gin.RouterGroup, staticPath string) {
	staticDir = staticPath

	r.GET("/dashboard", servePage("dashboard.html"))
	r.GET("/servers", servePage("servers.html"))
	r.GET("/backup-profiles", servePage("backup-profiles.html"))
	r.GET("/backup-runs", servePage("backup-runs.html"))
	r.GET("/storage-locations", servePage("storage-locations.html"))
	r.GET("/naming-rules", servePage("naming-rules.html"))
}

// servePage returns a handler that serves an HTML file from the pages directory
func servePage(filename string) gin.HandlerFunc {
	return func(c *gin.Context) {
		pagePath := filepath.Join(staticDir, "pages", filename)
		c.File(pagePath)
	}
}
