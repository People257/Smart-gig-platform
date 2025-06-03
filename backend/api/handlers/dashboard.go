package handlers

import (
	"fmt"
	"log"
	"net/http"
	"time"
	"zhlg/backend/db"
	"zhlg/backend/models"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// GetDashboardData returns dashboard data for regular users
func GetDashboardData(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "未登录"})
		return
	}

	userType, _ := c.Get("userType")
	log.Printf("[GetDashboardData] 获取Dashboard数据，用户ID=%v, 类型=%v", userID, userType)

	// 获取进行中的任务数量
	var activeTasks int64
	var taskQuery *gorm.DB

	if userType == "worker" {
		// 对于零工，查询已接受的进行中任务
		taskQuery = db.DB.Model(&models.Task{}).
			Joins("JOIN task_assignments ON tasks.id = task_assignments.task_id").
			Where("task_assignments.user_id = ? AND tasks.status = ?", userID, "in_progress")
	} else {
		// 对于雇主，查询自己发布的进行中任务
		taskQuery = db.DB.Model(&models.Task{}).
			Where("employer_id = ? AND status = ?", userID, "in_progress")
	}

	if err := taskQuery.Count(&activeTasks).Error; err != nil {
		log.Printf("[GetDashboardData] 查询活跃任务失败: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "获取任务数据失败"})
		return
	}

	// 计算本月收入（对于零工）
	var monthlyIncome float64
	now := time.Now()
	startOfMonth := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, now.Location())

	if userType == "worker" {
		var incomeStats struct {
			Total float64
		}

		if err := db.DB.Model(&models.Transaction{}).
			Select("COALESCE(SUM(amount), 0) as Total").
			Where("user_id = ? AND type = ? AND created_at >= ?",
				userID, models.TransactionTypeEarning, startOfMonth).
			Scan(&incomeStats).Error; err != nil {
			log.Printf("[GetDashboardData] 查询月收入失败: %v", err)
			// 不中断，继续获取其他数据
		} else {
			monthlyIncome = incomeStats.Total
		}
	}

	// 获取评分信息
	var rating float64
	var reviewCount int64

	if err := db.DB.Model(&models.Review{}).
		Select("COALESCE(AVG(rating), 0) as rating").
		Where("reviewee_id = ?", userID).
		Scan(&rating).Error; err != nil {
		log.Printf("[GetDashboardData] 查询评分失败: %v", err)
		// 不中断，继续获取其他数据
	}

	// 统计有多少评价
	if err := db.DB.Model(&models.Review{}).
		Where("reviewee_id = ?", userID).
		Count(&reviewCount).Error; err != nil {
		log.Printf("[GetDashboardData] 查询评价数量失败: %v", err)
		// 不中断，继续获取其他数据
	}

	// 计算工作时长（这里假设每个任务有一个固定的工作时长）
	var workHours float64
	if userType == "worker" {
		var hourStats struct {
			Total float64
		}

		if err := db.DB.Table("tasks").
			Select("COALESCE(SUM(estimated_hours), 0) as Total").
			Joins("JOIN task_assignments ON tasks.id = task_assignments.task_id").
			Where("task_assignments.user_id = ? AND tasks.status IN (?, ?)",
				userID, "in_progress", "completed").
			Scan(&hourStats).Error; err != nil {
			log.Printf("[GetDashboardData] 查询工作时长失败: %v", err)
			// 不中断，继续获取其他数据
		} else {
			workHours = hourStats.Total
		}
	}

	// 获取最近任务
	var recentTasks []struct {
		UUID      string
		Title     string
		Status    string
		CreatedAt time.Time
	}

	tasksQuery := db.DB
	if userType == "worker" {
		tasksQuery = tasksQuery.Table("tasks").
			Select("tasks.uuid, tasks.title, tasks.status, tasks.created_at").
			Joins("JOIN task_assignments ON tasks.id = task_assignments.task_id").
			Where("task_assignments.user_id = ?", userID)
	} else {
		tasksQuery = tasksQuery.Model(&models.Task{}).
			Select("uuid, title, status, created_at").
			Where("employer_id = ?", userID)
	}

	if err := tasksQuery.
		Order("created_at DESC").
		Limit(5).
		Scan(&recentTasks).Error; err != nil {
		log.Printf("[GetDashboardData] 查询最近任务失败: %v", err)
	}

	// 格式化最近任务数据
	formattedTasks := make([]gin.H, 0)
	for _, task := range recentTasks {
		formattedTasks = append(formattedTasks, gin.H{
			"id":     fmt.Sprintf("task_%d", len(formattedTasks)+1), // 仅用于前端展示
			"uuid":   task.UUID,
			"title":  task.Title,
			"status": task.Status,
			"date":   task.CreatedAt.Format("2006-01-02"),
		})
	}

	// 获取最近活动记录
	var activities []struct {
		ID        uint
		Content   string
		CreatedAt time.Time
	}

	// 这里可以创建一个活动表来记录所有用户活动，暂时模拟数据
	activities = []struct {
		ID        uint
		Content   string
		CreatedAt time.Time
	}{
		{1, "系统登录", time.Now().Add(-24 * time.Hour)},
		{2, "申请任务: 网站开发", time.Now().Add(-48 * time.Hour)},
	}

	formattedActivities := make([]gin.H, 0)
	for _, activity := range activities {
		formattedActivities = append(formattedActivities, gin.H{
			"id":      fmt.Sprintf("activity_%d", activity.ID),
			"content": activity.Content,
			"date":    activity.CreatedAt.Format("2006-01-02"),
		})
	}

	c.JSON(http.StatusOK, gin.H{
		"activeTasks":   activeTasks,
		"monthlyIncome": monthlyIncome,
		"workHours":     workHours,
		"rating":        rating,
		"reviewCount":   reviewCount,
		"recentTasks":   formattedTasks,
		"activities":    formattedActivities,
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
