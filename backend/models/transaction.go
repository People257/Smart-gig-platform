package models

import (
	"time"
)

// Transaction types
type TransactionType string

const (
	TransactionTypeEarning    TransactionType = "earning"
	TransactionTypeFee        TransactionType = "fee"
	TransactionTypeWithdrawal TransactionType = "withdrawal"
	TransactionTypeRefund     TransactionType = "refund"
)

// Transaction statuses
type TransactionStatus string

const (
	TransactionStatusPending   TransactionStatus = "pending"
	TransactionStatusCompleted TransactionStatus = "completed"
	TransactionStatusCancelled TransactionStatus = "cancelled"
	TransactionStatusFailed    TransactionStatus = "failed"
)

// Reference types
type ReferenceType string

const (
	ReferenceTypeTask       ReferenceType = "task"
	ReferenceTypeWithdrawal ReferenceType = "withdrawal"
	ReferenceTypeRefund     ReferenceType = "refund"
)

// Transaction represents a financial transaction in the system
type Transaction struct {
	ID               uint              `gorm:"primaryKey"`
	UUID             string            `gorm:"type:varchar(36);uniqueIndex"`
	UserID           uint              `gorm:"index"`
	TaskAssignmentID *uint             `gorm:"index"`
	Type             TransactionType   `gorm:"type:varchar(20);index"`
	Amount           float64           `gorm:"type:decimal(10,2)"`
	Currency         string            `gorm:"type:char(3);default:'CNY'"`
	Status           TransactionStatus `gorm:"type:varchar(20);index"`
	Title            string            `gorm:"type:varchar(100)"`
	Description      *string           `gorm:"type:text"`
	ReferenceID      *uint             `gorm:"index"`
	ReferenceType    ReferenceType     `gorm:"type:varchar(20);index"`
	ReferenceUUID    *string           `gorm:"type:varchar(36);index"`
	CreatedAt        time.Time
	UpdatedAt        time.Time
	CompletedAt      *time.Time
}

// Withdrawal statuses
type WithdrawalStatus string

const (
	WithdrawalStatusPending    WithdrawalStatus = "pending"
	WithdrawalStatusProcessing WithdrawalStatus = "processing"
	WithdrawalStatusCompleted  WithdrawalStatus = "completed"
	WithdrawalStatusRejected   WithdrawalStatus = "rejected"
	WithdrawalStatusFailed     WithdrawalStatus = "failed"
)

// Withdrawal represents a user's withdrawal request
type Withdrawal struct {
	ID            uint              `gorm:"primaryKey"`
	UUID          string            `gorm:"type:varchar(36);uniqueIndex"`
	UserID        uint              `gorm:"index"`
	TransactionID uint              `gorm:"index"`
	Transaction   Transaction       `gorm:"foreignKey:TransactionID"`
	Amount        float64           `gorm:"type:decimal(10,2)"`
	AccountID     uint              `gorm:"index"`
	Account       WithdrawalAccount `gorm:"foreignKey:AccountID"`
	Status        WithdrawalStatus  `gorm:"type:varchar(20);index"`
	Notes         *string           `gorm:"type:text"`
	AdminID       *uint
	RequestedAt   time.Time
	UpdatedAt     time.Time
	CompletedAt   *time.Time
}

// UserPaymentSettings represents a user's payment preferences
type UserPaymentSettings struct {
	ID                      uint    `gorm:"primaryKey"`
	UserID                  uint    `gorm:"uniqueIndex"`
	User                    User    `gorm:"foreignKey:UserID"`
	AutoWithdrawalEnabled   bool    `gorm:"default:false"`
	AutoWithdrawalThreshold float64 `gorm:"type:decimal(10,2);default:0"`
	AutoWithdrawalAccountID *uint
	NotifyPaymentReceived   bool `gorm:"default:true"`
	NotifyWithdrawalStatus  bool `gorm:"default:true"`
	CreatedAt               time.Time
	UpdatedAt               time.Time
}
