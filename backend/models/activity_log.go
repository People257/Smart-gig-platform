package models

import (
	"time"
)

// ActivityLog represents the activity_logs table
type ActivityLog struct {
	ID               uint      `gorm:"primary_key" json:"id"`
	UserID           *uint     `json:"user_id"`
	TargetUserID     *uint     `json:"target_user_id"`
	TargetEntityType *string   `gorm:"type:varchar(50)" json:"target_entity_type"`
	TargetEntityID   *string   `gorm:"type:varchar(36)" json:"target_entity_id"`
	ActionType       string    `gorm:"type:varchar(100);not null" json:"action_type"`
	Description      *string   `gorm:"type:text" json:"description"`
	Details          string    `gorm:"type:json" json:"details"`
	IPAddress        *string   `gorm:"type:varchar(45)" json:"ip_address"`
	UserAgent        *string   `gorm:"type:text" json:"user_agent"`
	CreatedAt        time.Time `gorm:"not null;default:CURRENT_TIMESTAMP" json:"created_at"`

	// Relations
	User       *User `gorm:"foreignkey:UserID" json:"user,omitempty"`
	TargetUser *User `gorm:"foreignkey:TargetUserID" json:"target_user,omitempty"`
}
