package handlers

import (
	"fmt"
	"log"
	"net/http"
	"time"
	"zhlg/backend/db"
	"zhlg/backend/models"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

// CreateReviewRequest represents the request body for creating a new review
type CreateReviewRequest struct {
	Rating       uint8  `json:"rating" binding:"required,min=1,max=5"`
	Comment      string `json:"comment" binding:"required"`
	TaskUUID     string `json:"task_uuid" binding:"required"`
	RevieweeUUID string `json:"reviewee_uuid" binding:"required"`
}

// GetUserReviews handles fetching reviews for a specific user
func GetUserReviews(c *gin.Context) {
	userUUID := c.Param("uuid")
	if userUUID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "缺少用户ID"})
		return
	}

	// 获取用户信息
	var user models.User
	if err := db.DB.Where("uuid = ?", userUUID).First(&user).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "用户未找到"})
		} else {
			log.Printf("[GetUserReviews] 查询用户失败: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "获取用户数据失败"})
		}
		return
	}

	// 获取用户收到的评价
	var dbReviews []models.Review
	if err := db.DB.Where("reviewee_id = ?", user.ID).
		Preload("Reviewer").
		Preload("TaskAssignment").
		Preload("TaskAssignment.Task").
		Order("created_at DESC").
		Find(&dbReviews).Error; err != nil {
		log.Printf("[GetUserReviews] 查询评价失败: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "获取评价数据失败"})
		return
	}

	// 格式化评价数据
	reviews := make([]gin.H, 0)
	for _, review := range dbReviews {
		var taskTitle string
		if review.TaskAssignment.Task.Title != "" {
			taskTitle = review.TaskAssignment.Task.Title
		} else {
			taskTitle = "未知任务"
		}

		reviewItem := gin.H{
			"uuid":    review.UUID,
			"rating":  review.Rating,
			"comment": review.Comment,
			"reviewer": gin.H{
				"uuid":       review.Reviewer.UUID,
				"name":       review.Reviewer.Name,
				"avatar_url": review.Reviewer.AvatarURL,
			},
			"task": gin.H{
				"uuid":  review.TaskAssignment.Task.UUID,
				"title": taskTitle,
			},
			"created_at": review.CreatedAt.Format(time.RFC3339),
		}
		reviews = append(reviews, reviewItem)
	}

	// 计算平均评分
	var stats struct {
		AvgRating float64
		Count     int64
	}

	db.DB.Model(&models.Review{}).
		Select("COALESCE(AVG(rating), 0) as avg_rating, COUNT(*) as count").
		Where("reviewee_id = ?", user.ID).
		Scan(&stats)

	c.JSON(http.StatusOK, gin.H{
		"reviews": reviews,
		"stats": gin.H{
			"total":          stats.Count,
			"average_rating": stats.AvgRating,
		},
	})
}

