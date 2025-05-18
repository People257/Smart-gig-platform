package handlers

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
)

// GetDashboardData returns dashboard data for regular users
func GetDashboardData(c *gin.Context) {
	// In a real app, we would get data from the database based on user type and ID
	// userID := c.GetUint("userID")
	// userType := c.GetString("userType")

	// Mock dashboard data for demonstration
	now := time.Now()

	c.JSON(http.StatusOK, gin.H{
		"stats": gin.H{
			"tasks_completed": 12,
			"total_earnings":  3500.50,
			"avg_rating":      4.8,
			"current_balance": 1250.75,
		},
		"recent_tasks": []gin.H{
			{
				"id":       "task_123456",
				"title":    "网站UI设计",
				"status":   "completed",
				"due_date": now.AddDate(0, 0, -5).Format(time.RFC3339),
				"payment":  1200.00,
			},
			{
				"id":       "task_123457",
				"title":    "移动应用开发",
				"status":   "in_progress",
				"due_date": now.AddDate(0, 0, 5).Format(time.RFC3339),
				"payment":  2500.00,
			},
		},
		"notifications": []gin.H{
			{
				"id":         "notif_123456",
				"type":       "task_update",
				"title":      "任务更新",
				"message":    "您的任务已被雇主确认完成",
				"created_at": now.AddDate(0, 0, -1).Format(time.RFC3339),
				"read":       false,
			},
		},
	})
}

// GetAdminDashboard returns dashboard data for admin users
func GetAdminDashboard(c *gin.Context) {
	// In a real app, we would get data from the database
	// Check admin privileges here

	// Mock admin dashboard data for demonstration
	now := time.Now()

	c.JSON(http.StatusOK, gin.H{
		"platform_stats": gin.H{
			"total_users":     2456,
			"active_users":    1823,
			"total_tasks":     1245,
			"active_tasks":    528,
			"completed_tasks": 687,
			"total_revenue":   25678.50,
		},
		"recent_activity": []gin.H{
			{
				"type":    "new_user",
				"details": "新用户注册：user123456",
				"time":    now.AddDate(0, 0, -1).Format(time.RFC3339),
			},
			{
				"type":    "withdrawal",
				"details": "提现申请：2000.00 CNY",
				"time":    now.Format(time.RFC3339),
			},
			{
				"type":    "task_created",
				"details": "新任务创建：网站开发项目",
				"time":    now.AddDate(0, 0, -2).Format(time.RFC3339),
			},
		},
		"system_status": gin.H{
			"status":                  "normal",
			"db_connections":          45,
			"cache_hits":              12567,
			"api_requests_per_minute": 128,
		},
	})
}
