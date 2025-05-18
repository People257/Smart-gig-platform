package models

import (
	"time"
)

// InvalidatedToken 表示已经失效的JWT令牌
type InvalidatedToken struct {
	ID        uint      `json:"id" gorm:"primary_key"`
	Token     string    `json:"token" gorm:"type:text;not null;index"`
	ExpiresAt time.Time `json:"expires_at" gorm:"not null"`
	CreatedAt time.Time `json:"created_at" gorm:"default:CURRENT_TIMESTAMP"`
}
