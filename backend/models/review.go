package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// ReviewType represents the type of review
type ReviewType string

// Enum values for ReviewType
const (
	ReviewTypeEmployerToWorker ReviewType = "employer_to_worker"
	ReviewTypeWorkerToEmployer ReviewType = "worker_to_employer"
)

// Review represents the reviews table
type Review struct {
	ID               uint       `gorm:"primary_key" json:"id"`
	UUID             string     `gorm:"type:varchar(36);unique_index;not null" json:"uuid"`
	TaskID           uint       `gorm:"not null" json:"task_id"`
	TaskAssignmentID uint       `gorm:"not null" json:"task_assignment_id"`
	ReviewerID       uint       `gorm:"not null" json:"reviewer_id"`
	RevieweeID       uint       `gorm:"not null" json:"reviewee_id"`
	Rating           uint8      `gorm:"type:tinyint unsigned;not null" json:"rating"`
	Comment          *string    `gorm:"type:text" json:"comment"`
	ReviewType       ReviewType `gorm:"type:enum('employer_to_worker','worker_to_employer');not null" json:"review_type"`
	CreatedAt        time.Time  `gorm:"not null;default:CURRENT_TIMESTAMP" json:"created_at"`

	// Relations
	TaskAssignment TaskAssignment `gorm:"foreignkey:TaskAssignmentID" json:"task_assignment,omitempty"`
	Reviewer       User           `gorm:"foreignkey:ReviewerID" json:"reviewer,omitempty"`
	Reviewee       User           `gorm:"foreignkey:RevieweeID" json:"reviewee,omitempty"`
}

// BeforeCreate is a GORM hook that runs before creating a review record
func (r *Review) BeforeCreate(tx *gorm.DB) (err error) {
	// Generate UUID if not set
	if r.UUID == "" {
		r.UUID = uuid.New().String()
	}

	// Enforce rating between 1 and 5
	if r.Rating < 1 {
		r.Rating = 1
	} else if r.Rating > 5 {
		r.Rating = 5
	}
	return nil
}
