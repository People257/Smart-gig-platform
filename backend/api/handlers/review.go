package handlers

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// CreateReviewRequest represents the request body for creating a new review
type CreateReviewRequest struct {
	Rating       int    `json:"rating" binding:"required,min=1,max=5"`
	Comment      string `json:"comment" binding:"required"`
	TaskUUID     string `json:"task_uuid" binding:"required"`
	ReviewedUUID string `json:"reviewed_uuid" binding:"required"`
}

// GetUserReviews handles fetching reviews for a specific user
func GetUserReviews(c *gin.Context) {
	userUUID := c.Param("uuid")
	if userUUID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "缺少用户ID"})
		return
	}

	// In a real application, we would get the user from the database
	// var user models.User
	// if db.Where("uuid = ?", userUUID).First(&user).RecordNotFound() {
	//   c.JSON(http.StatusNotFound, gin.H{"error": "用户未找到"})
	//   return
	// }

	// In a real application, we would get the reviews for this user from the database
	// var reviews []models.Review
	// db.Where("reviewed_id = ?", user.ID).
	//   Preload("Reviewer").
	//   Preload("Task").
	//   Order("created_at DESC").
	//   Find(&reviews)

	// Create mock reviews for demo
	reviews := make([]gin.H, 0)

	for i := 1; i <= 5; i++ {
		reviews = append(reviews, gin.H{
			"uuid":    uuid.New().String(),
			"rating":  5 - (i % 3),
			"comment": "这位工作者非常专业，按时完成了任务，并且质量很高。我非常满意他的工作成果，期待今后有机会再次合作。",
			"reviewer": gin.H{
				"uuid":       uuid.New().String(),
				"name":       "评价人 " + uuid.New().String()[0:8],
				"avatar_url": "https://example.com/avatar.jpg",
			},
			"task": gin.H{
				"uuid":  uuid.New().String(),
				"title": "UI设计项目",
			},
			"created_at": time.Now().AddDate(0, 0, -i*7).Format(time.RFC3339),
		})
	}

	// Calculate average rating
	totalRating := 0
	for _, review := range reviews {
		totalRating += review["rating"].(int)
	}

	averageRating := 0.0
	if len(reviews) > 0 {
		averageRating = float64(totalRating) / float64(len(reviews))
	}

	c.JSON(http.StatusOK, gin.H{
		"reviews": reviews,
		"stats": gin.H{
			"total":          len(reviews),
			"average_rating": averageRating,
		},
	})
}

// CreateReview handles creating a new review
func CreateReview(c *gin.Context) {
	var req CreateReviewRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "请求参数错误", "details": err.Error()})
		return
	}

	// In a real application, we would get the reviewer ID from the authenticated user
	// reviewerID := c.GetUint("userID")

	// In a real application, we would check if the task exists and is completed
	// var task models.Task
	// if db.Where("uuid = ? AND status = ?", req.TaskUUID, models.TaskStatusCompleted).First(&task).RecordNotFound() {
	//   c.JSON(http.StatusBadRequest, gin.H{"error": "任务不存在或未完成"})
	//   return
	// }

	// In a real application, we would check if the reviewer is the employer of the task
	// if task.EmployerID != reviewerID {
	//   c.JSON(http.StatusForbidden, gin.H{"error": "无权评价此任务"})
	//   return
	// }

	// In a real application, we would check if the reviewed user was assigned to the task
	// var taskAssignment models.TaskAssignment
	// if db.Where("task_id = ? AND status = ?", task.ID, models.AssignmentStatusCompleted).First(&taskAssignment).RecordNotFound() {
	//   c.JSON(http.StatusBadRequest, gin.H{"error": "该用户未完成此任务"})
	//   return
	// }

	// var reviewedUser models.User
	// if db.Where("uuid = ?", req.ReviewedUUID).First(&reviewedUser).RecordNotFound() {
	//   c.JSON(http.StatusNotFound, gin.H{"error": "被评价用户未找到"})
	//   return
	// }

	// In a real application, we would check if a review already exists
	// var existingReview models.Review
	// if !db.Where("reviewer_id = ? AND reviewed_id = ? AND task_id = ?",
	//     reviewerID, reviewedUser.ID, task.ID).First(&existingReview).RecordNotFound() {
	//   c.JSON(http.StatusBadRequest, gin.H{"error": "已对此任务进行评价"})
	//   return
	// }

	// Create a new review
	review := gin.H{
		"uuid":    uuid.New().String(),
		"rating":  req.Rating,
		"comment": req.Comment,
		"reviewer": gin.H{
			"uuid":       "reviewer-uuid-123",
			"name":       "测试评价人",
			"avatar_url": "https://example.com/avatar.jpg",
		},
		"reviewed": gin.H{
			"uuid":       req.ReviewedUUID,
			"name":       "被评价人",
			"avatar_url": "https://example.com/avatar.jpg",
		},
		"task": gin.H{
			"uuid":  req.TaskUUID,
			"title": "测试任务",
		},
		"created_at": time.Now().Format(time.RFC3339),
	}

	// In a real application, we would save the review to the database
	// db.Create(&review)

	// In a real application, we would update the user's average rating
	// var userReviews []models.Review
	// db.Where("reviewed_id = ?", reviewedUser.ID).Find(&userReviews)

	// totalRating := 0
	// for _, r := range userReviews {
	//   totalRating += r.Rating
	// }

	// averageRating := float64(totalRating) / float64(len(userReviews))
	// db.Model(&reviewedUser).Update("rating", averageRating)

	// Return success response
	c.JSON(http.StatusOK, gin.H{
		"message": "评价提交成功",
		"review":  review,
	})
}

