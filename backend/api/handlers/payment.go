package handlers

import (
	"net/http"
	"time"
	"zhlg/backend/db"
	"zhlg/backend/models"

	"math"

	"bytes"
	"fmt"
	"io"
	"log"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

// WithdrawalRequest represents the request body for creating a withdrawal
type WithdrawalRequest struct {
	Amount  float64 `json:"amount" binding:"required,gt=0"`
	Account string  `json:"account" binding:"required"`
}

// GetUserWallet handles fetching a user's wallet information
func GetUserWallet(c *gin.Context) {
	// TODO: Replace mock data with real user wallet data from database
	wallet := gin.H{
		// "balance":      1258.75, // 删除写死金额
		"currency": "CNY",
		// "pending":      450.00,
		// "total_earned": 3500.00,
		// "total_spent":  1200.00,
		"accounts": []gin.H{
			{
				"uuid":       uuid.New().String(),
				"type":       "alipay",
				"account":    "user@example.com",
				"is_default": true,
				"created_at": time.Now().AddDate(0, -2, 0).Format(time.RFC3339),
			},
			{
				"uuid":       uuid.New().String(),
				"type":       "wechat",
				"account":    "wxid_example123",
				"is_default": false,
				"created_at": time.Now().AddDate(0, -1, 0).Format(time.RFC3339),
			},
		},
	}

	c.JSON(http.StatusOK, wallet)
}

// GetUserTransactions handles fetching a user's transaction history with pagination
func GetUserTransactions(c *gin.Context) {
	// Parse pagination parameters
	page, _ := c.GetQuery("page")
	if page == "" {
		page = "1"
	}

	limit, _ := c.GetQuery("limit")
	if limit == "" {
		limit = "10"
	}

	// In a real application, we would get the user ID from the authenticated user
	// userID := c.GetUint("userID")

	// In a real application, we would retrieve the user's transactions from the database with pagination
	// var transactions []models.Transaction
	// db.Where("user_id = ?", userID).
	//   Order("created_at DESC").
	//   Offset((page - 1) * limit).
	//   Limit(limit).
	//   Find(&transactions)

	// var totalCount int
	// db.Model(&models.Transaction{}).Where("user_id = ?", userID).Count(&totalCount)

	// Create mock transactions for demo
	totalCount := 25
	transactions := make([]gin.H, 0)

	for i := 1; i <= 10; i++ {
		var transactionType string
		var amount float64
		var status string
		var title string
		var referenceType string

		if i%3 == 0 {
			transactionType = "withdrawal"
			amount = -500.00
			status = "completed"
			title = "提现到支付宝"
			referenceType = "withdrawal"
		} else if i%3 == 1 {
			transactionType = "earning"
			amount = 800.00
			status = "completed"
			title = "任务报酬: UI设计项目"
			referenceType = "task"
		} else {
			transactionType = "earning"
			amount = 450.00
			status = "pending"
			title = "任务报酬: 网页开发项目"
			referenceType = "task"
		}

		transactions = append(transactions, gin.H{
			"uuid":           uuid.New().String(),
			"type":           transactionType,
			"amount":         amount,
			"currency":       "CNY",
			"status":         status,
			"title":          title,
			"reference_id":   uuid.New().String(),
			"reference_type": referenceType,
			"created_at":     time.Now().AddDate(0, 0, -i).Format(time.RFC3339),
		})
	}

	c.JSON(http.StatusOK, gin.H{
		"transactions": transactions,
		"pagination": gin.H{
			"current_page":   1,
			"total_pages":    3,
			"total_items":    totalCount,
			"items_per_page": 10,
		},
	})
}

// CreateWithdrawal handles creating a new withdrawal request
func CreateWithdrawal(c *gin.Context) {
	var req WithdrawalRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "请求参数错误", "details": err.Error()})
		return
	}

	// In a real application, we would get the user ID from the authenticated user
	// userID := c.GetUint("userID")

	// In a real application, we would check if the user has sufficient balance
	// var user models.User
	// if db.Where("id = ?", userID).First(&user).RecordNotFound() {
	//   c.JSON(http.StatusNotFound, gin.H{"error": "用户未找到"})
	//   return
	// }

	// if user.Balance < req.Amount {
	//   c.JSON(http.StatusBadRequest, gin.H{"error": "余额不足"})
	//   return
	// }

	// Check if the account exists and belongs to the user
	// var account models.WithdrawalAccount
	// if db.Where("uuid = ? AND user_id = ?", req.Account, userID).First(&account).RecordNotFound() {
	//   c.JSON(http.StatusBadRequest, gin.H{"error": "提现账户无效"})
	//   return
	// }

	// Create a new transaction record (in a real app, this would be saved to the database)
	transactionUUID := uuid.New().String()
	now := time.Now()

	// Return success response
	c.JSON(http.StatusOK, gin.H{
		"message": "提现申请已提交，我们将在1-3个工作日内处理",
		"transaction": gin.H{
			"uuid":       transactionUUID,
			"type":       "withdrawal",
			"amount":     -req.Amount, // Negative for withdrawals
			"currency":   "CNY",
			"status":     "pending",
			"created_at": now.Format(time.RFC3339),
		},
	})
}

