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
	AccountTypeBankCard  AccountType = "bank_card"
)

// WithdrawalAccount represents the withdrawal_accounts table
type WithdrawalAccount struct {
	ID                     uint        `gorm:"primary_key" json:"id"`
	UUID                   string      `gorm:"type:varchar(36);unique_index;not null" json:"uuid"`
	UserID                 uint        `gorm:"not null" json:"user_id"`
	AccountType            AccountType `gorm:"type:enum('alipay','wechatpay','bank_card');not null" json:"account_type"`
	AccountHolderName      string      `gorm:"type:varchar(100);not null" json:"account_holder_name"`
	AccountNumberEncrypted string      `gorm:"type:varchar(512);not null" json:"-"`
	AccountNumberMasked    string      `gorm:"-" json:"account_number_masked"`
	BankName               *string     `gorm:"type:varchar(100)" json:"bank_name"`
	IsDefault              bool        `gorm:"not null;default:false" json:"is_default"`
	CreatedAt              time.Time   `gorm:"not null;default:CURRENT_TIMESTAMP" json:"created_at"`
	UpdatedAt              time.Time   `gorm:"not null;default:CURRENT_TIMESTAMP" json:"updated_at"`
	DeletedAt              *time.Time  `gorm:"index" json:"-"`

	// Relations
	User User `gorm:"foreignkey:UserID" json:"user,omitempty"`
}
