package handlers

import (
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"zhlg/backend/db"
	"zhlg/backend/models"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
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
	// In a real application, we would retrieve the user from the database
	// userID := c.GetUint("userID")
	// var user models.User
	// db.Preload("Skills").First(&user, userID)

	// Create mock user for demo
	user := models.User{
		ID:       1,
		UUID:     "user-uuid-123",
		UserType: models.UserTypeWorker,
	}
	username := "testuser"
	phone := "13800138000"
	avatar := "https://example.com/avatar.jpg"
	bio := "I am a skilled worker with experience in multiple areas."
	location := "广州市"
	hourlyRate := 120.50
	user.Username = &username
	user.PhoneNumber = &phone
	user.AvatarURL = &avatar
	user.Bio = &bio
	user.Location = &location
	user.HourlyRate = &hourlyRate

	// For demo, create mock skills
	skills := []models.Skill{
		{ID: 1, Name: "UI设计"},
		{ID: 2, Name: "Web开发"},
	}

	// Return user profile
	c.JSON(http.StatusOK, gin.H{
		"uuid":                 user.UUID,
		"name":                 user.Name,
		"email":                user.Email,
		"phone_number":         user.PhoneNumber,
		"user_type":            user.UserType,
		"avatar_url":           user.AvatarURL,
		"bio":                  user.Bio,
		"location":             user.Location,
		"hourly_rate":          user.HourlyRate,
		"skills":               skills,
		"is_identity_verified": user.IdentityVerifiedStatus == models.IdentityStatusVerified,
		"created_at":           user.CreatedAt,
	})
}

// UpdateUserProfile handles updating the current user's profile
func UpdateUserProfile(c *gin.Context) {
	var req UpdateUserProfileRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "请求参数错误", "details": err.Error()})
		return
	}

	// In a real application, we would retrieve the user from the database and update it
	// userID := c.GetUint("userID")
	// var user models.User
	// db.First(&user, userID)

	// Create mock user for demo
	user := models.User{
		ID:       1,
		UUID:     "user-uuid-123",
		UserType: models.UserTypeWorker,
	}

	// Update fields if provided
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
		// In a real application, we would update skills in the database
		// db.Model(&user).Association("Skills").Clear()
		// for _, skillName := range *req.Skills {
		//   var skill models.Skill
		//   db.Where("name = ?", skillName).FirstOrCreate(&skill, models.Skill{Name: skillName})
		//   db.Model(&user).Association("Skills").Append(&skill)
		// }
	}

	// Save the updated user
	// db.Save(&user)

	// For demo, create mock skills
	skills := []models.Skill{
		{ID: 1, Name: "UI设计"},
		{ID: 2, Name: "Web开发"},
	}

	// If skills were updated, replace with new skills
	if req.Skills != nil {
		skills = make([]models.Skill, 0)
		for i, skillName := range *req.Skills {
			skills = append(skills, models.Skill{
				ID:   uint(i + 1),
				Name: skillName,
			})
		}
	}

	// Return success response with updated user
	c.JSON(http.StatusOK, gin.H{
		"message": "资料更新成功",
		"user": gin.H{
			"uuid":                 user.UUID,
			"name":                 user.Name,
			"email":                user.Email,
			"phone_number":         user.PhoneNumber,
			"user_type":            user.UserType,
			"avatar_url":           user.AvatarURL,
			"bio":                  user.Bio,
			"location":             user.Location,
			"hourly_rate":          user.HourlyRate,
			"skills":               skills,
			"is_identity_verified": user.IdentityVerifiedStatus == models.IdentityStatusVerified,
			"created_at":           user.CreatedAt,
		},
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
	c.JSON(http.StatusOK, gin.H{
		"message":    "头像上传成功",
		"avatar_url": "/uploads/avatars/" + filename,
	})
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
}
