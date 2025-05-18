package models

import (
	"time"
)

// WorkerStatus represents the worker's status on an assignment
type WorkerStatus string

// Enum values for WorkerStatus
const (
	WorkerStatusWorking   WorkerStatus = "working"
	WorkerStatusSubmitted WorkerStatus = "submitted"
	WorkerStatusCompleted WorkerStatus = "completed"
	WorkerStatusQuit      WorkerStatus = "quit"
)

// EmployerStatus represents the employer's status on an assignment
type EmployerStatus string

// Enum values for EmployerStatus
const (
	EmployerStatusInProgress     EmployerStatus = "in_progress"
	EmployerStatusReviewPending  EmployerStatus = "review_pending"
	EmployerStatusPaymentPending EmployerStatus = "payment_pending"
	EmployerStatusCompleted      EmployerStatus = "completed"
	EmployerStatusDisputed       EmployerStatus = "disputed"
)

// TaskAssignment represents the task_assignments table
type TaskAssignment struct {
	ID                uint           `gorm:"primary_key" json:"id"`
	UUID              string         `gorm:"type:varchar(36);unique_index;not null" json:"uuid"`
	TaskApplicationID *uint          `gorm:"unique" json:"task_application_id"`
	TaskID            uint           `gorm:"not null" json:"task_id"`
	WorkerID          uint           `gorm:"not null" json:"worker_id"`
	AssignedAt        time.Time      `gorm:"not null;default:CURRENT_TIMESTAMP" json:"assigned_at"`
	WorkerStatus      WorkerStatus   `gorm:"type:enum('working','submitted','completed','quit');not null;default:'working'" json:"worker_status"`
	EmployerStatus    EmployerStatus `gorm:"type:enum('in_progress','review_pending','payment_pending','completed','disputed');not null;default:'in_progress'" json:"employer_status"`
	CompletedAt       *time.Time     `json:"completed_at"`
	UpdatedAt         time.Time      `gorm:"not null;default:CURRENT_TIMESTAMP" json:"updated_at"`

	// Relations
	TaskApplication TaskApplication `gorm:"foreignkey:TaskApplicationID" json:"task_application,omitempty"`
	Task            Task            `gorm:"foreignkey:TaskID" json:"task,omitempty"`
	Worker          User            `gorm:"foreignkey:WorkerID" json:"worker,omitempty"`
	Reviews         []Review        `gorm:"foreignkey:TaskAssignmentID" json:"reviews,omitempty"`
	Transactions    []Transaction   `gorm:"foreignkey:TaskAssignmentID" json:"transactions,omitempty"`
}

// SubmitWork changes the worker status to submitted
func (ta *TaskAssignment) SubmitWork() {
	ta.WorkerStatus = WorkerStatusSubmitted
	ta.EmployerStatus = EmployerStatusReviewPending
}

// ApproveWork changes the employer status to payment pending
func (ta *TaskAssignment) ApproveWork() {
	ta.EmployerStatus = EmployerStatusPaymentPending
}

// MarkAsPaid changes both statuses to completed
func (ta *TaskAssignment) MarkAsPaid() {
	now := time.Now()
	ta.WorkerStatus = WorkerStatusCompleted
	ta.EmployerStatus = EmployerStatusCompleted
	ta.CompletedAt = &now
}

// ReportDispute changes the employer status to disputed
func (ta *TaskAssignment) ReportDispute() {
	ta.EmployerStatus = EmployerStatusDisputed
}

// QuitTask changes the worker status to quit
func (ta *TaskAssignment) QuitTask() {
	ta.WorkerStatus = WorkerStatusQuit
}

// BeforeCreate is a GORM hook that runs before creating an assignment record
func (ta *TaskAssignment) BeforeCreate() error {
	if ta.WorkerStatus == "" {
		ta.WorkerStatus = WorkerStatusWorking
	}
	if ta.EmployerStatus == "" {
		ta.EmployerStatus = EmployerStatusInProgress
	}
	return nil
}
