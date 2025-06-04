package handlers

import (
	"fmt"
	"math/rand"
	"net/http"
	"strings"
	"time"

	"zhlg/backend/api/middlewares"
	"zhlg/backend/db"
	"zhlg/backend/models"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/datatypes"
	"gorm.io/gorm"
)

// SendVerificationCodeRequest represents the request body for sending a verification code
type SendVerificationCodeRequest struct {
	PhoneNumber string `json:"phone_number"`
	Email       string `json:"email"`
	Method      string `json:"method" binding:"required,oneof=login register"`
	Target      string `json:"target" binding:"required,oneof=phone email"`
}

// RegisterRequest represents the request body for user registration
type RegisterRequest struct {
	UserType string `json:"user_type" binding:"required,oneof=worker employer"`
	Method   string `json:"method" binding:"required,oneof=username"`
	Username string `json:"username"`
	Password string `json:"password"`
	Email    string `json:"email"`
	Name     string `json:"name"`
}

// LoginRequest represents the request body for user login
type LoginRequest struct {
	Method   string `json:"method" binding:"required,oneof=username"`
	Username string `json:"username"`
	Password string `json:"password"`
}

// SendVerificationCode handles sending verification codes to users' phones or emails
func SendVerificationCode(c *gin.Context) {
	var req SendVerificationCodeRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "请求参数错误", "details": err.Error()})
		return
	}

	var target string

	// Determine target based on request
	if req.Target == "phone" {
		if req.PhoneNumber == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "手机号不能为空"})
			return
		}

		// Validate phone number format (simplified example)
		if len(req.PhoneNumber) != 11 || !strings.HasPrefix(req.PhoneNumber, "1") {
			c.JSON(http.StatusBadRequest, gin.H{"error": "手机号格式不正确"})
			return
		}

		target = req.PhoneNumber
	} else if req.Target == "email" {
		if req.Email == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "邮箱不能为空"})
			return
		}

		// Simple email validation
		if !strings.Contains(req.Email, "@") || !strings.Contains(req.Email, ".") {
			c.JSON(http.StatusBadRequest, gin.H{"error": "邮箱格式不正确"})
			return
		}

		target = req.Email
	} else {
		c.JSON(http.StatusBadRequest, gin.H{"error": "无效的验证码发送目标"})
		return
	}

	// Generate a random 6-digit code
	rand.Seed(time.Now().UnixNano())
	code := fmt.Sprintf("%06d", rand.Intn(1000000))

	// 确定验证码类型
	var codeType models.VerificationCodeType
	if req.Method == "register" {
		codeType = models.VerificationCodeTypeRegister
	} else {
		codeType = models.VerificationCodeTypeLogin
	}

	// Create verification code record
	verificationCode := models.VerificationCode{
		Target:    target,
		Code:      code,
		Type:      codeType,
		ExpiresAt: time.Now().Add(10 * time.Minute), // Code expires in 10 minutes
	}

	// Save to database
	result := db.DB.Create(&verificationCode)
	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "保存验证码失败"})
		return
	}

	// TODO: In production, send the code via SMS or Email
	// For now, just return it in the response

	c.JSON(http.StatusOK, gin.H{
		"message": "验证码已发送",
		"code":    code, // Remove this line in production
		"target":  target,
	})
}

