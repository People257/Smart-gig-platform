package models

import (
	"time"
)

// VerificationCodeType represents the types of verification codes
type VerificationCodeType string

// Enum values for VerificationCodeType
const (
	VerificationCodeTypeRegister      VerificationCodeType = "register"
	VerificationCodeTypeLogin         VerificationCodeType = "login"
	VerificationCodeTypePasswordReset VerificationCodeType = "password_reset"
	VerificationCodeTypePhoneBind     VerificationCodeType = "phone_bind"
)

// VerificationCode represents the verification_codes table
type VerificationCode struct {
	ID        uint                 `gorm:"primary_key" json:"id"`
	Target    string               `gorm:"type:varchar(255);not null" json:"target"` // Phone number or email
	Code      string               `gorm:"type:varchar(10);not null" json:"code"`
	Type      VerificationCodeType `gorm:"type:enum('register','login','password_reset','phone_bind');not null" json:"type"`
	ExpiresAt time.Time            `gorm:"not null" json:"expires_at"`
	UsedAt    *time.Time           `json:"used_at"`
	CreatedAt time.Time            `gorm:"not null;default:CURRENT_TIMESTAMP" json:"created_at"`
}

// IsExpired checks if the verification code is expired
func (v *VerificationCode) IsExpired() bool {
	return time.Now().After(v.ExpiresAt)
}

// IsUsed checks if the verification code has been used
func (v *VerificationCode) IsUsed() bool {
	return v.UsedAt != nil
}

// MarkAsUsed marks the verification code as used
func (v *VerificationCode) MarkAsUsed() {
	now := time.Now()
	v.UsedAt = &now
}
