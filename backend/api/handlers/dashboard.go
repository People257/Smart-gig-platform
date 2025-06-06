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

	// 从context中获取user_type而不是userType
	userTypeValue, exists := c.Get("user_type")
	var userType string

	if exists && userTypeValue != nil {
		userType = userTypeValue.(string)
	} else {
		// 如果用户类型不存在，从数据库中获取
		var user models.User
		if err := db.DB.Select("user_type").First(&user, userID).Error; err != nil {
			log.Printf("[GetDashboardData] 无法获取用户类型: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "获取用户数据失败"})
			return
		}
		userType = string(user.UserType)
	}

	log.Printf("[GetDashboardData] 获取Dashboard数据，用户ID=%v, 类型=%v", userID, userType)

	// 获取进行中的任务数量
	var activeTasks int64
	var taskQuery *gorm.DB

	if userType == "worker" {
		// 对于零工，查询已接受的进行中任务
		taskQuery = db.DB.Model(&models.Task{}).
			Joins("JOIN task_assignments ON tasks.id = task_assignments.task_id").
			Where("task_assignments.worker_id = ? AND tasks.status = ?", userID, "in_progress")
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
	log.Printf("[GetDashboardData] 计算本月收入，起始日期: %v", startOfMonth.Format("2006-01-02"))

	if userType == "worker" {
		var incomeStats struct {
			Total float64
		}

		// 查询本月收入
		query := db.DB.Model(&models.Transaction{}).
			Select("COALESCE(SUM(amount), 0) as Total").
			Where("user_id = ? AND type = ? AND created_at >= ? AND status = ?",
				userID, models.TransactionTypeEarning, startOfMonth, models.TransactionStatusCompleted)

		err := query.Scan(&incomeStats).Error

		if err != nil {
			log.Printf("[GetDashboardData] 查询月收入失败: %v", err)

			// 尝试使用原始SQL查询
			err2 := db.DB.Raw(`
				SELECT COALESCE(SUM(amount), 0) as Total 
				FROM transactions 
				WHERE user_id = ? 
				  AND type = ? 
				  AND created_at >= ? 
				  AND status = ?`,
				userID, "earning", startOfMonth, "completed").
				Scan(&incomeStats).Error

			if err2 != nil {
				log.Printf("[GetDashboardData] 原始SQL查询月收入也失败: %v", err2)
				// 不再提供默认值，保持为0
				monthlyIncome = 0
				log.Printf("[GetDashboardData] 没有收入数据，设置为0")
			} else {
				monthlyIncome = incomeStats.Total
				log.Printf("[GetDashboardData] 使用原始SQL查询的月收入: %v", monthlyIncome)
			}
		} else {
			monthlyIncome = incomeStats.Total
			log.Printf("[GetDashboardData] 使用ORM查询的月收入: %v", monthlyIncome)
		}
	} else if userType == "employer" {
		var paymentStats struct {
			Total float64
		}

		// 查询本月支出
		query := db.DB.Model(&models.Transaction{}).
			Select("COALESCE(SUM(amount), 0) as Total").
			Where("user_id = ? AND type = ? AND created_at >= ? AND status = ?",
				userID, models.TransactionTypeEarning, startOfMonth, models.TransactionStatusCompleted)

		if err := query.Scan(&paymentStats).Error; err != nil {
			log.Printf("[GetDashboardData] 查询月支出失败: %v", err)
			// 不提供默认值，保持为0
			monthlyIncome = 0
		} else {
			monthlyIncome = paymentStats.Total
			log.Printf("[GetDashboardData] 查询月支出: %v", monthlyIncome)
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

	// 计算工作时长（使用更可靠的方式计算）
	var workHours float64
	if userType == "worker" {
		// 方法1: 使用estimated_hours字段
		var hourStats struct {
			Total float64
		}
		err1 := db.DB.Table("tasks").
			Select("COALESCE(SUM(estimated_hours), 0) as Total").
			Joins("JOIN task_assignments ON tasks.id = task_assignments.task_id").
			Where("task_assignments.worker_id = ? AND task_assignments.worker_status IN (?, ?)",
				userID, "working", "completed").
			Scan(&hourStats).Error

		if err1 == nil && hourStats.Total > 0 {
			workHours = hourStats.Total
			log.Printf("[GetDashboardData] 使用estimated_hours计算的工作时长: %v", workHours)
		} else {
			// 方法2: 使用任务的日期范围（结束日期-开始日期）* 8小时/天
			var dateStats struct {
				Total float64
			}
			err2 := db.DB.Raw(`
				SELECT COALESCE(SUM(
					DATEDIFF(
						CASE 
							WHEN tasks.status = 'completed' THEN tasks.end_date 
							ELSE CURDATE() 
						END, 
						tasks.start_date
					) * 8
				), 0) as Total
				FROM tasks
				JOIN task_assignments ON tasks.id = task_assignments.task_id
				WHERE task_assignments.worker_id = ? 
				AND tasks.status IN ('in_progress', 'completed')`,
				userID).Scan(&dateStats).Error

			if err2 == nil && dateStats.Total > 0 {
				workHours = dateStats.Total
				log.Printf("[GetDashboardData] 使用日期范围计算的工作时长: %v", workHours)
			} else {
				// 方法3: 固定值 - 每个任务分配8小时
				var taskCount int64
				db.DB.Model(&models.TaskAssignment{}).
					Where("worker_id = ?", userID).
					Count(&taskCount)

				workHours = float64(taskCount) * 8
				log.Printf("[GetDashboardData] 使用固定值计算的工作时长: %v", workHours)
			}
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
			Where("task_assignments.worker_id = ?", userID)
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

// GetIncomeHistory 返回用户最近6个月的收入/支出历史数据
func GetIncomeHistory(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "未登录"})
		return
	}

	// 从context中获取用户类型
	userTypeValue, exists := c.Get("user_type")
	var userType string

	if exists && userTypeValue != nil {
		userType = userTypeValue.(string)
	} else {
		// 如果用户类型不存在，从数据库中获取
		var user models.User
		if err := db.DB.Select("user_type").First(&user, userID).Error; err != nil {
			log.Printf("[GetIncomeHistory] 无法获取用户类型: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "获取用户数据失败"})
			return
		}
		userType = string(user.UserType)
	}

	log.Printf("[GetIncomeHistory] 获取收入历史数据，用户ID=%v, 类型=%v", userID, userType)

	// 获取当前月份和前5个月，共6个月的数据
	now := time.Now()
	var monthlyData []gin.H

	for i := 5; i >= 0; i-- {
		// 计算月份
		currentMonth := time.Date(now.Year(), now.Month()-time.Month(i), 1, 0, 0, 0, 0, now.Location())
		monthLabel := currentMonth.Format("2006-01")

		// 计算月底
		nextMonth := currentMonth.AddDate(0, 1, 0)
		monthEnd := nextMonth.Add(-time.Second)

		var monthlyIncome float64
		var transactionCount int64

		// 对于工人，统计收入; 对于雇主，统计支出
		if userType == "worker" {
			// 检查当月交易记录数量
			if err := db.DB.Model(&models.Transaction{}).
				Where("user_id = ? AND type = ? AND created_at BETWEEN ? AND ? AND status = ?",
					userID, models.TransactionTypeEarning, currentMonth, monthEnd, models.TransactionStatusCompleted).
				Count(&transactionCount).Error; err != nil {
				log.Printf("[GetIncomeHistory] 查询交易记录数量失败: %v", err)
				transactionCount = 0
			}

			// 如果存在交易记录，计算月收入总额
			if transactionCount > 0 {
				var incomeStats struct {
					Total float64
				}
				if err := db.DB.Model(&models.Transaction{}).
					Select("COALESCE(SUM(amount), 0) as Total").
					Where("user_id = ? AND type = ? AND created_at BETWEEN ? AND ? AND status = ?",
						userID, models.TransactionTypeEarning, currentMonth, monthEnd, models.TransactionStatusCompleted).
					Scan(&incomeStats).Error; err != nil {
					log.Printf("[GetIncomeHistory] 查询月收入失败: %v", err)
				} else {
					monthlyIncome = incomeStats.Total
				}
			}
		} else if userType == "employer" {
			// 雇主支出逻辑类似，但使用支出类型的交易
			// 检查当月交易记录数量
			if err := db.DB.Model(&models.Transaction{}).
				Where("user_id = ? AND type = ? AND created_at BETWEEN ? AND ? AND status = ?",
					userID, models.TransactionTypeEarning, currentMonth, monthEnd, models.TransactionStatusCompleted).
				Count(&transactionCount).Error; err != nil {
				log.Printf("[GetIncomeHistory] 查询交易记录数量失败: %v", err)
				transactionCount = 0
			}

			// 如果存在交易记录，计算月支出总额
			if transactionCount > 0 {
				var paymentStats struct {
					Total float64
				}
				if err := db.DB.Model(&models.Transaction{}).
					Select("COALESCE(SUM(amount), 0) as Total").
					Where("user_id = ? AND type = ? AND created_at BETWEEN ? AND ? AND status = ?",
						userID, models.TransactionTypeEarning, currentMonth, monthEnd, models.TransactionStatusCompleted).
					Scan(&paymentStats).Error; err != nil {
					log.Printf("[GetIncomeHistory] 查询月支出失败: %v", err)
				} else {
					monthlyIncome = paymentStats.Total
				}
			}
		}

		// 添加到结果数组
		monthlyData = append(monthlyData, gin.H{
			"month":  monthLabel,
			"amount": monthlyIncome,
		})
	}

	c.JSON(http.StatusOK, gin.H{
		"months":    monthlyData,
		"user_type": userType,
	})
}
