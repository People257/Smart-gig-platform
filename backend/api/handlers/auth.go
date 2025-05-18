package handlers

import (
	"fmt"
	"math/rand"
	"net/http"
	"strings"
	"time"

	"zhlg/backend/api/middlewares"
	"zhlg/backend/models"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
)

// SendVerificationCodeRequest represents the request body for sending a verification code
type SendVerificationCodeRequest struct {
	PhoneNumber string `json:"phone_number" binding:"required"`
}

// RegisterRequest represents the request body for user registration
type RegisterRequest struct {
	UserType         string `json:"user_type" binding:"required,oneof=worker employer"`
	Method           string `json:"method" binding:"required,oneof=phone username"`
	PhoneNumber      string `json:"phone_number"`
	VerificationCode string `json:"verification_code"`
	Username         string `json:"username"`
	Password         string `json:"password"`
}

// LoginRequest represents the request body for user login
type LoginRequest struct {
	Method           string `json:"method" binding:"required,oneof=phone username"`
	PhoneNumber      string `json:"phone_number"`
	VerificationCode string `json:"verification_code"`
	Username         string `json:"username"`
	Password         string `json:"password"`
}

// SendVerificationCode handles sending verification codes to users' phones
func SendVerificationCode(c *gin.Context) {
	var req SendVerificationCodeRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "请求参数错误", "details": err.Error()})
		return
	}

	// Validate phone number format (simplified example)
	if len(req.PhoneNumber) != 11 || !strings.HasPrefix(req.PhoneNumber, "1") {
		c.JSON(http.StatusBadRequest, gin.H{"error": "手机号格式不正确"})
		return
	}

	// Check if we've sent too many codes recently (rate limiting)
	// In a real app, this would check a database or cache

	// Generate a random 6-digit code
	rand.Seed(time.Now().UnixNano())
	code := fmt.Sprintf("%06d", rand.Intn(1000000))

	// In a real app, we would send the code via SMS service
	// For now, we'll just save it to the database

	// Create verification code record in database
	verificationCode := models.VerificationCode{
		Target:    req.PhoneNumber,
		Code:      code,
		Type:      models.VerificationCodeTypeRegister,
		ExpiresAt: time.Now().Add(10 * time.Minute), // Code expires in 10 minutes
	}

	// Save to database (example)
	// db.Create(&verificationCode)

	// For development/testing, we'll return the code in response
	// In production, we would never do this
	c.JSON(http.StatusOK, gin.H{
		"message": "验证码已发送",
		"code":    code, // Remove this line in production
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
		UUID:     uuid.New().String(),
		UserType: userType,
	}

	// Process registration based on method
	if req.Method == "phone" {
		// Phone registration: validate phone and verification code
		if req.PhoneNumber == "" || req.VerificationCode == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "请求参数错误", "details": "手机号和验证码不能为空"})
			return
		}

		// Validate phone number format
		if len(req.PhoneNumber) != 11 || !strings.HasPrefix(req.PhoneNumber, "1") {
			c.JSON(http.StatusBadRequest, gin.H{"error": "手机号格式不正确"})
			return
		}

		// Verify the code from database (example logic)
		// var code models.VerificationCode
		// db.Where("target = ? AND code = ? AND type = ? AND expires_at > ? AND used_at IS NULL",
		//   req.PhoneNumber, req.VerificationCode, models.VerificationCodeTypeRegister, time.Now()).First(&code)

		// if code.ID == 0 {
		//   c.JSON(http.StatusBadRequest, gin.H{"error": "验证码错误或已过期"})
		//   return
		// }

		// Mark the code as used
		// code.MarkAsUsed()
		// db.Save(&code)

		// Check if phone is already registered
		// var existingUser models.User
		// if !db.Where("phone_number = ?", req.PhoneNumber).First(&existingUser).RecordNotFound() {
		//   c.JSON(http.StatusConflict, gin.H{"error": "手机号已被注册"})
		//   return
		// }

		// Set the phone number and mark as verified
		phoneNumber := req.PhoneNumber
		now := time.Now()
		user.PhoneNumber = &phoneNumber
		user.PhoneVerifiedAt = &now

	} else if req.Method == "username" {
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
		// var existingUser models.User
		// if !db.Where("username = ?", req.Username).First(&existingUser).RecordNotFound() {
		//   c.JSON(http.StatusConflict, gin.H{"error": "用户名已被注册"})
		//   return
		// }

		// Hash the password
		hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "注册失败"})
			return
		}

		// Set the username and password hash
		username := req.Username
		passwordHash := string(hashedPassword)
		user.Username = &username
		user.PasswordHash = &passwordHash
	}

	// Save the user to database
	// db.Create(&user)

	// Generate JWT token
	token, err := middlewares.GenerateToken(&user)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "注册成功但登录失败"})
		return
	}

	// Return success response with user info and token
	c.JSON(http.StatusCreated, gin.H{
		"message": "注册成功",
		"user": gin.H{
			"uuid":      user.UUID,
			"username":  user.Username,
			"user_type": user.UserType,
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
	// var user models.User

	if req.Method == "phone" {
		// Phone login: validate phone and verification code
		if req.PhoneNumber == "" || req.VerificationCode == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "请求参数错误", "details": "手机号和验证码不能为空"})
			return
		}

		// Verify the code from database (example logic)
		// var code models.VerificationCode
		// db.Where("target = ? AND code = ? AND type = ? AND expires_at > ? AND used_at IS NULL",
		//   req.PhoneNumber, req.VerificationCode, models.VerificationCodeTypeLogin, time.Now()).First(&code)

		// if code.ID == 0 {
		//   c.JSON(http.StatusUnauthorized, gin.H{"error": "验证码错误或已过期"})
		//   return
		// }

		// Mark the code as used
		// code.MarkAsUsed()
		// db.Save(&code)

		// Find user by phone number
		// if db.Where("phone_number = ?", req.PhoneNumber).First(&user).RecordNotFound() {
		//   c.JSON(http.StatusUnauthorized, gin.H{"error": "手机号未注册"})
		//   return
		// }

	} else if req.Method == "username" {
		// Username login: validate username and password
		if req.Username == "" || req.Password == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "请求参数错误", "details": "用户名和密码不能为空"})
			return
		}

		// Find user by username
		// if db.Where("username = ?", req.Username).First(&user).RecordNotFound() {
		//   c.JSON(http.StatusUnauthorized, gin.H{"error": "用户名或密码错误"})
		//   return
		// }

		// Check password
		// if user.PasswordHash == nil {
		//   c.JSON(http.StatusUnauthorized, gin.H{"error": "用户名或密码错误"})
		//   return
		// }

		// if err := bcrypt.CompareHashAndPassword([]byte(*user.PasswordHash), []byte(req.Password)); err != nil {
		//   c.JSON(http.StatusUnauthorized, gin.H{"error": "用户名或密码错误"})
		//   return
		// }
	}

	// Create mock user for demo
	user := models.User{
		ID:       1,
		UUID:     uuid.New().String(),
		UserType: models.UserTypeWorker,
	}
	username := "testuser"
	user.Username = &username

	// Generate JWT token
	token, err := middlewares.GenerateToken(&user)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "登录失败"})
		return
	}

	// Return success response with user info and token
	c.JSON(http.StatusOK, gin.H{
		"message": "登录成功",
		"user": gin.H{
			"uuid":      user.UUID,
			"username":  user.Username,
			"user_type": user.UserType,
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
	tokenString := parts[1]

	// In a real application, we would add the token to a blacklist or invalidate it
	// For example:
	// db.Create(&models.InvalidatedToken{Token: tokenString, ExpiresAt: ...})

	// For now, just return success
	c.JSON(http.StatusOK, gin.H{"message": "登出成功"})
}
