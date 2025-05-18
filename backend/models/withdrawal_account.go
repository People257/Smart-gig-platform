package models

import (
	"time"
)

// AccountType represents the type of a withdrawal account
type AccountType string

// Enum values for AccountType
const (
	AccountTypeAlipay    AccountType = "alipay"
	AccountTypeWechatPay AccountType = "wechatpay"
	AccountTypeBank      AccountType = "bank"
	AccountTypeBankCard  AccountType = "bank_card"
)

// WithdrawalAccount represents the withdrawal_accounts table
type WithdrawalAccount struct {
	ID                     uint        `gorm:"primaryKey" json:"id"`
	UUID                   string      `gorm:"type:varchar(36);uniqueIndex;not null" json:"uuid"`
	UserID                 uint        `gorm:"index;not null" json:"user_id"`
	User                   User        `gorm:"foreignKey:UserID" json:"user,omitempty"`
	AccountType            AccountType `gorm:"type:varchar(20);not null" json:"account_type"`
	Account                string      `gorm:"type:varchar(100)" json:"account"`
	AccountHolderName      string      `gorm:"type:varchar(100);not null" json:"account_holder_name"`
	AccountNumberEncrypted string      `gorm:"type:varchar(512);not null" json:"-"`
	AccountNumberMasked    string      `gorm:"-" json:"account_number_masked"`
	RealName               *string     `gorm:"type:varchar(50)" json:"real_name"`
	BankName               *string     `gorm:"type:varchar(100)" json:"bank_name"`
	IsDefault              bool        `gorm:"not null;default:false" json:"is_default"`
	CreatedAt              time.Time   `gorm:"not null;default:CURRENT_TIMESTAMP" json:"created_at"`
	UpdatedAt              time.Time   `gorm:"not null;default:CURRENT_TIMESTAMP" json:"updated_at"`
	DeletedAt              *time.Time  `gorm:"index" json:"-"`
}
