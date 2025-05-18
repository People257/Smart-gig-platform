package handlers

import (
	"net/http"
	"strconv"
	"time"

	"zhlg/backend/models"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// TaskQueryParams represents the query parameters for fetching tasks
type TaskQueryParams struct {
	Page         int    `form:"page,default=1"`
	Limit        int    `form:"limit,default=10"`
	SearchQuery  string `form:"search_query"`
	StatusFilter string `form:"status_filter,default=all"`
	UserScope    string `form:"user_scope,default=all"`
	Skills       string `form:"skills"`
	LocationType string `form:"location_type"`
	SortBy       string `form:"sort_by,default=created_at_desc"`
}

// CreateTaskRequest represents the request body for creating a new task
type CreateTaskRequest struct {
	Title           string   `json:"title" binding:"required"`
	Description     string   `json:"description" binding:"required"`
	LocationType    string   `json:"location_type" binding:"required,oneof=online offline"`
	LocationDetails string   `json:"location_details"`
	StartDate       string   `json:"start_date" binding:"required"`
	EndDate         string   `json:"end_date" binding:"required"`
	PaymentType     string   `json:"payment_type" binding:"required,oneof=hourly daily fixed"`
	BudgetAmount    float64  `json:"budget_amount" binding:"required,gt=0"`
	Headcount       int      `json:"headcount" binding:"required,gt=0"`
	Skills          []string `json:"skills" binding:"required"`
	IsPublic        bool     `json:"is_public"`
	IsUrgent        bool     `json:"is_urgent"`
}

// TaskApplicationRequest represents the request body for applying to a task
type TaskApplicationRequest struct {
	CoverLetter string `json:"cover_letter"`
}

// GetTasks handles fetching a list of tasks with filtering, search, and pagination
func GetTasks(c *gin.Context) {
	var params TaskQueryParams
	if err := c.ShouldBindQuery(&params); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "无效的筛选参数", "details": err.Error()})
		return
	}

	// Enforce reasonable limits
	if params.Page < 1 {
		params.Page = 1
	}
	if params.Limit < 1 || params.Limit > 50 {
		params.Limit = 10
	}

	// In a real application, we would query the database with these parameters
	// var tasks []models.Task
	// query := db.Model(&models.Task).Preload("Employer").Preload("Skills")

	// Apply filters
	// if params.StatusFilter != "all" {
	//   query = query.Where("status = ?", params.StatusFilter)
	// }

	// Apply search
	// if params.SearchQuery != "" {
	//   query = query.Where("title LIKE ? OR description LIKE ?",
	//     "%"+params.SearchQuery+"%", "%"+params.SearchQuery+"%")
	// }

	// Apply skills filter
	// if params.Skills != "" {
	//   skillNames := strings.Split(params.Skills, ",")
	//   query = query.Joins("JOIN task_skills ON tasks.id = task_skills.task_id")
	//           .Joins("JOIN skills ON task_skills.skill_id = skills.id")
	//           .Where("skills.name IN (?)", skillNames)
	// }

	// Apply location type filter
	// if params.LocationType != "" {
	//   query = query.Where("location_type = ?", params.LocationType)
	// }

	// Apply user scope filter (requires authentication)
	// userID, exists := c.Get("userID")
	// if exists && params.UserScope != "all" {
	//   switch params.UserScope {
	//   case "my_posted":
	//     query = query.Where("employer_id = ?", userID)
	//   case "my_applied":
	//     query = query.Joins("JOIN task_applications ON tasks.id = task_applications.task_id")
	//             .Where("task_applications.worker_id = ?", userID)
	//   case "my_favorited":
	//     query = query.Joins("JOIN user_favorites ON tasks.id = user_favorites.task_id")
	//             .Where("user_favorites.user_id = ?", userID)
	//   }
	// }

	// Apply sorting
	// switch params.SortBy {
	// case "created_at_desc":
	//   query = query.Order("created_at DESC")
	// case "budget_asc":
	//   query = query.Order("budget_amount ASC")
	// case "budget_desc":
	//   query = query.Order("budget_amount DESC")
	// case "start_date_asc":
	//   query = query.Order("start_date ASC")
	// }

	// Count total items for pagination
	// var totalCount int
	// query.Count(&totalCount)

	// Apply pagination
	// query = query.Offset((params.Page - 1) * params.Limit).Limit(params.Limit)

	// Execute query
	// query.Find(&tasks)

	// Create mock tasks for demo
	totalCount := 50
	tasks := make([]gin.H, 0)

	for i := 1; i <= 10; i++ {
		locationType := "线上远程"
		if i%2 != 0 {
			locationType = "广州市天河区"
		}

		tasks = append(tasks, gin.H{
			"uuid":        uuid.New().String(),
			"title":       "任务标题 " + strconv.Itoa(i),
			"description": "这是任务描述，详细说明任务需求和要求。",
			"employer": gin.H{
				"uuid":       "employer-uuid-123",
				"name":       "测试雇主",
				"avatar_url": "https://example.com/avatar.jpg",
			},
			"status":           "recruiting",
			"skills":           []string{"UI设计", "Web开发"},
			"location":         locationType,
			"start_date":       "2023-11-01",
			"end_date":         "2023-12-01",
			"budget_display":   "100元/小时",
			"applicants_count": i * 2,
			"created_at":       time.Now().AddDate(0, 0, -i).Format(time.RFC3339),
		})
	}

	// Return tasks with pagination info
	c.JSON(http.StatusOK, gin.H{
		"tasks": tasks,
		"pagination": gin.H{
			"current_page":   params.Page,
			"total_pages":    (totalCount + params.Limit - 1) / params.Limit,
			"total_items":    totalCount,
			"items_per_page": params.Limit,
		},
	})
}

