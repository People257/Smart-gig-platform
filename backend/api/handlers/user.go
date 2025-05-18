package handlers

import (
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"zhlg/backend/models"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
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
