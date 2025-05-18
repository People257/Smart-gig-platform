package handlers

import (
	"fmt"
	"math/rand"
	"net/http"
	"strings"
	"sync"
	"time"

	"zhlg/backend/api/middlewares"
	"zhlg/backend/models"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// 内存数据存储
var (
	// 保护并发访问的互斥锁
	mutex = &sync.Mutex{}

	// 验证码存储
	verificationCodes = []models.VerificationCode{}

	// 用户存储
	users = []models.User{}

	// 无效token存储
	invalidatedTokens = []models.InvalidatedToken{}
)

// 模拟数据库存储
type MemDB struct{}

// 模拟创建操作
func (db *MemDB) Create(v interface{}) {
	mutex.Lock()
	defer mutex.Unlock()

	switch record := v.(type) {
	case *models.VerificationCode:
		verificationCodes = append(verificationCodes, *record)
	case *models.User:
		users = append(users, *record)
	case *models.InvalidatedToken:
		invalidatedTokens = append(invalidatedTokens, *record)
	}
}

// 模拟保存操作
func (db *MemDB) Save(v interface{}) {
	mutex.Lock()
	defer mutex.Unlock()

	switch record := v.(type) {
	case *models.VerificationCode:
		for i, c := range verificationCodes {
			if c.Target == record.Target && c.Code == record.Code {
				verificationCodes[i] = *record
				return
			}
		}
	}
}

// 模拟查询操作
type DBQuery struct {
	table      string
	conditions map[string]interface{}
	result     interface{}
}

// 模拟 Where 查询
func (db *MemDB) Where(query string, args ...interface{}) *DBQuery {
	// 简化版 - 仅分析第一个条件
	// 实际应用中需要更复杂的解析
	conditions := make(map[string]interface{})
	if len(args) > 0 {
		conditions[query] = args[0]
	}
	return &DBQuery{
		conditions: conditions,
	}
}

// 模拟 First 查询
func (q *DBQuery) First(out interface{}) *DBResult {
	mutex.Lock()
	defer mutex.Unlock()

	switch v := out.(type) {
	case *models.User:
		for _, user := range users {
			for key, value := range q.conditions {
				if key == "username = ?" && user.Username != nil && *user.Username == value.(string) {
					*v = user
					return &DBResult{found: true}
				}
				if key == "phone_number = ?" && user.PhoneNumber != nil && *user.PhoneNumber == value.(string) {
					*v = user
					return &DBResult{found: true}
				}
			}
		}
	case *models.VerificationCode:
		// 简化实现，实际需要更复杂的条件匹配
		for _, code := range verificationCodes {
			if len(q.conditions) > 0 {
				targetKey := "target = ? AND code = ? AND type = ? AND expires_at > ? AND used_at IS NULL"
				if _, exists := q.conditions[targetKey]; exists {
					// 在实际实现中应该检查所有条件
					// 这里只是简单示例
					*v = code
					return &DBResult{found: true}
				}
			}
		}
	}
	return &DBResult{found: false}
}

// 模拟查询结果
type DBResult struct {
	found bool
}

// 模拟 RecordNotFound 检查
func (r *DBResult) RecordNotFound() bool {
	return !r.found
}

// 创建内存数据库实例
var db = &MemDB{}

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

	// Generate a random 6-digit code
	rand.Seed(time.Now().UnixNano())
	code := fmt.Sprintf("%06d", rand.Intn(1000000))

	// Create verification code record
	verificationCode := models.VerificationCode{
		Target:    req.PhoneNumber,
		Code:      code,
		Type:      models.VerificationCodeTypeRegister,
		ExpiresAt: time.Now().Add(10 * time.Minute), // Code expires in 10 minutes
	}

	// Save to "database"
	db.Create(&verificationCode)

	// Return the code in response
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

		// Simplified verification for demo
		// Check if phone is already registered
		var existingUser models.User
		if !db.Where("phone_number = ?", req.PhoneNumber).First(&existingUser).RecordNotFound() {
			c.JSON(http.StatusConflict, gin.H{"error": "手机号已被注册"})
			return
		}

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
		var existingUser models.User
		if !db.Where("username = ?", req.Username).First(&existingUser).RecordNotFound() {
			c.JSON(http.StatusConflict, gin.H{"error": "用户名已被注册"})
			return
		}

		// Store the password directly without hashing
		username := req.Username
		password := req.Password
		user.Username = &username
		user.PasswordHash = &password
	}

	// Save the user to "database"
	user.ID = uint(len(users) + 1) // 简单自增ID
	db.Create(&user)

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
	var user models.User

	if req.Method == "phone" {
		// Phone login: validate phone and verification code
		if req.PhoneNumber == "" || req.VerificationCode == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "请求参数错误", "details": "手机号和验证码不能为空"})
			return
		}

		// Simplified verification for demo purposes
		// Find user by phone number
		if db.Where("phone_number = ?", req.PhoneNumber).First(&user).RecordNotFound() {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "手机号未注册"})
			return
		}

	} else if req.Method == "username" {
		// Username login: validate username and password
		if req.Username == "" || req.Password == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "请求参数错误", "details": "用户名和密码不能为空"})
			return
		}

		// Find user by username
		if db.Where("username = ?", req.Username).First(&user).RecordNotFound() {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "用户名或密码错误"})
			return
		}

		// Check password
		if user.PasswordHash == nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "用户名或密码错误"})
			return
		}

		// Direct password comparison (no hashing)
		if *user.PasswordHash != req.Password {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "用户名或密码错误"})
			return
		}
	}

	// If no users exist yet, create a mock user for testing
	if len(users) == 0 {
		testUsername := "testuser"
		testPassword := "password123"
		mockUser := models.User{
			ID:           1,
			UUID:         uuid.New().String(),
			UserType:     models.UserTypeWorker,
			Username:     &testUsername,
			PasswordHash: &testPassword,
		}
		db.Create(&mockUser)
		user = mockUser
	}

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

	// Add the token to a blacklist
	token := parts[1]
	db.Create(&models.InvalidatedToken{
		Token:     token,
		ExpiresAt: time.Now().Add(24 * time.Hour), // Assuming token validity period is 24 hours
	})

	// Return success
	c.JSON(http.StatusOK, gin.H{"message": "登出成功"})
}
