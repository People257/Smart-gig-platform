package handlers

import (
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"zhlg/backend/db"
	"zhlg/backend/models"

	"log"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/datatypes"
	"gorm.io/gorm"
)

// UpdateUserProfileRequest represents the request body for updating a user profile
type UpdateUserProfileRequest struct {
	Name       *string   `json:"name"`
	Bio        *string   `json:"bio"`
	Location   *string   `json:"location"`
	HourlyRate *float64  `json:"hourly_rate"`
	Skills     *[]string `json:"skills"`
}

// GetUserProfile handles retrieving the current user's profile
func GetUserProfile(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "未授权访问"})
		return
	}
	var user models.User
	if err := db.DB.Preload("Skills").First(&user, userID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "用户不存在"})
		return
	}
	c.JSON(http.StatusOK, user)
}

// UpdateUserProfile handles updating the current user's profile
func UpdateUserProfile(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "未授权访问"})
		return
	}
	var req UpdateUserProfileRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "请求参数错误", "details": err.Error()})
		return
	}
	var user models.User
	if err := db.DB.Preload("Skills").First(&user, userID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "用户不存在"})
		return
	}
	if req.Name != nil {
		user.Name = req.Name
	}
	if req.Bio != nil {
		user.Bio = req.Bio
	}
	if req.Location != nil {
		user.Location = req.Location
	}
	if req.HourlyRate != nil && user.UserType == models.UserTypeWorker {
		user.HourlyRate = req.HourlyRate
	}
	if req.Skills != nil && user.UserType == models.UserTypeWorker {
		db.DB.Model(&user).Association("Skills").Clear()
		for _, skillName := range *req.Skills {
			var skill models.Skill
			db.DB.Where("name = ?", skillName).FirstOrCreate(&skill, models.Skill{Name: skillName})
			db.DB.Model(&user).Association("Skills").Append(&skill)
		}
	}
	if len(user.IdentityVerificationDocs) == 0 {
		user.IdentityVerificationDocs = datatypes.JSON([]byte("null"))
	}
	if err := db.DB.Save(&user).Error; err != nil {
		log.Printf("[UpdateUserProfile] userID=%v, 更新字段: name=%v, bio=%v, location=%v, hourlyRate=%v, skills=%v", userID, req.Name, req.Bio, req.Location, req.HourlyRate, req.Skills)
		if req.Skills != nil && user.UserType == models.UserTypeWorker {
			log.Printf("[UpdateUserProfile] db.Model(&user).Association('Skills').Clear userID=%v", userID)
			for _, skillName := range *req.Skills {
				log.Printf("[UpdateUserProfile] db.Model(&user).Association('Skills').Append userID=%v, skill=%v", userID, skillName)
			}
		}
		log.Printf("[UpdateUserProfile] db.Save userID=%v", userID)
		log.Printf("[UpdateUserProfile] db.Save userID=%v, err=%v", userID, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "保存用户信息失败"})
		return
	}
	// 重新查一次，带技能
	if err := db.DB.Preload("Skills").First(&user, userID).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "获取用户信息失败"})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"message": "资料更新成功",
		"user":    user,
	})
}

// UploadAvatar handles uploading a user's avatar image
func UploadAvatar(c *gin.Context) {
	// Get the file from the request
	file, err := c.FormFile("avatar")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "未找到上传文件"})
		return
	}

	// Check file type (allow only images)
	contentType := file.Header.Get("Content-Type")
	if !strings.HasPrefix(contentType, "image/") {
		c.JSON(http.StatusBadRequest, gin.H{"error": "文件类型不支持，仅支持图片格式"})
		return
	}

	// Check file size (limit to 2MB)
	if file.Size > 2*1024*1024 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "文件过大，最大支持2MB"})
		return
	}

	// Generate a unique filename
	filename := uuid.New().String() + filepath.Ext(file.Filename)

	// Ensure upload directory exists
	uploadDir := "uploads/avatars"
	if err := os.MkdirAll(uploadDir, 0755); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "上传失败"})
		return
	}

	// Save the file
	dst := filepath.Join(uploadDir, filename)
	if err := c.SaveUploadedFile(file, dst); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "上传失败"})
		return
	}

	// In a real application, we would update the user's avatar URL in the database
	// userID := c.GetUint("userID")
	// var user models.User
	// db.First(&user, userID)
	// user.AvatarURL = "/uploads/avatars/" + filename
	// db.Save(&user)

	// Return success response with the avatar URL
	userID, _ := c.Get("userID")
	c.JSON(http.StatusOK, gin.H{
		"message":    "头像上传成功",
		"avatar_url": "/uploads/avatars/" + filename,
	})
	log.Printf("[UploadAvatar] db.Save userID=%v, avatar=%v", userID, "/uploads/avatars/"+filename)
}

