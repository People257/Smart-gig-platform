package handlers

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// WithdrawalRequest represents the request body for creating a withdrawal
type WithdrawalRequest struct {
	Amount  float64 `json:"amount" binding:"required,gt=0"`
	Account string  `json:"account" binding:"required"`
}

// GetUserWallet handles fetching a user's wallet information
func GetUserWallet(c *gin.Context) {
	// In a real application, we would get the user ID from the authenticated user
	// userID := c.GetUint("userID")

	// In a real application, we would retrieve the user's wallet from the database
	// var user models.User
	// if db.Where("id = ?", userID).First(&user).RecordNotFound() {
	//   c.JSON(http.StatusNotFound, gin.H{"error": "用户未找到"})
	//   return
	// }

	// Create mock wallet for demo
	wallet := gin.H{
		"balance":      1258.75,
		"currency":     "CNY",
		"pending":      450.00,
		"total_earned": 3500.00,
		"total_spent":  1200.00,
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
	// In a real application, we would get the user ID from the authenticated user
	// userID := c.GetUint("userID")

	// Create mock payment data for demo
	c.JSON(http.StatusOK, gin.H{
		"balance":  1250.75,
		"currency": "CNY",
		"recent_transactions": []gin.H{
			{
				"id":          "txn_123456",
				"type":        "earning",
				"amount":      500.00,
				"status":      "completed",
				"date":        time.Now().AddDate(0, 0, -1).Format(time.RFC3339),
				"description": "任务完成：网站开发",
			},
			{
				"id":          "txn_123457",
				"type":        "withdrawal",
				"amount":      -200.00,
				"status":      "pending",
				"date":        time.Now().Format(time.RFC3339),
				"description": "提现申请",
			},
		},
	})
}

// RequestWithdrawal handles a withdrawal request
func RequestWithdrawal(c *gin.Context) {
	var req struct {
		Amount      float64 `json:"amount" binding:"required,gt=0"`
		AccountUUID string  `json:"account_uuid" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "请求参数错误", "details": err.Error()})
		return
	}

	// In a real application, we would validate the account belongs to the user
	// and check if the user has sufficient balance

	// Create withdrawal (in a real app, this would be saved to the database)
	withdrawalUUID := uuid.New().String()
	now := time.Now()

	// Return success response
	c.JSON(http.StatusOK, gin.H{
		"message": "提现申请已提交",
		"withdrawal": gin.H{
			"uuid":         withdrawalUUID,
			"amount":       req.Amount,
			"account_uuid": req.AccountUUID,
			"status":       "pending",
			"created_at":   now.Format(time.RFC3339),
		},
	})
}