// AddWithdrawalAccount handles adding a new withdrawal account
func AddWithdrawalAccount(c *gin.Context) {
	var req struct {
		Type      string `json:"type" binding:"required,oneof=alipay wechat bank"`
		Account   string `json:"account" binding:"required"`
		Real_name string `json:"real_name,omitempty"`
		Bank_name string `json:"bank_name,omitempty"`
		IsDefault bool   `json:"is_default"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "请求参数错误", "details": err.Error()})
		return
	}

	// Validate specific fields based on account type
	if req.Type == "bank" {
		if req.Bank_name == "" || req.Real_name == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "银行账户需要提供开户行和真实姓名"})
			return
		}
	}

	// In a real application, we would get the user ID from the authenticated user
	// userID := c.GetUint("userID")

	// Create account (in a real app, this would be saved to the database)
	accountUUID := uuid.New().String()
	now := time.Now()

	// Return success response
	c.JSON(http.StatusOK, gin.H{
		"message": "提现账户添加成功",
		"account": gin.H{
			"uuid":       accountUUID,
			"type":       req.Type,
			"account":    req.Account,
			"is_default": req.IsDefault,
			"created_at": now.Format(time.RFC3339),
		},
	})
}

// GetUserPaymentSettings handles fetching a user's payment settings
func GetUserPaymentSettings(c *gin.Context) {
	// In a real application, we would get the user ID from the authenticated user
	// userID := c.GetUint("userID")

	// Create mock payment settings for demo
	settings := gin.H{
		"currency": "CNY",
		"payment_methods": []gin.H{
			{
				"type":       "alipay",
				"is_enabled": true,
				"is_default": true,
			},
			{
				"type":       "wechat",
				"is_enabled": true,
				"is_default": false,
			},
		},
		"auto_withdrawal": gin.H{
			"is_enabled":      false,
			"threshold":       1000.00,
			"default_account": "user@example.com",
		},
		"notifications": gin.H{
			"payment_received":  true,
			"withdrawal_status": true,
		},
	}

	c.JSON(http.StatusOK, settings)
}

// UpdatePaymentSettings handles updating a user's payment settings
func UpdatePaymentSettings(c *gin.Context) {
	var req struct {
		AutoWithdrawal struct {
			IsEnabled      bool    `json:"is_enabled"`
			Threshold      float64 `json:"threshold,omitempty"`
			DefaultAccount string  `json:"default_account,omitempty"`
		} `json:"auto_withdrawal"`
		Notifications struct {
			PaymentReceived  bool `json:"payment_received"`
			WithdrawalStatus bool `json:"withdrawal_status"`
		} `json:"notifications"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "请求参数错误", "details": err.Error()})
		return
	}

	// In a real application, we would get the user ID from the authenticated user
	// userID := c.GetUint("userID")

	// In a real application, we would update the user's settings in the database
	// var settings models.UserPaymentSettings
	// if db.Where("user_id = ?", userID).First(&settings).RecordNotFound() {
	//   settings = models.UserPaymentSettings{
	//     UserID: userID,
	//   }
	// }

	// settings.AutoWithdrawalEnabled = req.AutoWithdrawal.IsEnabled
	// if req.AutoWithdrawal.Threshold > 0 {
	//   settings.AutoWithdrawalThreshold = req.AutoWithdrawal.Threshold
	// }
	// if req.AutoWithdrawal.DefaultAccount != "" {
	//   var account models.WithdrawalAccount
	//   if !db.Where("uuid = ? AND user_id = ?", req.AutoWithdrawal.DefaultAccount, userID).First(&account).RecordNotFound() {
	//     settings.AutoWithdrawalAccountID = account.ID
	//   }
	// }

	// settings.NotifyPaymentReceived = req.Notifications.PaymentReceived
	// settings.NotifyWithdrawalStatus = req.Notifications.WithdrawalStatus

	// if settings.ID == 0 {
	//   db.Create(&settings)
	// } else {
	//   db.Save(&settings)
	// }

	// Create mock updated settings for demo
	settings := gin.H{
		"currency": "CNY",
		"payment_methods": []gin.H{
			{
				"type":       "alipay",
				"is_enabled": true,
				"is_default": true,
			},
			{
				"type":       "wechat",
				"is_enabled": true,
				"is_default": false,
			},
		},
		"auto_withdrawal": gin.H{
			"is_enabled":      req.AutoWithdrawal.IsEnabled,
			"threshold":       req.AutoWithdrawal.Threshold,
			"default_account": req.AutoWithdrawal.DefaultAccount,
		},
		"notifications": gin.H{
			"payment_received":  req.Notifications.PaymentReceived,
			"withdrawal_status": req.Notifications.WithdrawalStatus,
		},
	}

	c.JSON(http.StatusOK, gin.H{
		"message":  "支付设置更新成功",
		"settings": settings,
	})
}