// UpdateUserSettings updates a user's settings
func UpdateUserSettings(c *gin.Context) {
	// Get the authenticated user
	user, exists := c.Get("user")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "未授权访问"})
		return
	}
	authUser := user.(*models.User)

	// Parse request body
	var req struct {
		Username          *string         `json:"username"`
		Email             *string         `json:"email"`
		PhoneNumber       *string         `json:"phone_number"`
		NotificationPrefs map[string]bool `json:"notification_preferences"`
		PrivacySettings   map[string]bool `json:"privacy_settings"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "请求参数错误", "details": err.Error()})
		return
	}

	// Check for username changes
	if req.Username != nil && *req.Username != "" {
		// Check if username already exists
		if authUser.Username == nil || *authUser.Username != *req.Username {
			var existingUser models.User
			result := db.DB.Where("username = ? AND id != ?", *req.Username, authUser.ID).First(&existingUser)
			if result.Error == nil {
				c.JSON(http.StatusConflict, gin.H{"error": "用户名已被使用"})
				return
			} else if result.Error != gorm.ErrRecordNotFound {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "检查用户名失败"})
				return
			}
		}
		authUser.Username = req.Username
	}

	// Check for email changes
	if req.Email != nil && *req.Email != "" {
		if authUser.Email == nil || *authUser.Email != *req.Email {
			// Validate email format
			if !strings.Contains(*req.Email, "@") || !strings.Contains(*req.Email, ".") {
				c.JSON(http.StatusBadRequest, gin.H{"error": "邮箱格式不正确"})
				return
			}

			// Check if email already exists
			var existingUser models.User
			result := db.DB.Where("email = ? AND id != ?", *req.Email, authUser.ID).First(&existingUser)
			if result.Error == nil {
				c.JSON(http.StatusConflict, gin.H{"error": "邮箱已被使用"})
				return
			} else if result.Error != gorm.ErrRecordNotFound {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "检查邮箱失败"})
				return
			}
		}
		authUser.Email = req.Email
	}

	// Check for phone number changes
	if req.PhoneNumber != nil && *req.PhoneNumber != "" {
		if authUser.PhoneNumber == nil || *authUser.PhoneNumber != *req.PhoneNumber {
			// Validate phone number format
			if len(*req.PhoneNumber) != 11 || !strings.HasPrefix(*req.PhoneNumber, "1") {
				c.JSON(http.StatusBadRequest, gin.H{"error": "手机号格式不正确"})
				return
			}

			// Check if phone number already exists
			var existingUser models.User
			result := db.DB.Where("phone_number = ? AND id != ?", *req.PhoneNumber, authUser.ID).First(&existingUser)
			if result.Error == nil {
				c.JSON(http.StatusConflict, gin.H{"error": "手机号已被使用"})
				return
			} else if result.Error != gorm.ErrRecordNotFound {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "检查手机号失败"})
				return
			}
		}
		authUser.PhoneNumber = req.PhoneNumber
	}

	// Update user in database
	result := db.DB.Save(authUser)
	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "更新用户设置失败"})
		return
	}

	// Return the updated user data
	c.JSON(http.StatusOK, gin.H{
		"message": "用户设置已更新",
		"user": gin.H{
			"uuid":       authUser.UUID,
			"username":   authUser.Username,
			"email":      authUser.Email,
			"phone":      authUser.PhoneNumber,
			"user_type":  authUser.UserType,
			"name":       authUser.Name,
			"avatar_url": authUser.AvatarURL,
		},
	})
	log.Printf("[UpdateUserSettings] db.Save userID=%v", authUser.ID)
}

// ChangePassword handles changing a user's password
func ChangePassword(c *gin.Context) {
	// Get the authenticated user
	user, exists := c.Get("user")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "未授权访问"})
		return
	}
	authUser := user.(*models.User)

	// Parse request body
	var req struct {
		CurrentPassword string `json:"current_password" binding:"required"`
		NewPassword     string `json:"new_password" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "请求参数错误", "details": err.Error()})
		return
	}

	// Verify current password
	if authUser.PasswordHash == nil || *authUser.PasswordHash != req.CurrentPassword {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "当前密码不正确"})
		return
	}

	// Validate new password
	if len(req.NewPassword) < 6 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "新密码至少需要6个字符"})
		return
	}

	// Update password
	newPassword := req.NewPassword
	authUser.PasswordHash = &newPassword

	// Save to database
	result := db.DB.Save(authUser)
	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "更新密码失败"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "密码已成功更新"})
	log.Printf("[ChangePassword] db.Save userID=%v", authUser.ID)
}

// DeleteAccount handles account deletion
func DeleteAccount(c *gin.Context) {
	// Get the authenticated user
	user, exists := c.Get("user")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "未授权访问"})
		return
	}
	authUser := user.(*models.User)

	// Soft delete the user
	result := db.DB.Delete(authUser)
	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "删除账户失败"})
		return
	}

	// Invalidate any tokens by adding to blacklist
	// Extract the token
	authHeader := c.GetHeader("Authorization")
	if authHeader != "" && strings.HasPrefix(authHeader, "Bearer ") {
		token := strings.TrimPrefix(authHeader, "Bearer ")
		invalidatedToken := models.InvalidatedToken{
			Token:     token,
			ExpiresAt: time.Now().Add(24 * time.Hour), // Assuming token validity period is 24 hours
		}
		db.DB.Create(&invalidatedToken)
	}

	c.JSON(http.StatusOK, gin.H{"message": "账户已成功删除"})
	log.Printf("[DeleteAccount] db.Delete userID=%v", authUser.ID)
}