// CreateTask handles creating a new task by an employer
func CreateTask(c *gin.Context) {
	var req CreateTaskRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "请求参数错误", "details": err.Error()})
		return
	}

	// Parse dates
	startDate, err := time.Parse("2006-01-02", req.StartDate)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "请求参数错误", "details": "开始日期格式不正确"})
		return
	}

	endDate, err := time.Parse("2006-01-02", req.EndDate)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "请求参数错误", "details": "结束日期格式不正确"})
		return
	}

	// Validate dates
	if startDate.Before(time.Now().Truncate(24 * time.Hour)) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "请求参数错误", "details": "开始日期不能早于今天"})
		return
	}

	if endDate.Before(startDate) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "请求参数错误", "details": "结束日期不能早于开始日期"})
		return
	}

	// In a real application, we would get the employer ID from the authenticated user
	// employerID := c.GetUint("userID")

	// Convert location type string to enum
	var locationType models.LocationType
	switch req.LocationType {
	case "online":
		locationType = models.LocationTypeOnline
	case "offline":
		locationType = models.LocationTypeOffline
	}

	// Convert payment type string to enum
	var paymentType models.PaymentType
	switch req.PaymentType {
	case "hourly":
		paymentType = models.PaymentTypeHourly
	case "daily":
		paymentType = models.PaymentTypeDaily
	case "fixed":
		paymentType = models.PaymentTypeFixed
	}

	// Create a new task
	task := models.Task{
		UUID:         uuid.New().String(),
		EmployerID:   1, // Mock employer ID
		Title:        req.Title,
		Description:  req.Description,
		LocationType: locationType,
		StartDate:    startDate,
		EndDate:      endDate,
		PaymentType:  paymentType,
		BudgetAmount: req.BudgetAmount,
		Headcount:    uint(req.Headcount),
		Status:       models.TaskStatusRecruiting,
		IsPublic:     req.IsPublic,
		IsUrgent:     req.IsUrgent,
	}

	// Add location details for offline tasks
	if locationType == models.LocationTypeOffline && req.LocationDetails != "" {
		task.LocationDetails = &req.LocationDetails
	}

	// Set published date
	now := time.Now()
	task.PublishedAt = &now

	// In a real application, we would save the task to the database
	// db.Create(&task)

	// Add skills to the task
	// for _, skillName := range req.Skills {
	//   var skill models.Skill
	//   db.Where("name = ?", skillName).FirstOrCreate(&skill, models.Skill{Name: skillName})
	//   db.Model(&task).Association("Skills").Append(&skill)
	// }

	// Create mock skills for demo
	skills := make([]models.Skill, 0)
	for i, skillName := range req.Skills {
		skills = append(skills, models.Skill{
			ID:   uint(i + 1),
			Name: skillName,
		})
	}

	locationDisplay := "线上远程"
	if locationType == models.LocationTypeOffline && task.LocationDetails != nil {
		locationDisplay = *task.LocationDetails
	}

	// Return success response with the created task
	c.JSON(http.StatusCreated, gin.H{
		"message": "任务发布成功",
		"task": gin.H{
			"uuid":        task.UUID,
			"title":       task.Title,
			"description": task.Description,
			"employer": gin.H{
				"uuid":       "employer-uuid-123",
				"name":       "测试雇主",
				"avatar_url": "https://example.com/avatar.jpg",
			},
			"status":           task.Status,
			"skills":           skills,
			"location":         locationDisplay,
			"start_date":       task.StartDate.Format("2006-01-02"),
			"end_date":         task.EndDate.Format("2006-01-02"),
			"budget_display":   task.BudgetDisplay(),
			"applicants_count": 0,
			"created_at":       task.CreatedAt.Format(time.RFC3339),
		},
	})
}

