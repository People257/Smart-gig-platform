package models

import (
	"fmt"
	"time"
)

// LocationType represents the task location type
type LocationType string

// Enum values for LocationType
const (
	LocationTypeOnline  LocationType = "online"
	LocationTypeOffline LocationType = "offline"
)

// PaymentType represents the task payment type
type PaymentType string

// Enum values for PaymentType
const (
	PaymentTypeHourly PaymentType = "hourly"
	PaymentTypeDaily  PaymentType = "daily"
	PaymentTypeFixed  PaymentType = "fixed"
)

// TaskStatus represents the status of a task
type TaskStatus string

// Enum values for TaskStatus
const (
	TaskStatusPendingApproval TaskStatus = "pending_approval"
	TaskStatusRecruiting      TaskStatus = "recruiting"
	TaskStatusInProgress      TaskStatus = "in_progress"
	TaskStatusPaymentPending  TaskStatus = "payment_pending"
	TaskStatusCompleted       TaskStatus = "completed"
	TaskStatusClosed          TaskStatus = "closed"
	TaskStatusRejected        TaskStatus = "rejected"
)

// Task represents the tasks table
type Task struct {
	ID              uint         `gorm:"primary_key" json:"id"`
	UUID            string       `gorm:"type:varchar(36);unique_index;not null" json:"uuid"`
	EmployerID      uint         `gorm:"not null" json:"employer_id"`
	Title           string       `gorm:"type:varchar(255);not null" json:"title"`
	Description     string       `gorm:"type:text;not null" json:"description"`
	LocationType    LocationType `gorm:"type:enum('online','offline');not null" json:"location_type"`
	LocationDetails *string      `gorm:"type:varchar(255)" json:"location_details"`
	StartDate       time.Time    `gorm:"type:date;not null" json:"start_date"`
	EndDate         time.Time    `gorm:"type:date;not null" json:"end_date"`
	PaymentType     PaymentType  `gorm:"type:enum('hourly','daily','fixed');not null" json:"payment_type"`
	BudgetAmount    float64      `gorm:"type:decimal(12,2);not null" json:"budget_amount"`
	Currency        string       `gorm:"type:varchar(3);not null;default:'CNY'" json:"currency"`
	Headcount       uint         `gorm:"type:int unsigned;not null;default:1" json:"headcount"`
	Status          TaskStatus   `gorm:"type:enum('pending_approval','recruiting','in_progress','payment_pending','completed','closed','rejected');not null;default:'pending_approval'" json:"status"`
	IsPublic        bool         `gorm:"not null;default:true" json:"is_public"`
	IsUrgent        bool         `gorm:"not null;default:false" json:"is_urgent"`
	PublishedAt     *time.Time   `json:"published_at"`
	CreatedAt       time.Time    `gorm:"not null;default:CURRENT_TIMESTAMP" json:"created_at"`
	UpdatedAt       time.Time    `gorm:"not null;default:CURRENT_TIMESTAMP" json:"updated_at"`
	DeletedAt       *time.Time   `gorm:"index" json:"-"`

	// Relations
	Employer     User              `gorm:"foreignkey:EmployerID" json:"employer,omitempty"`
	Skills       []Skill           `gorm:"many2many:task_skills;" json:"skills,omitempty"`
	Applications []TaskApplication `gorm:"foreignkey:TaskID" json:"applications,omitempty"`
	Assignments  []TaskAssignment  `gorm:"foreignkey:TaskID" json:"assignments,omitempty"`
	FavoritedBy  []User            `gorm:"many2many:user_favorites;" json:"favorited_by,omitempty"`
}

// TaskSkill represents the task_skills pivot table
type TaskSkill struct {
	TaskID  uint `gorm:"primary_key" json:"task_id"`
	SkillID uint `gorm:"primary_key" json:"skill_id"`
}

// BeforeCreate is a GORM hook that runs before creating a task record
func (t *Task) BeforeCreate() error {
	if t.Status == "" {
		t.Status = TaskStatusPendingApproval
	}
	if t.Currency == "" {
		t.Currency = "CNY"
	}
	return nil
}

// BudgetDisplay returns a formatted budget display string
func (t *Task) BudgetDisplay() string {
	switch t.PaymentType {
	case PaymentTypeHourly:
		return fmt.Sprintf("%.2f%s/小时", t.BudgetAmount, t.Currency)
	case PaymentTypeDaily:
		return fmt.Sprintf("%.2f%s/天", t.BudgetAmount, t.Currency)
	default: // PaymentTypeFixed
		return fmt.Sprintf("%.2f%s/项目", t.BudgetAmount, t.Currency)
	}
}