// GetPendingReviews handles fetching reviews that the user needs to submit
func GetPendingReviews(c *gin.Context) {
	// In a real application, we would get the user ID from the authenticated user
	// userID := c.GetUint("userID")

	// In a real application, we would get the tasks that the user needs to review
	// For employers: completed tasks they've posted where they haven't left a review
	// var pendingReviews []models.Task
	// db.Where(
	//   "employer_id = ? AND status = ? AND id NOT IN (SELECT task_id FROM reviews WHERE reviewer_id = ?)",
	//   userID, models.TaskStatusCompleted, userID,
	// ).
	//   Preload("Worker").
	//   Find(&pendingReviews)

	// Create mock pending reviews for demo
	pendingReviews := make([]gin.H, 0)

	for i := 1; i <= 3; i++ {
		pendingReviews = append(pendingReviews, gin.H{
			"task": gin.H{
				"uuid":  uuid.New().String(),
				"title": "待评价任务 " + uuid.New().String()[0:8],
			},
			"user": gin.H{
				"uuid":       uuid.New().String(),
				"name":       "待评价用户 " + uuid.New().String()[0:8],
				"avatar_url": "https://example.com/avatar.jpg",
				"user_type":  "worker",
			},
			"completed_at": time.Now().AddDate(0, 0, -i).Format(time.RFC3339),
		})
	}

	c.JSON(http.StatusOK, gin.H{
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

	// In a real application, we would get the user from the database
	// var user models.User
	// if db.Where("uuid = ?", userUUID).First(&user).RecordNotFound() {
	//   c.JSON(http.StatusNotFound, gin.H{"error": "用户未找到"})
	//   return
	// }

	// In a real application, we would calculate the ratings from the database
	// var ratings [5]int
	// db.Model(&models.Review{}).
	//   Where("reviewed_id = ?", user.ID).
	//   Select("rating, COUNT(*) as count").
	//   Group("rating").
	//   Scan(&ratings)

	// Create mock ratings for demo
	ratings := []gin.H{
		{"rating": 5, "count": 15},
		{"rating": 4, "count": 7},
		{"rating": 3, "count": 3},
		{"rating": 2, "count": 1},
		{"rating": 1, "count": 0},
	}

	// Calculate total and average
	totalCount := 0
	totalRating := 0
	for _, r := range ratings {
		count := r["count"].(int)
		rating := r["rating"].(int)
		totalCount += count
		totalRating += rating * count
	}

	averageRating := 0.0
	if totalCount > 0 {
		averageRating = float64(totalRating) / float64(totalCount)
	}

	c.JSON(http.StatusOK, gin.H{
		"ratings":        ratings,
		"total_reviews":  totalCount,
		"average_rating": averageRating,
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

	// In a real application, we would get the user ID from the authenticated user
	// userID := c.GetUint("userID")

	// In a real application, we would check if the review exists
	// var review models.Review
	// if db.Where("uuid = ?", reviewUUID).First(&review).RecordNotFound() {
	//   c.JSON(http.StatusNotFound, gin.H{"error": "评价不存在"})
	//   return
	// }

	// In a real application, we would check if the user is allowed to report this review
	// if review.ReviewedID != userID {
	//   c.JSON(http.StatusForbidden, gin.H{"error": "无权举报此评价"})
	//   return
	// }

	// In a real application, we would check if the user has already reported this review
	// var existingReport models.ReviewReport
	// if !db.Where("review_id = ? AND reporter_id = ?", review.ID, userID).First(&existingReport).RecordNotFound() {
	//   c.JSON(http.StatusBadRequest, gin.H{"error": "已举报此评价"})
	//   return
	// }

	// In a real application, we would create a new report
	// report := models.ReviewReport{
	//   UUID:       uuid.New().String(),
	//   ReviewID:   review.ID,
	//   ReporterID: userID,
	//   Reason:     req.Reason,
	//   Status:     models.ReportStatusPending,
	//   CreatedAt:  time.Now(),
	//   UpdatedAt:  time.Now(),
	// }
	// db.Create(&report)

	// Return success response
	c.JSON(http.StatusOK, gin.H{
		"message": "举报提交成功，我们将尽快审核",
	})
}