// Register handles user registration
func Register(c *gin.Context) {
	var req RegisterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "请求参数错误", "details": err.Error()})
		return
	}

	// Convert user type string to enum
	var userType models.UserType
	switch req.UserType {
	case "worker":
		userType = models.UserTypeWorker
	case "employer":
		userType = models.UserTypeEmployer
	default:
		c.JSON(http.StatusBadRequest, gin.H{"error": "无效的用户类型"})
		return
	}

	// Create a new user
	user := models.User{
		UUID:                     uuid.New().String(),
		UserType:                 userType,
		IdentityVerificationDocs: datatypes.JSON([]byte("[]")), // Using empty JSON array instead of empty string
	}

	// Set name if provided
	if req.Name != "" {
		name := req.Name
		user.Name = &name
	}

	// Username registration: validate username and password
	if req.Username == "" || req.Password == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "请求参数错误", "details": "用户名和密码不能为空"})
		return
	}

	// Username must be at least 4 characters
	if len(req.Username) < 4 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "请求参数错误", "details": "用户名至少需要4个字符"})
		return
	}

	// Password must be at least 6 characters
	if len(req.Password) < 6 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "请求参数错误", "details": "密码至少需要6个字符"})
		return
	}

	// Check if username is already registered
	var existingUser models.User
	result := db.DB.Where("username = ?", req.Username).First(&existingUser)
	if result.Error == nil {
		c.JSON(http.StatusConflict, gin.H{"error": "用户名已被注册"})
		return
	} else if result.Error != gorm.ErrRecordNotFound {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "查询用户失败"})
		return
	}

	// Store the username and password
	username := req.Username
	password := req.Password // 实际项目中应该哈希密码
	user.Username = &username
	user.PasswordHash = &password

	// If email is provided, store it as well
	if req.Email != "" {
		if !strings.Contains(req.Email, "@") || !strings.Contains(req.Email, ".") {
			c.JSON(http.StatusBadRequest, gin.H{"error": "邮箱格式不正确"})
			return
		}

		// Check if email is already registered
		result := db.DB.Where("email = ?", req.Email).First(&existingUser)
		if result.Error == nil {
			c.JSON(http.StatusConflict, gin.H{"error": "邮箱已被注册"})
			return
		} else if result.Error != gorm.ErrRecordNotFound {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "查询用户失败"})
			return
		}

		email := req.Email
		user.Email = &email
	}

	// Save the user to database
	result = db.DB.Create(&user)
	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "用户注册失败"})
		return
	}

	// Generate JWT token
	token, err := middlewares.GenerateToken(&user)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "注册成功但登录失败"})
		return
	}

	// Set auth cookie
	c.SetSameSite(http.SameSiteLaxMode)
	c.SetCookie(
		"auth_token",
		token,
		60*60*24*7, // 7 days in seconds
		"/",
		"",    // domain - empty for current domain
		false, // secure - set to true in production with HTTPS
		false, // httpOnly - set to true in production
	)

	// Return success response with user info and token
	c.JSON(http.StatusCreated, gin.H{
		"message": "注册成功",
		"user": gin.H{
			"uuid":      user.UUID,
			"username":  user.Username,
			"name":      user.Name,
			"user_type": user.UserType,
			"email":     user.Email,
			"phone":     user.PhoneNumber,
		},
		"token": token,
	})
}

// Login handles user login
func Login(c *gin.Context) {
	var req LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "请求参数错误", "details": err.Error()})
		return
	}

	// Find the user
	var user models.User

	// Username login: validate username and password
	if req.Username == "" || req.Password == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "请求参数错误", "details": "用户名和密码不能为空"})
		return
	}

	// Find user by username
	result := db.DB.Where("username = ?", req.Username).First(&user)
	if result.Error != nil {
		if result.Error == gorm.ErrRecordNotFound {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "未找到该用户名"})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "用户查询失败"})
		}
		return
	}

	// Verify password
	if user.PasswordHash == nil || *user.PasswordHash != req.Password {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "密码错误"})
		return
	}

	// Generate JWT token
	token, err := middlewares.GenerateToken(&user)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "登录失败，无法生成令牌"})
		return
	}

	// Set auth cookie
	c.SetSameSite(http.SameSiteLaxMode)
	c.SetCookie(
		"auth_token",
		token,
		60*60*24*7, // 7 days in seconds
		"/",
		"",    // domain - empty for current domain
		false, // secure - set to true in production with HTTPS
		false, // httpOnly - set to true in production
	)

	// Return success response with user info and token
	c.JSON(http.StatusOK, gin.H{
		"message": "登录成功",
		"user": gin.H{
			"uuid":         user.UUID,
			"username":     user.Username,
			"user_type":    user.UserType,
			"name":         user.Name,
			"email":        user.Email,
			"phone_number": user.PhoneNumber,
			"avatar_url":   user.AvatarURL,
		},
		"token": token,
	})
}

// Logout handles user logout
func Logout(c *gin.Context) {
	// Get token from header
	authHeader := c.GetHeader("Authorization")
	if authHeader == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "未授权"})
		return
	}

	// Extract the token
	parts := strings.Split(authHeader, " ")
	if len(parts) != 2 || parts[0] != "Bearer" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "无效的授权头"})
		return
	}

	// Add the token to a blacklist
	token := parts[1]
	invalidatedToken := models.InvalidatedToken{
		Token:     token,
		ExpiresAt: time.Now().Add(24 * time.Hour), // Assuming token validity period is 24 hours
	}

	result := db.DB.Create(&invalidatedToken)
	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "注销登录失败"})
		return
	}

	// Clear auth cookie
	c.SetSameSite(http.SameSiteLaxMode)
	c.SetCookie(
		"auth_token",
		"",
		-1, // negative max age means delete now
		"/",
		"",
		false,
		false,
	)

	// Return success
	c.JSON(http.StatusOK, gin.H{"message": "登出成功"})
}
