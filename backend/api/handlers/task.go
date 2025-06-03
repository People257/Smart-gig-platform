package handlers

import (
	"fmt"
	"net/http"
	"strings"
	"time"

	"zhlg/backend/db"
	"zhlg/backend/models"

	"log"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

// TaskQueryParams represents the query parameters for fetching tasks
type TaskQueryParams struct {
	Page         int    `form:"page,default=1"`
	Limit        int    `form:"limit,default=10"`
	SearchQuery  string `form:"search_query"`
	StatusFilter string `form:"status,default=all"`
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
	EstimatedHours  float64  `json:"estimated_hours" binding:"min=0"`
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
	// 添加调试日志：原始请求参数
	log.Printf("[GetTasks] 原始请求参数: %v", c.Request.URL.Query())

	// 检查status参数是否直接存在于URL中
	statusParam := c.Query("status")
	log.Printf("[GetTasks] 直接从URL获取的status参数: '%s'", statusParam)

	var params TaskQueryParams
	if err := c.ShouldBindQuery(&params); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "无效的筛选参数", "details": err.Error()})
		return
	}

	// 添加调试日志：打印接收到的status参数
	log.Printf("[GetTasks] 接收到的状态参数: '%s'", params.StatusFilter)

	if params.Page < 1 {
		params.Page = 1
	}
	if params.Limit < 1 || params.Limit > 50 {
		params.Limit = 10
	}

	var tasks []models.Task
	query := db.DB.Debug().Model(&models.Task{}).Preload("Employer").Preload("Skills")

	// 调试查看最终获取的任务列表
	defer func() {
		log.Printf("[GetTasks] 返回任务数量: %d", len(tasks))
		for i, task := range tasks {
			log.Printf("[GetTasks] 任务 #%d: UUID=%s, 标题=%s, 状态=%s",
				i+1, task.UUID, task.Title, task.Status)
		}
	}()

	// 直接使用URL中的status参数进行筛选，如果存在
	if statusParam != "" && statusParam != "all" {
		log.Printf("[GetTasks] 使用URL参数进行状态筛选: status = '%s'", statusParam)
		query = query.Where("status = ?", statusParam)
	} else if params.StatusFilter != "all" && params.StatusFilter != "" {
		log.Printf("[GetTasks] 添加状态筛选条件: status = '%s'", params.StatusFilter)
		query = query.Where("status = ?", params.StatusFilter)
	} else {
		log.Printf("[GetTasks] 不添加状态筛选")
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
		UUID:           uuid.New().String(),
		EmployerID:     user.ID,
		Title:          req.Title,
		Description:    req.Description,
		LocationType:   locationType,
		StartDate:      startDate,
		EndDate:        endDate,
		PaymentType:    paymentType,
		BudgetAmount:   req.BudgetAmount,
		EstimatedHours: req.EstimatedHours,
		Headcount:      uint(req.Headcount),
		Status:         models.TaskStatusRecruiting,
		IsPublic:       req.IsPublic,
		IsUrgent:       req.IsUrgent,
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

	// 获取当前登录用户ID（如果有）
	var currentUserID uint
	userIDValue, exists := c.Get("userID")
	if exists {
		// 检查类型并尝试进行适当的类型转换
		switch v := userIDValue.(type) {
		case uint:
			currentUserID = v
			log.Printf("[GetTaskByUUID] userID类型是 uint: %v", currentUserID)
		case int:
			currentUserID = uint(v)
			log.Printf("[GetTaskByUUID] userID类型是 int，转换为uint: %v", currentUserID)
		case float64:
			currentUserID = uint(v)
			log.Printf("[GetTaskByUUID] userID类型是 float64，转换为uint: %v", currentUserID)
		default:
			log.Printf("[GetTaskByUUID] 未知的userID类型: %T, %v", userIDValue, userIDValue)
			if idStr, ok := userIDValue.(string); ok {
				var uintID uint64
				if _, err := fmt.Sscanf(idStr, "%d", &uintID); err == nil {
					currentUserID = uint(uintID)
					log.Printf("[GetTaskByUUID] 从字符串解析userID: %v", currentUserID)
				}
			}
		}
	} else {
		log.Printf("[GetTaskByUUID] 用户未登录或未获取到用户ID")
	}

	var task models.Task
	err := db.DB.Preload("Employer").Preload("Skills").Preload("Applications.Worker").Where("uuid = ?", taskUUID).First(&task).Error
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "任务未找到"})
		return
	}

	log.Printf("[GetTaskByUUID] 任务ID: %d, UUID: %s, 标题: %s, 雇主ID: %d, 申请数量: %d",
		task.ID, task.UUID, task.Title, task.EmployerID, len(task.Applications))

	// 调试输出申请信息
	for i, app := range task.Applications {
		log.Printf("[GetTaskByUUID] 申请 #%d: ID=%d, UUID=%s, 工人ID=%d, 工人名称=%s, 状态=%s",
			i+1, app.ID, app.UUID, app.WorkerID, app.Worker.Name, app.Status)
	}

	// 获取当前用户的申请状态（如果是工人）
	var isApplicant, isWorker bool
	var application models.TaskApplication
	var assignment models.TaskAssignment

	if exists {
		// 检查是否已申请
		if db.DB.Where("task_id = ? AND worker_id = ?", task.ID, currentUserID).First(&application).Error == nil {
			isApplicant = true
			log.Printf("[GetTaskByUUID] 用户 %d 已申请该任务", currentUserID)
		}

		// 检查是否是当前任务的工作者
		log.Printf("[GetTaskByUUID] 尝试查询任务分配: task_id=%d, worker_id=%d", task.ID, currentUserID)

		// 使用原生SQL查询直接检查
		var count int64
		err = db.DB.Raw("SELECT COUNT(*) FROM task_assignments WHERE task_id = ? AND worker_id = ?", task.ID, currentUserID).Count(&count).Error
		if err != nil {
			log.Printf("[GetTaskByUUID] 查询task_assignments时出错: %v", err)
		}

		log.Printf("[GetTaskByUUID] 原生SQL查询结果: count=%d", count)

		if count > 0 {
			isWorker = true
			log.Printf("[GetTaskByUUID] 用户 %d 是该任务的工作者", currentUserID)
		} else {
			// 使用GORM ORM查询，确认是否能找到记录
			if db.DB.Where("task_id = ? AND worker_id = ?", task.ID, currentUserID).First(&assignment).Error == nil {
				isWorker = true
				log.Printf("[GetTaskByUUID] GORM查询成功: 用户 %d 是该任务的工作者, assignment_id=%d", currentUserID, assignment.ID)
			} else {
				log.Printf("[GetTaskByUUID] 未找到任务分配记录")
			}
		}
	}

	skills := make([]string, 0)
	for _, s := range task.Skills {
		skills = append(skills, s.Name)
	}

	locationDisplay := "线上远程"
	if task.LocationType == models.LocationTypeOffline && task.LocationDetails != nil {
		locationDisplay = *task.LocationDetails
	}

	// 始终格式化申请人信息，对于非雇主只展示基本信息
	applicants := []gin.H{}
	isEmployer := exists && currentUserID == task.EmployerID

	for _, app := range task.Applications {
		applicantInfo := gin.H{
			"uuid": app.UUID,
			"worker": gin.H{
				"uuid":       app.Worker.UUID,
				"name":       app.Worker.Name,
				"avatar_url": app.Worker.AvatarURL,
			},
			"status":     app.Status,
			"applied_at": app.AppliedAt.Format(time.RFC3339),
		}

		// 只有雇主能看到详细信息
		if isEmployer {
			applicantInfo["updated_at"] = app.UpdatedAt.Format(time.RFC3339)
			if app.CoverLetter != nil {
				applicantInfo["cover_letter"] = *app.CoverLetter
			}
		}

		applicants = append(applicants, applicantInfo)
	}

	// 记录日志
	if isEmployer {
		log.Printf("[GetTaskByUUID] 用户 %d 是任务的雇主，将显示完整的申请人列表", currentUserID)
	} else if exists {
		log.Printf("[GetTaskByUUID] 用户 %d 不是任务的雇主（雇主ID: %d），显示简化的申请人列表",
			currentUserID, task.EmployerID)
	} else {
		log.Printf("[GetTaskByUUID] 未登录用户访问，显示简化的申请人列表")
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

	log.Printf("[GetTaskByUUID] currentUserID=%v, task.EmployerID=%v, applicants=%d", currentUserID, task.EmployerID, len(applicants))

	// 只对特定用户添加额外字段
	response["is_applicant"] = isApplicant
	response["is_worker"] = isWorker
	// 始终返回申请人列表
	response["applicants"] = applicants

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"task": response,
		},
	})
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

	// 检查用户是否已完成实名认证 - 判断用户是否有身份证信息
	if user.IDCard == nil || *user.IDCard == "" {
		c.JSON(http.StatusForbidden, gin.H{"error": "请先完成实名认证后再申请任务", "require_verification": true})
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

	// 新增：判断申请人数是否已满，自动变更任务状态
	var count int64
	db.DB.Model(&models.TaskApplication{}).Where("task_id = ?", task.ID).Count(&count)
	if int(count) >= int(task.Headcount) && task.Status == models.TaskStatusRecruiting {
		task.Status = models.TaskStatusInProgress
		db.DB.Save(&task)
	}

	c.JSON(http.StatusOK, gin.H{"message": "任务申请成功"})
}

