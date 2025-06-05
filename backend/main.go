package main

import (
	"fmt"
	"log"
	"os"
	"strings"

	"zhlg/backend/api/routes"
	"zhlg/backend/db"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

func main() {
	// 初始化数据库连接
	db.Init()

	// Set Gin mode based on environment
	mode := os.Getenv("GIN_MODE")
	if mode == "" {
		mode = gin.DebugMode
	}
	gin.SetMode(mode)

	// Initialize Gin router
	r := gin.Default()

	// Get allowed origins from environment or use default values
	allowedOriginsEnv := os.Getenv("ALLOWED_ORIGINS")
	var allowedOrigins []string

	if allowedOriginsEnv != "" {
		allowedOrigins = strings.Split(allowedOriginsEnv, ",")
		for i, origin := range allowedOrigins {
			allowedOrigins[i] = strings.TrimSpace(origin)
		}
	} else {
		// Default development origins
		allowedOrigins = []string{
			"http://47.99.147.94",
			"http://localhost:3000",
			"http://127.0.0.1:3000",
			"http://localhost:3001",
			"http://127.0.0.1:3001",
			"http://localhost:3002",
			"http://127.0.0.1:3002",
			"http://localhost:3003",
			"http://127.0.0.1:3003",
		}
	}

	// Configure CORS with appropriate settings
	r.Use(cors.New(cors.Config{
		AllowOrigins:     allowedOrigins,
		AllowMethods:     []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Content-Length", "Accept-Encoding", "X-CSRF-Token", "Authorization", "Accept", "Cache-Control", "X-Requested-With"},
		ExposeHeaders:    []string{"Content-Length", "Content-Type", "Authorization"},
		AllowCredentials: true,
		MaxAge:           86400, // 24 hours
	}))

	// Log configured origins
	log.Printf("CORS configured with allowed origins: %v", allowedOrigins)

	// Set API routes
	routes.SetupRoutes(r)

	// Get server port from environment or use default
	port := os.Getenv("SERVER_PORT")
	if port == "" {
		port = "8080"
	}

	// Start server
	fmt.Printf("Server running in %s mode on port %s\n", mode, port)
	if err := r.Run(":" + port); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}