// GetTaskByUUID handles retrieving task details by UUID
func GetTaskByUUID(c *gin.Context) {
	taskUUID := c.Param("uuid")
	if taskUUID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "缺少任务ID"})
		return
	}

	// In a real application, we would retrieve the task from the database
	// var task models.Task
	// if db.Preload("Employer").Preload("Skills").Preload("Applications.Worker").
	//   Where("uuid = ?", taskUUID).First(&task).RecordNotFound() {
	//   c.JSON(http.StatusNotFound, gin.H{"error": "任务未找到"})
	//   return
	// }

	// Create mock task for demo
	task := models.Task{
		ID:           1,
		UUID:         taskUUID,
		EmployerID:   1,
		Title:        "任务详情标题",
		Description:  "这是详细的任务描述，包含了任务的需求、要求、期望成果等信息。",
		LocationType: models.LocationTypeOnline,
		StartDate:    time.Now().AddDate(0, 0, 5),
		EndDate:      time.Now().AddDate(0, 1, 5),
		PaymentType:  models.PaymentTypeHourly,
		BudgetAmount: 100.00,
		Currency:     "CNY",
		Headcount:    2,
		Status:       models.TaskStatusRecruiting,
		IsPublic:     true,
		IsUrgent:     false,
		CreatedAt:    time.Now().AddDate(0, 0, -2),
	}

	// Create mock skills for demo
	skills := []models.Skill{
		{ID: 1, Name: "UI设计"},
		{ID: 2, Name: "Web开发"},
	}

	// Create mock applications for demo (only visible to employer)
	applications := []gin.H{
		{
			"user_uuid": "worker-uuid-123",
			"user_name": "申请者1",
			"status":    "pending",
		},
		{
			"user_uuid": "worker-uuid-456",
			"user_name": "申请者2",
			"status":    "pending",
		},
	}

	// Check if requester is the employer
	// userID, exists := c.Get("userID")
	// isEmployer := exists && userID.(uint) == task.EmployerID
	isEmployer := true // Mock for demo

	locationDisplay := "线上远程"
	if task.LocationType == models.LocationTypeOffline {
		locationDisplay = "广州市天河区" // Mock location for demo
	}

	// Create response
	response := gin.H{
		"uuid":        task.UUID,
		"title":       task.Title,
		"description": task.Description,
		"employer": gin.H{
			"uuid":       "employer-uuid-123",
			"name":       "测试雇主",
			"avatar_url": "https://example.com/avatar.jpg",
		},
		"status":           task.Status,
		"skills":           skills,
		"location":         locationDisplay,
		"start_date":       task.StartDate.Format("2006-01-02"),
		"end_date":         task.EndDate.Format("2006-01-02"),
		"budget_display":   task.BudgetDisplay(),
		"payment_type":     task.PaymentType,
		"budget_amount":    task.BudgetAmount,
		"headcount":        task.Headcount,
		"is_public":        task.IsPublic,
		"is_urgent":        task.IsUrgent,
		"applicants_count": 2,
		"created_at":       task.CreatedAt.Format(time.RFC3339),
	}

	// Add applications if requester is the employer
	if isEmployer {
		response["applications"] = applications
	}

	c.JSON(http.StatusOK, response)
}

// ApplyToTask handles a worker applying to a task
func ApplyToTask(c *gin.Context) {
	taskUUID := c.Param("uuid")
	if taskUUID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "缺少任务ID"})
		return
	}

	var req TaskApplicationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		// This is optional, so we don't return an error
	}

	// In a real application, we would check if the task exists and is still recruiting
	// var task models.Task
	// if db.Where("uuid = ? AND status = ?", taskUUID, models.TaskStatusRecruiting).First(&task).RecordNotFound() {
	//   c.JSON(http.StatusNotFound, gin.H{"error": "任务未找到或已关闭"})
	//   return
	// }

	// In a real application, we would check if the worker has already applied to this task
	// workerID := c.GetUint("userID")
	// var existingApplication models.TaskApplication
	// if !db.Where("task_id = ? AND worker_id = ?", task.ID, workerID).First(&existingApplication).RecordNotFound() {
	//   c.JSON(http.StatusBadRequest, gin.H{"error": "已申请该任务"})
	//   return
	// }

	// Create a new application
	application := models.TaskApplication{
		UUID:      uuid.New().String(),
		TaskID:    1, // Mock task ID
		WorkerID:  1, // Mock worker ID
		Status:    models.ApplicationStatusPending,
		AppliedAt: time.Now(),
		UpdatedAt: time.Now(),
	}

	// Add cover letter if provided
	if req.CoverLetter != "" {
		coverLetter := req.CoverLetter
		application.CoverLetter = &coverLetter
	}

	// In a real application, we would save the application to the database
	// db.Create(&application)

	// Return success response
	c.JSON(http.StatusOK, gin.H{
		"message": "任务申请成功",
	})
}
