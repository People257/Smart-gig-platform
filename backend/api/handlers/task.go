package handlers

import (
	"net/http"
	"strings"
	"time"

	"zhlg/backend/db"
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

	if params.Page < 1 {
		params.Page = 1
	}
	if params.Limit < 1 || params.Limit > 50 {
		params.Limit = 10
	}

	var tasks []models.Task
	query := db.DB.Model(&models.Task{}).Preload("Employer").Preload("Skills")

	if params.StatusFilter != "all" && params.StatusFilter != "" {
		query = query.Where("status = ?", params.StatusFilter)
	}
	if params.SearchQuery != "" {
		like := "%" + params.SearchQuery + "%"
		query = query.Where("title LIKE ? OR description LIKE ?", like, like)
	}
	if params.Skills != "" {
		skillNames := strings.Split(params.Skills, ",")
		query = query.Joins("JOIN task_skills ON tasks.id = task_skills.task_id").Joins("JOIN skills ON task_skills.skill_id = skills.id").Where("skills.name IN ?", skillNames)
	}
	if params.LocationType != "" {
		query = query.Where("location_type = ?", params.LocationType)
	}
	// 用户过滤（如我的任务、收藏等）可根据业务需求补充

	totalCount := int64(0)
	query.Count(&totalCount)
	query = query.Offset((params.Page - 1) * params.Limit).Limit(params.Limit)
	query.Order("created_at DESC").Find(&tasks)

	// 格式化返回

	tasksResp := make([]gin.H, 0, len(tasks))
	for _, t := range tasks {
		skills := make([]string, 0)
		for _, s := range t.Skills {
			skills = append(skills, s.Name)
		}
		locationDisplay := "线上远程"
		if t.LocationType == models.LocationTypeOffline && t.LocationDetails != nil {
			locationDisplay = *t.LocationDetails
		}
		tasksResp = append(tasksResp, gin.H{
			"uuid":        t.UUID,
			"title":       t.Title,
			"description": t.Description,
			"employer": gin.H{
				"uuid":       t.Employer.UUID,
				"name":       t.Employer.Name,
				"avatar_url": t.Employer.AvatarURL,
			},
			"status":           t.Status,
			"skills":           skills,
			"location":         locationDisplay,
			"start_date":       t.StartDate.Format("2006-01-02"),
			"end_date":         t.EndDate.Format("2006-01-02"),
			"budget_display":   t.BudgetDisplay(),
			"applicants_count": len(t.Applications),
			"created_at":       t.CreatedAt.Format(time.RFC3339),
		})
	}

	c.JSON(http.StatusOK, gin.H{
		"tasks": tasksResp,
		"pagination": gin.H{
			"current_page":   params.Page,
			"total_pages":    (totalCount + int64(params.Limit) - 1) / int64(params.Limit),
			"total_items":    totalCount,
			"items_per_page": params.Limit,
		},
	})
}

// CreateTask handles creating a new task by an employer
func CreateTask(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "未登录"})
		return
	}
	var user models.User
	if err := db.DB.First(&user, userID).Error; err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "用户不存在"})
		return
	}
	if user.UserType != models.UserTypeEmployer {
		c.JSON(http.StatusForbidden, gin.H{"error": "只有雇主才能发布任务"})
		return
	}
	var req CreateTaskRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "请求参数错误", "details": err.Error()})
		return
	}
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
	if startDate.Before(time.Now().Truncate(24 * time.Hour)) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "请求参数错误", "details": "开始日期不能早于今天"})
		return
	}
	if endDate.Before(startDate) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "请求参数错误", "details": "结束日期不能早于开始日期"})
		return
	}
	var locationType models.LocationType
	switch req.LocationType {
	case "online":
		locationType = models.LocationTypeOnline
	case "offline":
		locationType = models.LocationTypeOffline
	}
	var paymentType models.PaymentType
	switch req.PaymentType {
	case "hourly":
		paymentType = models.PaymentTypeHourly
	case "daily":
		paymentType = models.PaymentTypeDaily
	case "fixed":
		paymentType = models.PaymentTypeFixed
	}
	task := models.Task{
		UUID:         uuid.New().String(),
		EmployerID:   user.ID,
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
	if locationType == models.LocationTypeOffline && req.LocationDetails != "" {
		task.LocationDetails = &req.LocationDetails
	}
	now := time.Now()
	task.PublishedAt = &now
	if err := db.DB.Create(&task).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "任务创建失败", "details": err.Error()})
		return
	}
	// 处理技能
	for _, skillName := range req.Skills {
		var skill models.Skill
		db.DB.Where("name = ?", skillName).FirstOrCreate(&skill, models.Skill{Name: skillName})
		db.DB.Model(&task).Association("Skills").Append(&skill)
	}
	locationDisplay := "线上远程"
	if locationType == models.LocationTypeOffline && task.LocationDetails != nil {
		locationDisplay = *task.LocationDetails
	}
	skills := make([]string, 0)
	for _, s := range task.Skills {
		skills = append(skills, s.Name)
	}
	c.JSON(http.StatusCreated, gin.H{
		"message": "任务发布成功",
		"task": gin.H{
			"uuid":        task.UUID,
			"title":       task.Title,
			"description": task.Description,
			"employer": gin.H{
				"uuid":       user.UUID,
				"name":       user.Name,
				"avatar_url": user.AvatarURL,
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
	var task models.Task
	err := db.DB.Preload("Employer").Preload("Skills").Preload("Applications").Where("uuid = ?", taskUUID).First(&task).Error
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "任务未找到"})
		return
	}
	skills := make([]string, 0)
	for _, s := range task.Skills {
		skills = append(skills, s.Name)
	}
	locationDisplay := "线上远程"
	if task.LocationType == models.LocationTypeOffline && task.LocationDetails != nil {
		locationDisplay = *task.LocationDetails
	}
	response := gin.H{
		"uuid":        task.UUID,
		"title":       task.Title,
		"description": task.Description,
		"employer": gin.H{
			"uuid":       task.Employer.UUID,
			"name":       task.Employer.Name,
			"avatar_url": task.Employer.AvatarURL,
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
		"applicants_count": len(task.Applications),
		"created_at":       task.CreatedAt.Format(time.RFC3339),
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

	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "未登录"})
		return
	}
	var user models.User
	if err := db.DB.First(&user, userID).Error; err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "用户不存在"})
		return
	}
	if user.UserType != models.UserTypeWorker {
		c.JSON(http.StatusForbidden, gin.H{"error": "只有零工才能申请任务"})
		return
	}

	var req TaskApplicationRequest
	_ = c.ShouldBindJSON(&req) // cover letter 可选

	var task models.Task
	if err := db.DB.Where("uuid = ? AND status = ?", taskUUID, models.TaskStatusRecruiting).First(&task).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "任务未找到或已关闭"})
		return
	}

	var existingApplication models.TaskApplication
	if err := db.DB.Where("task_id = ? AND worker_id = ?", task.ID, user.ID).First(&existingApplication).Error; err == nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "已申请该任务"})
		return
	}

	application := models.TaskApplication{
		UUID:      uuid.New().String(),
		TaskID:    task.ID,
		WorkerID:  user.ID,
		Status:    models.ApplicationStatusPending,
		AppliedAt: time.Now(),
		UpdatedAt: time.Now(),
	}
	if req.CoverLetter != "" {
		coverLetter := req.CoverLetter
		application.CoverLetter = &coverLetter
	}
	if err := db.DB.Create(&application).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "任务申请失败", "details": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "任务申请成功"})
}