// CompleteTask handles task completion by the worker
// @Summary Complete a task
// @Description Mark a task as completed by the worker
// @Tags tasks
// @Accept json
// @Produce json
// @Param uuid path string true "Task UUID"
// @Success 200 {object} map[string]interface{}
// @Failure 400 {object} ErrorResponse
// @Failure 401 {object} ErrorResponse
// @Failure 403 {object} ErrorResponse
// @Failure 404 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /api/tasks/{uuid}/complete [put]
func CompleteTask(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "未登录"})
		return
	}

	taskUUID := c.Param("uuid")
	if taskUUID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "任务ID不能为空"})
		return
	}

	var task models.Task
	if err := db.DB.Where("uuid = ?", taskUUID).First(&task).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "任务不存在"})
			return
		}
		log.Printf("Error finding task: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "查询任务失败"})
		return
	}

	// Find the task assignment for this worker
	var assignment models.TaskAssignment
	if err := db.DB.Where("task_id = ? AND worker_id = ?", task.ID, userID).First(&assignment).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusForbidden, gin.H{"error": "您不是该任务的执行者"})
			return
		}
		log.Printf("Error finding assignment: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "查询任务分配失败"})
		return
	}

	// Check if task status allows completion
	if task.Status != models.TaskStatusInProgress {
		c.JSON(http.StatusBadRequest, gin.H{"error": "任务不在进行中状态，无法完成"})
		return
	}

	// Start transaction
	tx := db.DB.Begin()

	// Submit work
	assignment.SubmitWork()
	if err := tx.Save(&assignment).Error; err != nil {
		tx.Rollback()
		log.Printf("Error updating assignment: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "更新任务分配状态失败"})
		return
	}

	// Update task status to payment_pending
	task.Status = models.TaskStatusPaymentPending
	if err := tx.Save(&task).Error; err != nil {
		tx.Rollback()
		log.Printf("Error updating task: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "更新任务状态失败"})
		return
	}

	// Commit transaction
	if err := tx.Commit().Error; err != nil {
		log.Printf("Error committing transaction: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "完成任务失败"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "任务已完成，等待雇主确认",
		"task": gin.H{
			"uuid":   task.UUID,
			"status": task.Status,
		},
	})
}

// ConfirmTaskCompletion handles task completion confirmation by the employer
// @Summary Confirm task completion and process payment
// @Description Employer confirms task completion and triggers payment to worker
// @Tags tasks
// @Accept json
// @Produce json
// @Param uuid path string true "Task UUID"
// @Success 200 {object} map[string]interface{}
// @Failure 400 {object} ErrorResponse
// @Failure 401 {object} ErrorResponse
// @Failure 403 {object} ErrorResponse
// @Failure 404 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /api/tasks/{uuid}/confirm [put]
func ConfirmTaskCompletion(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "未登录"})
		return
	}

	taskUUID := c.Param("uuid")
	if taskUUID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "任务ID不能为空"})
		return
	}

	var task models.Task
	if err := db.DB.Preload("Employer").Where("uuid = ?", taskUUID).First(&task).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "任务不存在"})
			return
		}
		log.Printf("Error finding task: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "查询任务失败"})
		return
	}

	// Verify the current user is the employer of this task
	if task.EmployerID != uint(userID.(uint)) {
		c.JSON(http.StatusForbidden, gin.H{"error": "您不是该任务的雇主"})
		return
	}

	// Check if task status allows confirmation
	if task.Status != models.TaskStatusPaymentPending {
		c.JSON(http.StatusBadRequest, gin.H{"error": "任务不在待付款状态，无法确认"})
		return
	}

	// Find the task assignment
	var assignments []models.TaskAssignment
	if err := db.DB.Where("task_id = ? AND employer_status = ?", task.ID, models.EmployerStatusReviewPending).Find(&assignments).Error; err != nil {
		log.Printf("Error finding assignments: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "查询任务分配失败"})
		return
	}

	if len(assignments) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "未找到待确认的任务完成记录"})
		return
	}

	// Start transaction
	tx := db.DB.Begin()

	// Update task status to completed
	task.Status = models.TaskStatusCompleted
	if err := tx.Save(&task).Error; err != nil {
		tx.Rollback()
		log.Printf("Error updating task: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "更新任务状态失败"})
		return
	}

	successCount := 0
	for _, assignment := range assignments {
		// Mark assignment as paid
		assignment.MarkAsPaid()
		if err := tx.Save(&assignment).Error; err != nil {
			log.Printf("Error updating assignment %d: %v", assignment.ID, err)
			continue
		}

		// Create transaction for worker payment
		paymentTransaction := models.Transaction{
			UUID:             uuid.New().String(),
			UserID:           uint(assignment.WorkerID),
			TaskAssignmentID: &assignment.ID,
			Type:             models.TransactionTypeEarning,
			Amount:           task.BudgetAmount / float64(len(assignments)), // Split payment if multiple workers
			Currency:         task.Currency,
			Status:           models.TransactionStatusCompleted,
			Title:            "任务完成报酬",
			Description:      stringPtr(fmt.Sprintf("完成任务：%s", task.Title)),
			ReferenceID:      &task.ID,
			ReferenceType:    models.ReferenceTypeTask,
			ReferenceUUID:    &task.UUID,
		}

		now := time.Now()
		paymentTransaction.CompletedAt = &now

		if err := tx.Create(&paymentTransaction).Error; err != nil {
			log.Printf("Error creating transaction for worker %d: %v", assignment.WorkerID, err)
			continue
		}

		// Update worker's balance
		var worker models.User
		if err := tx.First(&worker, assignment.WorkerID).Error; err != nil {
			log.Printf("Error finding worker %d: %v", assignment.WorkerID, err)
			continue
		}

		worker.Balance += paymentTransaction.Amount
		if err := tx.Save(&worker).Error; err != nil {
			log.Printf("Error updating worker %d balance: %v", assignment.WorkerID, err)
			continue
		}

		successCount++
	}

	// Commit transaction
	if err := tx.Commit().Error; err != nil {
		log.Printf("Error committing transaction: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "确认任务完成失败"})
		return
	}

	if successCount == 0 {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "处理付款时出错，请联系客服"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "任务已确认完成，报酬已支付给工作者",
		"task": gin.H{
			"uuid":   task.UUID,
			"status": task.Status,
		},
	})
}

