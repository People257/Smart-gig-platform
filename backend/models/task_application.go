package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
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
	UUID        string            `gorm:"type:varchar(36);uniqueIndex;not null" json:"uuid"`
	TaskID      uint              `gorm:"index;not null" json:"task_id"`
	WorkerID    uint              `gorm:"index;not null" json:"worker_id"`
	Status      ApplicationStatus `gorm:"type:enum('pending','accepted','rejected','withdrawn');not null;default:'pending';index" json:"status"`
	CoverLetter *string           `gorm:"type:text" json:"cover_letter"`
	AppliedAt   time.Time         `gorm:"not null;default:CURRENT_TIMESTAMP;index" json:"applied_at"`
	UpdatedAt   time.Time         `gorm:"not null;default:CURRENT_TIMESTAMP" json:"updated_at"`

	// Relations
	Task   Task `gorm:"foreignkey:TaskID" json:"task,omitempty"`
	Worker User `gorm:"foreignkey:WorkerID" json:"worker,omitempty"`
}

// TableName specifies the table name and adds a composite index
func (ta *TaskApplication) TableName() string {
	return "task_applications"
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
func (ta *TaskApplication) BeforeCreate(tx *gorm.DB) (err error) {
	// Generate UUID if not set
	if ta.UUID == "" {
		ta.UUID = uuid.New().String()
	}

	// Check if the index exists before creating it
	var count int64
	tx.Raw("SELECT COUNT(*) FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'task_applications' AND index_name = 'idx_task_applications_task_id_status'").Count(&count)

	if count == 0 {
		// Create index if it doesn't exist
		return tx.Exec("CREATE INDEX idx_task_applications_task_id_status ON task_applications(task_id, status)").Error
	}
	return nil
}
