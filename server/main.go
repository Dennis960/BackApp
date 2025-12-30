package main

import (
	"embed"
	"flag"
	"fmt"
	"io/fs"
	"log"
	"net/http"

	"backapp-server/config"
	"backapp-server/controller"
	"backapp-server/service"

	"github.com/gin-gonic/gin"
)

// CORSMiddleware handles Cross-Origin Resource Sharing (CORS)
func CORSMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
		c.Writer.Header().Set("Access-Control-Allow-Credentials", "true")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization, accept, origin, Cache-Control, X-Requested-With")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS, GET, PUT, DELETE")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}

		c.Next()
	}
}

//go:embed static/* static/**/*
var embeddedStaticFiles embed.FS

//go:embed templates/*
var embeddedTemplates embed.FS

func main() {
	// Parse command line flags
	port := flag.Int("port", 8080, "Port to run the server on")
	dbPath := flag.String("db", "./app.db", "SQLite database path")
	testMode := flag.Bool("test-mode", false, "Run in test mode with database reset endpoint")
	flag.Parse()
	config.TestMode = *testMode

	// Initialize database via service layer
	service.InitDB(*dbPath)

	// Initialize and load scheduled backups
	scheduler := service.GetScheduler()
	if err := scheduler.LoadAllSchedules(); err != nil {
		log.Printf("Warning: Failed to load backup schedules: %v", err)
	}

	// Ensure templates directory and default templates (using embedded files)
	templatesFS, err := fs.Sub(embeddedTemplates, "templates")
	if err != nil {
		log.Printf("Warning: Failed to access embedded templates: %v", err)
	} else if err := service.EnsureTemplates(templatesFS); err != nil {
		log.Printf("Warning: Failed to initialize templates: %v", err)
	}

	// Create a filesystem for embedded static files
	staticFS, err := fs.Sub(embeddedStaticFiles, "static")
	if err != nil {
		log.Fatalf("Failed to create embedded static fs: %v", err)
	}

	// Initialize gin router and set up routes via controller package
	router := gin.Default()

	// Add CORS middleware to allow requests from React frontend
	router.Use(CORSMiddleware())

	// Set up API routes first
	controller.SetupRouter(router)

	// Serve static files from embedded filesystem (assets folder)
	assetsFS, err := fs.Sub(staticFS, "assets")
	if err != nil {
		log.Fatalf("Failed to create assets fs: %v", err)
	}
	router.StaticFS("/assets", http.FS(assetsFS))

	// Serve vite.svg and other root static files
	router.GET("/vite.svg", func(c *gin.Context) {
		data, err := staticFS.Open("vite.svg")
		if err != nil {
			c.String(http.StatusNotFound, "404 page not found")
			return
		}
		defer data.Close()
		c.DataFromReader(http.StatusOK, -1, "image/svg+xml", data, nil)
	})

	// Serve index.html for root and all non-API routes (SPA fallback)
	router.NoRoute(func(c *gin.Context) {
		// Serve index.html from embedded filesystem
		data, err := embeddedStaticFiles.ReadFile("static/index.html")
		if err != nil {
			c.String(http.StatusNotFound, "404 page not found")
			return
		}
		c.Data(http.StatusOK, "text/html; charset=utf-8", data)
	})

	addr := fmt.Sprintf(":%d", *port)
	log.Printf("Server starting on %s...\n", addr)

	if config.TestMode {
		log.Println("\033[41;37m[WARNING] Server is running in TEST MODE, this will enable test endpoints that do cause high security risks\033[0m")
	}
	if err := router.Run(addr); err != nil {
		log.Fatal(err)
	}
}