// AcceptTaskApplication handles accepting a worker's application by the task owner
func AcceptTaskApplication(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "未登录"})
		return
	}

	applicationUUID := c.Param("uuid")
	if applicationUUID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "缺少申请ID"})
		return
	}

	var application models.TaskApplication
	if err := db.DB.Preload("Task").Where("uuid = ?", applicationUUID).First(&application).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "申请不存在"})
		return
	}

	// 验证当前用户是否是任务的发布者
	var task models.Task
	if err := db.DB.First(&task, application.TaskID).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "任务信息获取失败"})
		return
	}

	if task.EmployerID != uint(userID.(uint)) {
		c.JSON(http.StatusForbidden, gin.H{"error": "您不是该任务的发布者"})
		return
	}

	// 验证任务状态是否为招募中
	if task.Status != models.TaskStatusRecruiting {
		c.JSON(http.StatusBadRequest, gin.H{"error": "任务不在招募阶段"})
		return
	}

	// 验证申请状态是否为待处理
	if application.Status != models.ApplicationStatusPending {
		c.JSON(http.StatusBadRequest, gin.H{"error": "该申请已处理"})
		return
	}

	// 开始事务
	tx := db.DB.Begin()

	// 1. 更新申请状态为已接受
	application.Accept()
	if err := tx.Save(&application).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "更新申请状态失败"})
		return
	}

	// 2. 创建任务分配记录
	assignment := models.TaskAssignment{
		UUID:              uuid.New().String(),
		TaskApplicationID: &application.ID,
		TaskID:            application.TaskID,
		WorkerID:          application.WorkerID,
		AssignedAt:        time.Now(),
		WorkerStatus:      models.WorkerStatusWorking,
		EmployerStatus:    models.EmployerStatusInProgress,
	}
	if err := tx.Create(&assignment).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "创建任务分配失败"})
		return
	}

	// 3. 更新任务状态为进行中
	task.Status = models.TaskStatusInProgress
	if err := tx.Save(&task).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "更新任务状态失败"})
		return
	}

	// 提交事务
	if err := tx.Commit().Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "接受申请失败"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "已成功接受申请，任务已进入进行中状态",
		"task_id": task.UUID,
		"status":  task.Status,
	})
}

// Helper function to convert a string to a pointer
func stringPtr(s string) *string {
	return &s
}