// 实名认证请求体
type RealNameAuthRequest struct {
	RealName string `json:"real_name" binding:"required"`
	IDCard   string `json:"id_card" binding:"required"`
}

// 实名认证接口
func RealNameAuth(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "未登录"})
		return
	}
	var req RealNameAuthRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "参数错误", "details": err.Error()})
		return
	}

	// 简化验证：仅检查长度基本要求
	if len([]rune(req.RealName)) < 2 || len([]rune(req.RealName)) > 20 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "姓名长度应为2-20个字符"})
		return
	}

	// 简化验证：仅检查身份证号长度（18位）
	if len(req.IDCard) != 18 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "身份证号必须为18位"})
		return
	}

	var user models.User
	if err := db.DB.First(&user, userID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "用户不存在"})
		return
	}

	// 检查该身份证是否已被其他账户使用
	var existingUser models.User
	result := db.DB.Where("id_card = ? AND id != ?", req.IDCard, userID).First(&existingUser)
	if result.Error == nil {
		c.JSON(http.StatusConflict, gin.H{"error": "该身份证已被其他账户使用"})
		return
	} else if result.Error != gorm.ErrRecordNotFound {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "验证身份证信息失败"})
		return
	}

	user.RealName = &req.RealName
	user.IDCard = &req.IDCard
	user.IdentityVerifiedStatus = models.IdentityStatusVerified
	if err := db.DB.Save(&user).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "认证失败", "details": err.Error()})
		return
	}
	// 返回实名信息（脱敏）
	c.JSON(http.StatusOK, gin.H{
		"message":                  "实名认证成功",
		"real_name":                maskName(req.RealName),
		"id_card":                  maskIDCard(req.IDCard),
		"is_identity_verified":     true,
		"identity_verified_status": user.IdentityVerifiedStatus,
	})
	log.Printf("[RealNameAuth] 实名认证成功 userID=%v, real_name=%v", userID, maskName(req.RealName))
}

// validateIDCardChecksum 验证身份证号的校验位是否正确
func validateIDCardChecksum(id string) bool {
	if len(id) != 18 {
		return false
	}

	// 身份证号码加权因子
	weight := [17]int{7, 9, 10, 5, 8, 4, 2, 1, 6, 3, 7, 9, 10, 5, 8, 4, 2}

	// 校验码对应值
	validate := [11]byte{'1', '0', 'X', '9', '8', '7', '6', '5', '4', '3', '2'}

	sum := 0
	for i := 0; i < 17; i++ {
		sum += int(id[i]-'0') * weight[i]
	}

	mod := sum % 11
	return id[17] == validate[mod]
}

// 姓名脱敏：只显示第一个字和最后一个字
func maskName(name string) string {
	if len([]rune(name)) <= 1 {
		return "*"
	}
	runes := []rune(name)
	if len(runes) == 2 {
		return string(runes[0]) + "*"
	}
	return string(runes[0]) + strings.Repeat("*", len(runes)-2) + string(runes[len(runes)-1])
}

// 身份证脱敏：前3后4位明文
func maskIDCard(id string) string {
	if len(id) < 7 {
		return "****"
	}
	return id[:3] + strings.Repeat("*", len(id)-7) + id[len(id)-4:]
}

// 获取实名认证信息接口
func GetRealNameAuth(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"success": false, "error": "未登录"})
		return
	}
	var user models.User
	if err := db.DB.First(&user, userID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"success": false, "error": "用户不存在"})
		return
	}
	isVerified := user.IdentityVerifiedStatus == models.IdentityStatusVerified
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"real_name":            user.RealName,
			"id_card":              user.IDCard,
			"is_identity_verified": isVerified,
		},
	})
}

// 获取当前用户申请过的所有任务
func GetMyTasks(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "未登录"})
		return
	}

	var applications []models.TaskApplication
	if err := db.DB.Preload("Task.Skills").Where("worker_id = ?", userID).Order("applied_at DESC").Find(&applications).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "查询失败"})
		return
	}

	// 返回任务详情和申请状态
	var result []gin.H
	for _, app := range applications {
		result = append(result, gin.H{
			"application_id":   app.ID,
			"application_uuid": app.UUID,
			"status":           app.Status,
			"applied_at":       app.AppliedAt,
			"cover_letter":     app.CoverLetter,
			"task":             app.Task,
		})
	}

	c.JSON(http.StatusOK, gin.H{
		"success":      true,
		"applications": result,
	})
}