// GetPaymentsData handles fetching a user's payment data
func GetPaymentsData(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "未登录"})
		return
	}

	log.Printf("[GetPaymentsData] 开始获取用户余额，原始userID=%v, 类型=%T", userID, userID)

	// 处理userID的类型转换
	var userIDUint uint
	switch v := userID.(type) {
	case uint:
		userIDUint = v
		log.Printf("[GetPaymentsData] userID是uint类型: %v", userIDUint)
	case int:
		userIDUint = uint(v)
		log.Printf("[GetPaymentsData] userID是int类型，转换为uint: %v", userIDUint)
	case float64:
		userIDUint = uint(v)
		log.Printf("[GetPaymentsData] userID是float64类型，转换为uint: %v", userIDUint)
	case string:
		var uintID uint64
		if _, err := fmt.Sscanf(v, "%d", &uintID); err == nil {
			userIDUint = uint(uintID)
			log.Printf("[GetPaymentsData] userID是string类型，解析为uint: %v", userIDUint)
		} else {
			log.Printf("[GetPaymentsData] 无法将string类型userID转换为uint: %v, 错误: %v", v, err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "用户ID类型无效"})
			return
		}
	default:
		log.Printf("[GetPaymentsData] 未知的userID类型: %T", userID)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "用户ID类型无效"})
		return
	}

	// 从数据库中获取用户信息，包括余额
	var user models.User
	log.Printf("[GetPaymentsData] 查询数据库用户信息，userID=%v", userIDUint)
	if err := db.DB.First(&user, userIDUint).Error; err != nil {
		log.Printf("[GetPaymentsData] 获取用户数据失败: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "获取用户数据失败"})
		return
	}
	log.Printf("[GetPaymentsData] 查询到用户: ID=%d, UUID=%s, 用户名=%s, 余额=%.2f",
		user.ID, user.UUID, user.Username, user.Balance)

	// 计算总收入和支出
	var totalIncome, totalExpense float64

	// 获取收入统计
	var incomeStats struct {
		Total float64
	}
	log.Printf("[GetPaymentsData] 查询用户收入，userID=%v", userIDUint)
	db.DB.Model(&models.Transaction{}).
		Select("COALESCE(SUM(amount), 0) as Total").
		Where("user_id = ? AND type = ?", userIDUint, models.TransactionTypeEarning).
		Scan(&incomeStats)
	totalIncome = incomeStats.Total
	log.Printf("[GetPaymentsData] 用户总收入: %.2f", totalIncome)

	// 获取支出统计
	var expenseStats struct {
		Total float64
	}
	log.Printf("[GetPaymentsData] 查询用户支出，userID=%v", userIDUint)
	db.DB.Model(&models.Transaction{}).
		Select("COALESCE(SUM(ABS(amount)), 0) as Total").
		Where("user_id = ? AND type IN (?, ?)", userIDUint, models.TransactionTypeWithdrawal, models.TransactionTypeFee).
		Scan(&expenseStats)
	totalExpense = expenseStats.Total
	log.Printf("[GetPaymentsData] 用户总支出: %.2f", totalExpense)

	// 获取最近的交易记录
	var transactions []models.Transaction
	log.Printf("[GetPaymentsData] 查询用户最近交易，userID=%v", userIDUint)
	result := db.DB.Where("user_id = ?", userIDUint).
		Order("created_at DESC").
		Limit(10).
		Find(&transactions)
	log.Printf("[GetPaymentsData] 找到 %d 条交易记录, 查询结果: %v", len(transactions), result.Error)

	// 格式化交易记录
	transactionsResponse := make([]gin.H, 0)
	for _, t := range transactions {
		amount := t.Amount
		transactionType := "income"
		if t.Type == models.TransactionTypeWithdrawal || t.Type == models.TransactionTypeFee {
			transactionType = "expense"
		}

		transactionsResponse = append(transactionsResponse, gin.H{
			"id":          t.UUID,
			"type":        transactionType,
			"amount":      math.Abs(amount),
			"status":      string(t.Status),
			"date":        t.CreatedAt.Format(time.RFC3339),
			"description": t.Title,
		})
	}

	response := gin.H{
		"balance":      user.Balance,
		"totalIncome":  totalIncome,
		"totalExpense": totalExpense,
		"currency":     "CNY",
		"transactions": transactionsResponse,
	}

	log.Printf("[GetPaymentsData] 返回响应: balance=%.2f, totalIncome=%.2f, totalExpense=%.2f, transactions=%d",
		user.Balance, totalIncome, totalExpense, len(transactionsResponse))

	c.JSON(http.StatusOK, response)
}

