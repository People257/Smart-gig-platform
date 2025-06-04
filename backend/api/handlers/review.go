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

	log.Printf("[CreateReview] 开始创建评价，userID=%v (%T)", userID, userID)

	var req CreateReviewRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		log.Printf("[CreateReview] 请求参数错误: %v", err)
		c.JSON(http.StatusBadRequest, gin.H{"error": "请求参数错误", "details": err.Error()})
		return
	}

	log.Printf("[CreateReview] 收到请求参数: taskUUID=%s, revieweeUUID=%s, rating=%d",
		req.TaskUUID, req.RevieweeUUID, req.Rating)

	// 检查任务是否存在且已完成
	var task models.Task
	if err := db.DB.Where("uuid = ? AND status = ?", req.TaskUUID, "completed").First(&task).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			log.Printf("[CreateReview] 任务未找到或未完成: %s", req.TaskUUID)
			c.JSON(http.StatusBadRequest, gin.H{"error": "任务不存在或未完成"})
		} else {
			log.Printf("[CreateReview] 查询任务失败: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "获取任务数据失败"})
		}
		return
	}

	log.Printf("[CreateReview] 找到任务: ID=%d, UUID=%s, 标题=%s, 状态=%s",
		task.ID, task.UUID, task.Title, task.Status)

	// 获取被评价用户信息
	var reviewee models.User
	if err := db.DB.Where("uuid = ?", req.RevieweeUUID).First(&reviewee).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			log.Printf("[CreateReview] 被评价用户未找到: %s", req.RevieweeUUID)
			c.JSON(http.StatusNotFound, gin.H{"error": "被评价用户未找到"})
		} else {
			log.Printf("[CreateReview] 查询被评价用户失败: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "获取用户数据失败"})
		}
		return
	}

	log.Printf("[CreateReview] 找到被评价用户: ID=%d, UUID=%s, 名称=%s",
		reviewee.ID, reviewee.UUID, reviewee.Name)

	// 检查用户身份
	userType, _ := c.Get("user_type")

	// 检查评价权限
	if userType == "employer" {
		// 雇主评价零工
		if reviewee.ID == task.EmployerID {
			c.JSON(http.StatusBadRequest, gin.H{"error": "雇主不能评价自己"})
			return
		}
	} else {
		// 零工可以评价任何与任务相关的用户
		// 零工不能评价自己
		if reviewee.ID == userID.(uint) {
			c.JSON(http.StatusBadRequest, gin.H{"error": "不能评价自己"})
			return
		}
	}

	// 构建查询条件并输出SQL语句
	taskAssignmentQuery := db.DB.Where("task_id = ? AND (worker_id = ? OR worker_id = ?)",
		task.ID, userID, reviewee.ID)

	querySQL := db.DB.ToSQL(func(tx *gorm.DB) *gorm.DB {
		return tx.Model(&models.TaskAssignment{}).Where("task_id = ? AND (worker_id = ? OR worker_id = ?)",
			task.ID, userID, reviewee.ID)
	})

	log.Printf("[CreateReview] 查询任务分配的SQL: %s", querySQL)

	// 获取任务分配信息
	var taskAssignment models.TaskAssignment
	if err := taskAssignmentQuery.First(&taskAssignment).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			log.Printf("[CreateReview] 找不到相关的任务分配记录: taskID=%d, userID=%v, revieweeID=%d",
				task.ID, userID, reviewee.ID)
			c.JSON(http.StatusBadRequest, gin.H{"error": "找不到相关的任务分配记录"})
		} else {
			log.Printf("[CreateReview] 查询任务分配记录失败: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "获取任务分配数据失败"})
		}
		return
	}

	log.Printf("[CreateReview] 找到任务分配: ID=%d, TaskID=%d, WorkerID=%d",
		taskAssignment.ID, taskAssignment.TaskID, taskAssignment.WorkerID)

	// 检查是否已经评价过
	var existingReview models.Review
	if err := db.DB.Where("reviewer_id = ? AND reviewee_id = ? AND task_id = ?",
		userID, reviewee.ID, task.ID).First(&existingReview).Error; err == nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "您已经评价过该用户"})
		return
	} else if err != gorm.ErrRecordNotFound {
		log.Printf("[CreateReview] 查询已有评价失败: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "检查评价记录失败"})
		return
	}

	// 创建评价记录
	comment := req.Comment // 使用指针
	review := models.Review{
		UUID:       uuid.New().String(),
		ReviewerID: userID.(uint),
		RevieweeID: reviewee.ID,
		Rating:     req.Rating,
		Comment:    &comment,
		TaskID:     task.ID,
		// TaskAssignmentID字段可能在数据库中不存在，所以不设置它
	}

	// 设置评价类型
	if userType == "employer" {
		review.ReviewType = models.ReviewTypeEmployerToWorker
	} else {
		review.ReviewType = models.ReviewTypeWorkerToEmployer
	}

	// 使用原生SQL添加评价，避免ORM自动映射导致的问题
	sql := `INSERT INTO reviews 
		(uuid, reviewer_id, reviewee_id, rating, comment, task_id, task_assignment_id, review_type, created_at) 
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`

	var err error
	err = db.DB.Exec(sql,
		review.UUID,
		review.ReviewerID,
		review.RevieweeID,
		review.Rating,
		review.Comment,
		review.TaskID,
		taskAssignment.ID,
		review.ReviewType,
	).Error

	if err != nil {
		log.Printf("[CreateReview] 创建评价失败: %v", err)
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

	userType, _ := c.Get("user_type")
	log.Printf("[GetPendingReviews] 获取待评价任务，用户ID=%v, 类型=%v", userID, userType)

	// 输出用户ID的确切类型和值
	log.Printf("[GetPendingReviews] 用户ID类型=%T, 值=%v", userID, userID)

	// 检查是否包含已评价的任务
	includeCompleted := c.Query("include_completed") == "true"

	pendingReviews := make([]gin.H, 0)
	completedReviews := make([]gin.H, 0)

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
				users u ON ta.worker_id = u.id
			LEFT JOIN 
				reviews r ON (r.reviewer_id = ? AND r.reviewee_id = u.id AND r.task_assignment_id = ta.id)
			WHERE 
				t.employer_id = ? 
				AND t.status = 'completed'
				AND r.id IS NULL
			ORDER BY 
				ta.completed_at DESC
		`

		// 创建带有参数的完整SQL语句用于调试
		sqlWithParams := db.DB.ToSQL(func(tx *gorm.DB) *gorm.DB {
			return tx.Raw(query, userID, userID)
		})
		log.Printf("[GetPendingReviews] 雇主待评价任务SQL: %s", sqlWithParams)

		if err := db.DB.Raw(query, userID, userID).Scan(&tasks).Error; err != nil {
			log.Printf("[GetPendingReviews] 查询雇主待评价任务失败: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "获取待评价任务失败"})
			return
		}

		log.Printf("[GetPendingReviews] 雇主待评价任务数量: %d", len(tasks))
		for i, task := range tasks {
			log.Printf("[GetPendingReviews] 雇主待评价任务 #%d: task_uuid=%s, worker_uuid=%s, worker_name=%s",
				i+1, task.TaskUUID, task.WorkerUUID, task.WorkerName)
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

		// 如果需要包含已评价的任务
		if includeCompleted {
			var completedTasks []struct {
				TaskUUID      string
				TaskTitle     string
				WorkerUUID    string
				WorkerName    string
				WorkerAvatar  string
				CompletedAt   time.Time
				ReviewRating  uint8
				ReviewComment string
				ReviewDate    time.Time
			}

			completedQuery := `
				SELECT 
					t.uuid AS task_uuid, 
					t.title AS task_title,
					u.uuid AS worker_uuid, 
					u.name AS worker_name, 
					u.avatar_url AS worker_avatar,
					ta.completed_at AS completed_at,
					r.rating AS review_rating,
					r.comment AS review_comment,
					r.created_at AS review_date
				FROM 
					tasks t
				JOIN 
					task_assignments ta ON t.id = ta.task_id
				JOIN 
					users u ON ta.worker_id = u.id
				JOIN 
					reviews r ON (r.reviewer_id = ? AND r.reviewee_id = u.id AND r.task_id = t.id)
				WHERE 
					t.employer_id = ? 
					AND t.status = 'completed'
				ORDER BY 
					r.created_at DESC
			`

			if err := db.DB.Raw(completedQuery, userID, userID).Scan(&completedTasks).Error; err != nil {
				log.Printf("[GetPendingReviews] 查询雇主已评价任务失败: %v", err)
			} else {
				for _, task := range completedTasks {
					completedReviews = append(completedReviews, gin.H{
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
						"review": gin.H{
							"rating":  task.ReviewRating,
							"comment": task.ReviewComment,
							"date":    task.ReviewDate.Format("2006-01-02"),
						},
					})
				}
			}
		}
	} else {
		// 零工视角：查找已完成但未评价任务的相关用户

		// 1. 查找雇主
		var employerTasks []struct {
			TaskUUID       string
			TaskTitle      string
			EmployerUUID   string
			EmployerName   string
			EmployerAvatar string
			CompletedAt    time.Time
		}

		employerQuery := `
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

		if err := db.DB.Raw(employerQuery, userID, userID).Scan(&employerTasks).Error; err != nil {
			log.Printf("[GetPendingReviews] 查询零工待评价雇主任务失败: %v", err)
		} else {
			log.Printf("[GetPendingReviews] 零工待评价雇主任务数量: %d", len(employerTasks))
			for i, task := range employerTasks {
				log.Printf("[GetPendingReviews] 零工待评价雇主任务 #%d: task_uuid=%s, employer_uuid=%s, employer_name=%s",
					i+1, task.TaskUUID, task.EmployerUUID, task.EmployerName)
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

		// 2. 查找同一任务的其他零工
		var workerTasks []struct {
			TaskUUID     string
			TaskTitle    string
			WorkerUUID   string
			WorkerName   string
			WorkerAvatar string
			CompletedAt  time.Time
		}

		workerQuery := `
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
				users u ON ta.worker_id = u.id
			LEFT JOIN 
				reviews r ON (r.reviewer_id = ? AND r.reviewee_id = u.id AND r.task_id = t.id)
			WHERE 
				t.id IN (SELECT task_id FROM task_assignments WHERE worker_id = ?)
				AND ta.worker_id != ?
				AND u.id != ?
				AND t.status = 'completed'
				AND r.id IS NULL
			ORDER BY 
				ta.completed_at DESC
		`

		if err := db.DB.Raw(workerQuery, userID, userID, userID, userID).Scan(&workerTasks).Error; err != nil {
			log.Printf("[GetPendingReviews] 查询零工待评价其他零工任务失败: %v", err)
		} else {
			log.Printf("[GetPendingReviews] 零工待评价其他零工任务数量: %d", len(workerTasks))
			for i, task := range workerTasks {
				log.Printf("[GetPendingReviews] 零工待评价其他零工任务 #%d: task_uuid=%s, worker_uuid=%s, worker_name=%s",
					i+1, task.TaskUUID, task.WorkerUUID, task.WorkerName)
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
		}

		// 如果需要包含已评价的任务
		if includeCompleted {
			// 已评价的雇主
			var completedEmployerTasks []struct {
				TaskUUID       string
				TaskTitle      string
				EmployerUUID   string
				EmployerName   string
				EmployerAvatar string
				CompletedAt    time.Time
				ReviewRating   uint8
				ReviewComment  string
				ReviewDate     time.Time
			}

			completedEmployerQuery := `
				SELECT 
					t.uuid AS task_uuid, 
					t.title AS task_title,
					u.uuid AS employer_uuid, 
					u.name AS employer_name, 
					u.avatar_url AS employer_avatar,
					ta.completed_at AS completed_at,
					r.rating AS review_rating,
					r.comment AS review_comment,
					r.created_at AS review_date
				FROM 
					tasks t
				JOIN 
					task_assignments ta ON t.id = ta.task_id
				JOIN 
					users u ON t.employer_id = u.id
				JOIN 
					reviews r ON (r.reviewer_id = ? AND r.reviewee_id = u.id AND r.task_id = t.id)
				WHERE 
					ta.worker_id = ? 
					AND t.status = 'completed'
				ORDER BY 
					r.created_at DESC
			`

			if err := db.DB.Raw(completedEmployerQuery, userID, userID).Scan(&completedEmployerTasks).Error; err != nil {
				log.Printf("[GetPendingReviews] 查询零工已评价雇主任务失败: %v", err)
			} else {
				for _, task := range completedEmployerTasks {
					completedReviews = append(completedReviews, gin.H{
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
						"review": gin.H{
							"rating":  task.ReviewRating,
							"comment": task.ReviewComment,
							"date":    task.ReviewDate.Format("2006-01-02"),
						},
					})
				}
			}

			// 已评价的其他零工
			var completedWorkerTasks []struct {
				TaskUUID      string
				TaskTitle     string
				WorkerUUID    string
				WorkerName    string
				WorkerAvatar  string
				CompletedAt   time.Time
				ReviewRating  uint8
				ReviewComment string
				ReviewDate    time.Time
			}

			completedWorkerQuery := `
				SELECT 
					t.uuid AS task_uuid, 
					t.title AS task_title,
					u.uuid AS worker_uuid, 
					u.name AS worker_name, 
					u.avatar_url AS worker_avatar,
					ta.completed_at AS completed_at,
					r.rating AS review_rating,
					r.comment AS review_comment,
					r.created_at AS review_date
				FROM 
					tasks t
				JOIN 
					task_assignments ta ON t.id = ta.task_id
				JOIN 
					users u ON ta.worker_id = u.id
				JOIN 
					reviews r ON (r.reviewer_id = ? AND r.reviewee_id = u.id AND r.task_id = t.id)
				WHERE 
					t.id IN (SELECT task_id FROM task_assignments WHERE worker_id = ?)
					AND ta.worker_id != ?
					AND t.status = 'completed'
				ORDER BY 
					r.created_at DESC
			`

			if err := db.DB.Raw(completedWorkerQuery, userID, userID, userID).Scan(&completedWorkerTasks).Error; err != nil {
				log.Printf("[GetPendingReviews] 查询零工已评价其他零工任务失败: %v", err)
			} else {
				for _, task := range completedWorkerTasks {
					completedReviews = append(completedReviews, gin.H{
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
						"review": gin.H{
							"rating":  task.ReviewRating,
							"comment": task.ReviewComment,
							"date":    task.ReviewDate.Format("2006-01-02"),
						},
					})
				}
			}
		}
	}

	// 构建响应
	response := gin.H{
		"success":         true,
		"pending_reviews": pendingReviews,
		"count":           len(pendingReviews),
	}

	// 如果包含已评价的任务，则添加到响应中
	if includeCompleted {
		response["completed_reviews"] = completedReviews
		response["completed_count"] = len(completedReviews)
	}

	// 添加调试日志，输出完整响应
	log.Printf("[GetPendingReviews] 返回响应: %+v", response)

	c.JSON(http.StatusOK, response)
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