// CreateReview handles creating a new review
func CreateReview(c *gin.Context) {
	// 获取当前用户ID
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "未登录"})
		return
	}

	var req CreateReviewRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "请求参数错误", "details": err.Error()})
		return
	}

	// 检查任务是否存在且已完成
	var task models.Task
	if err := db.DB.Where("uuid = ? AND status = ?", req.TaskUUID, "completed").First(&task).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusBadRequest, gin.H{"error": "任务不存在或未完成"})
		} else {
			log.Printf("[CreateReview] 查询任务失败: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "获取任务数据失败"})
		}
		return
	}

	// 获取被评价用户信息
	var reviewee models.User
	if err := db.DB.Where("uuid = ?", req.RevieweeUUID).First(&reviewee).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "被评价用户未找到"})
		} else {
			log.Printf("[CreateReview] 查询被评价用户失败: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "获取用户数据失败"})
		}
		return
	}

	// 获取任务分配信息
	var taskAssignment models.TaskAssignment
	if err := db.DB.Where("task_id = ? AND (user_id = ? OR user_id = ?)",
		task.ID, userID, reviewee.ID).First(&taskAssignment).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusBadRequest, gin.H{"error": "找不到相关的任务分配记录"})
		} else {
			log.Printf("[CreateReview] 查询任务分配记录失败: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "获取任务分配数据失败"})
		}
		return
	}

	// 检查评价类型
	var reviewerType models.ReviewType
	if userID == task.EmployerID {
		// 雇主评价零工
		reviewerType = models.ReviewTypeEmployerToWorker
		if reviewee.ID == task.EmployerID {
			c.JSON(http.StatusBadRequest, gin.H{"error": "雇主不能评价自己"})
			return
		}
	} else {
		// 零工评价雇主
		reviewerType = models.ReviewTypeWorkerToEmployer
		if reviewee.ID != task.EmployerID {
			c.JSON(http.StatusBadRequest, gin.H{"error": "零工只能评价雇主"})
			return
		}
	}

	// 检查是否已经评价过
	var existingReview models.Review
	if err := db.DB.Where("reviewer_id = ? AND reviewee_id = ? AND task_assignment_id = ?",
		userID, reviewee.ID, taskAssignment.ID).First(&existingReview).Error; err == nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "已对此任务进行评价"})
		return
	}

	// 创建新评价
	comment := req.Comment // 使用指针
	review := models.Review{
		UUID:             uuid.New().String(),
		TaskAssignmentID: taskAssignment.ID,
		ReviewerID:       uint(userID.(float64)), // 转换为uint类型
		RevieweeID:       reviewee.ID,
		Rating:           req.Rating,
		Comment:          &comment,
		ReviewType:       reviewerType,
		CreatedAt:        time.Now(),
	}

	// 开始事务
	tx := db.DB.Begin()
	if tx.Error != nil {
		log.Printf("[CreateReview] 开启事务失败: %v", tx.Error)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "创建评价失败"})
		return
	}

	// 保存评价
	if err := tx.Create(&review).Error; err != nil {
		tx.Rollback()
		log.Printf("[CreateReview] 创建评价失败: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "保存评价失败"})
		return
	}

	// 更新用户的平均评分
	var stats struct {
		AvgRating float64
	}
	if err := tx.Model(&models.Review{}).
		Select("COALESCE(AVG(rating), 0) as avg_rating").
		Where("reviewee_id = ?", reviewee.ID).
		Scan(&stats).Error; err != nil {
		tx.Rollback()
		log.Printf("[CreateReview] 计算平均评分失败: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "更新评分失败"})
		return
	}

	// 更新用户的评分字段（假设User模型有Rating字段）
	if err := tx.Model(&reviewee).Update("rating", stats.AvgRating).Error; err != nil {
		tx.Rollback()
		log.Printf("[CreateReview] 更新用户评分失败: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "更新用户评分失败"})
		return
	}

	// 提交事务
	if err := tx.Commit().Error; err != nil {
		log.Printf("[CreateReview] 提交事务失败: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "保存评价失败"})
		return
	}

	// 获取评价人信息
	var reviewer models.User
	if err := db.DB.First(&reviewer, userID).Error; err != nil {
		log.Printf("[CreateReview] 查询评价人失败: %v", err)
	}

	// 返回成功响应
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "评价提交成功",
		"review": gin.H{
			"uuid":    review.UUID,
			"rating":  review.Rating,
			"comment": review.Comment,
			"reviewer": gin.H{
				"uuid":       reviewer.UUID,
				"name":       reviewer.Name,
				"avatar_url": reviewer.AvatarURL,
			},
			"reviewee": gin.H{
				"uuid":       reviewee.UUID,
				"name":       reviewee.Name,
				"avatar_url": reviewee.AvatarURL,
			},
			"task": gin.H{
				"uuid":  task.UUID,
				"title": task.Title,
			},
			"created_at": review.CreatedAt.Format(time.RFC3339),
		},
	})
}

// GetPendingReviews handles fetching reviews that the user needs to submit
func GetPendingReviews(c *gin.Context) {
	// 获取当前用户ID
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "未登录"})
		return
	}

	userType, _ := c.Get("userType")
	log.Printf("[GetPendingReviews] 获取待评价任务，用户ID=%v, 类型=%v", userID, userType)

	pendingReviews := make([]gin.H, 0)

	// 根据用户类型获取待评价任务
	if userType == "employer" {
		// 雇主视角：查找已完成但未评价的任务
		var tasks []struct {
			TaskUUID     string
			TaskTitle    string
			WorkerUUID   string
			WorkerName   string
			WorkerAvatar string
			CompletedAt  time.Time
		}

		query := `
			SELECT 
				t.uuid AS task_uuid, 
				t.title AS task_title,
				u.uuid AS worker_uuid, 
				u.name AS worker_name, 
				u.avatar_url AS worker_avatar,
				ta.completed_at AS completed_at
			FROM 
				tasks t
			JOIN 
				task_assignments ta ON t.id = ta.task_id
			JOIN 
				users u ON ta.user_id = u.id
			LEFT JOIN 
				reviews r ON (r.reviewer_id = ? AND r.reviewee_id = u.id)
			WHERE 
				t.employer_id = ? 
				AND t.status = 'completed'
				AND r.id IS NULL
			ORDER BY 
				ta.completed_at DESC
		`

		if err := db.DB.Raw(query, userID, userID).Scan(&tasks).Error; err != nil {
			log.Printf("[GetPendingReviews] 查询雇主待评价任务失败: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "获取待评价任务失败"})
			return
		}

		for _, task := range tasks {
			pendingReviews = append(pendingReviews, gin.H{
				"task": gin.H{
					"uuid":  task.TaskUUID,
					"title": task.TaskTitle,
				},
				"user": gin.H{
					"uuid":       task.WorkerUUID,
					"name":       task.WorkerName,
					"avatar_url": task.WorkerAvatar,
					"user_type":  "worker",
				},
				"completed_at": task.CompletedAt.Format("2006-01-02"),
			})
		}
	} else {
		// 零工视角：查找已完成但未评价雇主的任务
		var tasks []struct {
			TaskUUID       string
			TaskTitle      string
			EmployerUUID   string
			EmployerName   string
			EmployerAvatar string
			CompletedAt    time.Time
		}

		query := `
			SELECT 
				t.uuid AS task_uuid, 
				t.title AS task_title,
				u.uuid AS employer_uuid, 
				u.name AS employer_name, 
				u.avatar_url AS employer_avatar,
				ta.completed_at AS completed_at
			FROM 
				tasks t
			JOIN 
				task_assignments ta ON t.id = ta.task_id
			JOIN 
				users u ON t.employer_id = u.id
			LEFT JOIN 
				reviews r ON (r.reviewer_id = ? AND r.reviewee_id = u.id)
			WHERE 
				ta.worker_id = ? 
				AND t.status = 'completed'
				AND r.id IS NULL
			ORDER BY 
				ta.completed_at DESC
		`

		if err := db.DB.Raw(query, userID, userID).Scan(&tasks).Error; err != nil {
			log.Printf("[GetPendingReviews] 查询零工待评价任务失败: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "获取待评价任务失败"})
			return
		}

		for _, task := range tasks {
			pendingReviews = append(pendingReviews, gin.H{
				"task": gin.H{
					"uuid":  task.TaskUUID,
					"title": task.TaskTitle,
				},
				"user": gin.H{
					"uuid":       task.EmployerUUID,
					"name":       task.EmployerName,
					"avatar_url": task.EmployerAvatar,
					"user_type":  "employer",
				},
				"completed_at": task.CompletedAt.Format("2006-01-02"),
			})
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"success":         true,
		"pending_reviews": pendingReviews,
		"count":           len(pendingReviews),
	})
}

// GetUserRatings handles fetching a summary of a user's ratings
func GetUserRatings(c *gin.Context) {
	userUUID := c.Param("uuid")
	if userUUID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "缺少用户ID"})
		return
	}

	// 获取用户信息
	var user models.User
	if err := db.DB.Where("uuid = ?", userUUID).First(&user).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "用户未找到"})
		} else {
			log.Printf("[GetUserRatings] 查询用户失败: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "获取用户数据失败"})
		}
		return
	}

	// 获取各评分的统计数据
	type RatingCount struct {
		Rating uint8
		Count  int
	}
	var ratingCounts []RatingCount

	if err := db.DB.Model(&models.Review{}).
		Select("rating, COUNT(*) as count").
		Where("reviewee_id = ?", user.ID).
		Group("rating").
		Order("rating DESC").
		Scan(&ratingCounts).Error; err != nil {
		log.Printf("[GetUserRatings] 查询评分统计失败: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "获取评分统计失败"})
		return
	}

	// 格式化评分数据，确保所有评分等级都有数据
	ratings := make([]gin.H, 5)
	for i := uint8(1); i <= 5; i++ {
		count := 0
		for _, rc := range ratingCounts {
			if rc.Rating == i {
				count = rc.Count
				break
			}
		}
		ratings[5-i] = gin.H{"rating": i, "count": count}
	}

	// 计算总评分和平均分
	var stats struct {
		AvgRating float64
		Count     int64
	}

	if err := db.DB.Model(&models.Review{}).
		Select("COALESCE(AVG(rating), 0) as avg_rating, COUNT(*) as count").
		Where("reviewee_id = ?", user.ID).
		Scan(&stats).Error; err != nil {
		log.Printf("[GetUserRatings] 计算平均评分失败: %v", err)
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"ratings": ratings,
		"stats": gin.H{
			"total_reviews":  stats.Count,
			"average_rating": stats.AvgRating,
		},
	})
}

// ReportReview handles reporting an inappropriate review
func ReportReview(c *gin.Context) {
	reviewUUID := c.Param("uuid")
	if reviewUUID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "缺少评价ID"})
		return
	}

	var req struct {
		Reason string `json:"reason" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "请求参数错误", "details": err.Error()})
		return
	}

	// 检查评价是否存在
	var review models.Review
	if err := db.DB.Where("uuid = ?", reviewUUID).First(&review).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "评价未找到"})
		} else {
			log.Printf("[ReportReview] 查询评价失败: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "获取评价数据失败"})
		}
		return
	}

	// 此处实际应创建举报记录
	// 在真实环境中，应该创建一个ReviewReport模型并保存举报信息

	// 返回成功响应
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": fmt.Sprintf("评价举报提交成功，我们将尽快审核（评价ID: %s，举报原因: %s）", reviewUUID, req.Reason),
	})
}
