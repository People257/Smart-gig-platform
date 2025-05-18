package models

import (
	"time"
)

// UserPortfolio represents the user_portfolios table
type UserPortfolio struct {
	ID           uint       `gorm:"primary_key" json:"id"`
	UUID         string     `gorm:"type:varchar(36);unique_index;not null" json:"uuid"`
	UserID       uint       `gorm:"not null" json:"user_id"`
	Title        string     `gorm:"type:varchar(255);not null" json:"title"`
	Description  *string    `gorm:"type:text" json:"description"`
	FileURL      string     `gorm:"type:varchar(512);not null" json:"file_url"`
	ThumbnailURL *string    `gorm:"type:varchar(512)" json:"thumbnail_url"`
	FileType     *string    `gorm:"type:varchar(50)" json:"file_type"`
	CreatedAt    time.Time  `gorm:"not null;default:CURRENT_TIMESTAMP" json:"created_at"`
	UpdatedAt    time.Time  `gorm:"not null;default:CURRENT_TIMESTAMP" json:"updated_at"`
	DeletedAt    *time.Time `gorm:"index" json:"-"`

	// Relations
	User User `gorm:"foreignkey:UserID" json:"user,omitempty"`
}
