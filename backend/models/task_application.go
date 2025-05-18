package models

import (
	"time"
)

// ApplicationStatus represents the status of a task application
type ApplicationStatus string

// Enum values for ApplicationStatus
const (
	ApplicationStatusPending   ApplicationStatus = "pending"
	ApplicationStatusAccepted  ApplicationStatus = "accepted"
	ApplicationStatusRejected  ApplicationStatus = "rejected"
	ApplicationStatusWithdrawn ApplicationStatus = "withdrawn"
)

// TaskApplication represents the task_applications table
type TaskApplication struct {
	ID          uint              `gorm:"primary_key" json:"id"`
	UUID        string            `gorm:"type:varchar(36);unique_index;not null" json:"uuid"`
	TaskID      uint              `gorm:"not null" json:"task_id"`
	WorkerID    uint              `gorm:"not null" json:"worker_id"`
	Status      ApplicationStatus `gorm:"type:enum('pending','accepted','rejected','withdrawn');not null;default:'pending'" json:"status"`
	CoverLetter *string           `gorm:"type:text" json:"cover_letter"`
	AppliedAt   time.Time         `gorm:"not null;default:CURRENT_TIMESTAMP" json:"applied_at"`
	UpdatedAt   time.Time         `gorm:"not null;default:CURRENT_TIMESTAMP" json:"updated_at"`

	// Relations
	Task   Task `gorm:"foreignkey:TaskID" json:"task,omitempty"`
	Worker User `gorm:"foreignkey:WorkerID" json:"worker,omitempty"`
}

// Accept changes the application status to accepted
func (ta *TaskApplication) Accept() {
	ta.Status = ApplicationStatusAccepted
}

// Reject changes the application status to rejected
func (ta *TaskApplication) Reject() {
	ta.Status = ApplicationStatusRejected
}

// Withdraw changes the application status to withdrawn
func (ta *TaskApplication) Withdraw() {
	ta.Status = ApplicationStatusWithdrawn
}

// BeforeCreate is a GORM hook that runs before creating an application record
func (ta *TaskApplication) BeforeCreate() error {
	if ta.Status == "" {
		ta.Status = ApplicationStatusPending
	}
	return nil
}