// 新提现请求体
type SimpleWithdrawalRequest struct {
	Amount        interface{} `json:"amount" binding:"required"`
	AlipayAccount string      `json:"alipay_account" binding:"required"`
}

// 新提现接口（替换原有实现）
func RequestWithdrawal(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "未登录"})
		return
	}

	// 记录原始请求内容
	requestBody, _ := io.ReadAll(c.Request.Body)
	c.Request.Body = io.NopCloser(bytes.NewBuffer(requestBody))
	log.Printf("[RequestWithdrawal] 收到提现请求: %s", string(requestBody))

	var req SimpleWithdrawalRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		log.Printf("[RequestWithdrawal] 解析请求参数错误: %v", err)
		c.JSON(http.StatusBadRequest, gin.H{"error": "请求参数错误", "details": err.Error()})
		return
	}

	// 处理金额字段，支持字符串或数字格式
	var amount float64
	var err error
	switch v := req.Amount.(type) {
	case float64:
		amount = v
	case string:
		amount, err = strconv.ParseFloat(v, 64)
		if err != nil {
			log.Printf("[RequestWithdrawal] 金额格式错误: %v, 值=%v", err, v)
			c.JSON(http.StatusBadRequest, gin.H{"error": "金额格式错误", "details": err.Error()})
			return
		}
	default:
		log.Printf("[RequestWithdrawal] 金额类型错误: %T, 值=%v", req.Amount, req.Amount)
		c.JSON(http.StatusBadRequest, gin.H{"error": "金额格式错误", "details": "金额必须是数字或字符串"})
		return
	}

	// 验证金额是否合法
	if amount <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "金额必须大于0"})
		return
	}

	log.Printf("[RequestWithdrawal] 解析后的金额: %.2f, 支付宝账户: %s", amount, req.AlipayAccount)

	// 获取用户信息，验证余额
	var user models.User
	result := db.DB.First(&user, userID)
	if result.Error != nil {
		log.Printf("[RequestWithdrawal] 查询用户失败: %v, userID=%v", result.Error, userID)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "获取用户信息失败"})
		return
	}

	// 验证余额是否充足
	if user.Balance < amount {
		c.JSON(http.StatusBadRequest, gin.H{"error": "余额不足", "balance": user.Balance, "requested": amount})
		return
	}

	// 开始数据库事务
	tx := db.DB.Begin()
	if tx.Error != nil {
		log.Printf("[RequestWithdrawal] 开启事务失败: %v", tx.Error)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "处理提现请求失败"})
		return
	}

	// 创建交易记录
	withdrawalUUID := uuid.New().String()
	now := time.Now()
	description := fmt.Sprintf("提现%.2f元到支付宝账户%s", amount, req.AlipayAccount)
	transaction := models.Transaction{
		UUID:        withdrawalUUID,
		UserID:      uint(user.ID),
		Type:        models.TransactionTypeWithdrawal,
		Amount:      -amount, // 提现金额为负数
		Status:      models.TransactionStatusPending,
		Title:       "提现到支付宝",
		Description: &description, // 使用指针
		CreatedAt:   now,
		UpdatedAt:   now,
	}

	if err := tx.Create(&transaction).Error; err != nil {
		tx.Rollback()
		log.Printf("[RequestWithdrawal] 创建交易记录失败: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "创建提现记录失败"})
		return
	}

	// 更新用户余额
	if err := tx.Model(&user).Update("balance", gorm.Expr("balance - ?", amount)).Error; err != nil {
		tx.Rollback()
		log.Printf("[RequestWithdrawal] 更新用户余额失败: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "更新余额失败"})
		return
	}

	// 提交事务
	if err := tx.Commit().Error; err != nil {
		log.Printf("[RequestWithdrawal] 提交事务失败: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "提现处理失败"})
		return
	}

	log.Printf("[RequestWithdrawal] 提现申请成功: 用户ID=%v, 金额=%.2f, 支付宝账户=%s",
		userID, amount, req.AlipayAccount)

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "提现申请已提交，将在1-3个工作日内处理",
		"withdrawal": gin.H{
			"uuid":           withdrawalUUID,
			"amount":         amount,
			"alipay_account": req.AlipayAccount,
			"status":         "pending",
			"created_at":     now.Format(time.RFC3339),
			"balance":        user.Balance - amount, // 返回更新后的余额
		},
	})
}
