package routes

import (
	"zhlg/backend/api/handlers"
	"zhlg/backend/api/middlewares"

	"github.com/gin-gonic/gin"
)

// SetupRoutes configures all the API routes
func SetupRoutes(r *gin.Engine) {
	// API group with version
	api := r.Group("/api")

	// Authentication routes
	auth := api.Group("/auth")
	{
		auth.POST("/send-verification-code", handlers.SendVerificationCode)
		auth.POST("/register", handlers.Register)
		auth.POST("/login", handlers.Login)
		auth.POST("/logout", middlewares.AuthRequired(), handlers.Logout)
	}

	// User routes
	users := api.Group("/users")
	{
		users.GET("/profile", middlewares.AuthRequired(), handlers.GetUserProfile)
		users.PUT("/profile", middlewares.AuthRequired(), handlers.UpdateUserProfile)
		users.POST("/profile/avatar", middlewares.AuthRequired(), handlers.UploadAvatar)
	}

	// Task routes
	tasks := api.Group("/tasks")
	{
		tasks.GET("", handlers.GetTasks)
		tasks.POST("", middlewares.AuthRequired(), middlewares.EmployerRequired(), handlers.CreateTask)
		tasks.GET("/:uuid", handlers.GetTaskByUUID)
		tasks.POST("/:uuid/apply", middlewares.AuthRequired(), middlewares.WorkerRequired(), handlers.ApplyToTask)
	}

	// Dashboard routes
	dashboard := api.Group("/dashboard")
	{
		dashboard.GET("", middlewares.AuthRequired(), handlers.GetDashboardData)
	}

	// Payment routes
	payments := api.Group("/payments")
	{
		payments.GET("", middlewares.AuthRequired(), handlers.GetPaymentsData)
		payments.POST("/withdraw", middlewares.AuthRequired(), handlers.RequestWithdrawal)
		payments.POST("/withdrawal-accounts", middlewares.AuthRequired(), handlers.AddWithdrawalAccount)
	}

	// Admin routes
	admin := api.Group("/admin")
	admin.Use(middlewares.AuthRequired(), middlewares.AdminRequired())
	{
		admin.GET("/dashboard", handlers.GetAdminDashboard)
	}
}
