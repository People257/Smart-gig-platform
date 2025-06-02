package models

import (
	"time"

	"gorm.io/datatypes"
	"gorm.io/gorm"
)

// UserType represents user roles
type UserType string

// Enum values for UserType
const (
	UserTypeWorker   UserType = "worker"
	UserTypeEmployer UserType = "employer"
	UserTypeAdmin    UserType = "admin"
)

// IdentityVerificationStatus represents verification status
type IdentityVerificationStatus string

// Enum values for IdentityVerificationStatus
const (
	IdentityStatusNotVerified IdentityVerificationStatus = "not_verified"
	IdentityStatusPending     IdentityVerificationStatus = "pending"
	IdentityStatusVerified    IdentityVerificationStatus = "verified"
	IdentityStatusRejected    IdentityVerificationStatus = "rejected"
)

// User represents the users table
type User struct {
	ID                       uint                       `gorm:"primaryKey" json:"id"`
	UUID                     string                     `gorm:"type:varchar(36);uniqueIndex" json:"uuid"`
	Username                 *string                    `gorm:"type:varchar(50);uniqueIndex" json:"username"`
	Email                    *string                    `gorm:"type:varchar(255);uniqueIndex" json:"email"`
	PhoneNumber              *string                    `gorm:"type:varchar(20);uniqueIndex" json:"phone_number"`
	PasswordHash             *string                    `gorm:"type:varchar(255)" json:"-"`
	UserType                 UserType                   `gorm:"type:enum('worker','employer','admin');not null" json:"user_type"`
	Name                     *string                    `gorm:"type:varchar(100)" json:"name"`
	AvatarURL                *string                    `gorm:"type:varchar(512)" json:"avatar_url"`
	Bio                      *string                    `gorm:"type:text" json:"bio"`
	Location                 *string                    `gorm:"type:varchar(255)" json:"location"`
	HourlyRate               *float64                   `gorm:"type:decimal(10,2)" json:"hourly_rate"`
	PhoneVerifiedAt          *time.Time                 `json:"phone_verified_at"`
	EmailVerifiedAt          *time.Time                 `json:"email_verified_at"`
	IdentityVerifiedStatus   IdentityVerificationStatus `gorm:"type:enum('not_verified','pending','verified','rejected');not null;default:'not_verified'" json:"identity_verified_status"`
	IdentityVerificationDocs datatypes.JSON             `gorm:"type:json" json:"identity_verification_docs"`
	Balance                  float64                    `gorm:"type:decimal(12,2);not null;default:0.00" json:"balance"`
	CreatedAt                time.Time                  `gorm:"autoCreateTime" json:"created_at"`
	UpdatedAt                time.Time                  `gorm:"autoUpdateTime" json:"updated_at"`
	DeletedAt                gorm.DeletedAt             `gorm:"index" json:"-"`
	RealName                 *string                    `gorm:"type:varchar(50)" json:"real_name,omitempty"`
	IDCard                   *string                    `gorm:"type:varchar(18)" json:"id_card,omitempty"`

	// Relations
	Skills        []Skill           `gorm:"many2many:user_skills;" json:"skills,omitempty"`
	Tasks         []Task            `gorm:"foreignKey:EmployerID" json:"tasks,omitempty"`
	Applications  []TaskApplication `gorm:"foreignKey:WorkerID" json:"applications,omitempty"`
	Assignments   []TaskAssignment  `gorm:"foreignKey:WorkerID" json:"assignments,omitempty"`
	Portfolios    []UserPortfolio   `gorm:"foreignKey:UserID" json:"portfolios,omitempty"`
	FavoriteTasks []Task            `gorm:"many2many:user_favorites;" json:"favorite_tasks,omitempty"`
}

// UserSkill represents the user_skills pivot table
type UserSkill struct {
	UserID  uint `gorm:"primaryKey" json:"user_id"`
	SkillID uint `gorm:"primaryKey" json:"skill_id"`
}

// UserFavorite represents the user_favorites pivot table
type UserFavorite struct {
	UserID    uint      `gorm:"primaryKey" json:"user_id"`
	TaskID    uint      `gorm:"primaryKey" json:"task_id"`
	CreatedAt time.Time `gorm:"autoCreateTime" json:"created_at"`
}
