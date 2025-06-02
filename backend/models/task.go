package models

import (
	"fmt"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
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
	UUID            string       `gorm:"type:varchar(36);uniqueIndex;not null" json:"uuid"`
	EmployerID      uint         `gorm:"index;not null" json:"employer_id"`
	Title           string       `gorm:"type:varchar(255);not null" json:"title"`
	Description     string       `gorm:"type:text;not null" json:"description"`
	LocationType    LocationType `gorm:"type:enum('online','offline');not null" json:"location_type"`
	LocationDetails *string      `gorm:"type:varchar(255)" json:"location_details"`
	StartDate       time.Time    `gorm:"type:date;not null;index" json:"start_date"`
	EndDate         time.Time    `gorm:"type:date;not null;index" json:"end_date"`
	PaymentType     PaymentType  `gorm:"type:enum('hourly','daily','fixed');not null" json:"payment_type"`
	BudgetAmount    float64      `gorm:"type:decimal(12,2);not null" json:"budget_amount"`
	Currency        string       `gorm:"type:varchar(3);not null;default:'CNY'" json:"currency"`
	Headcount       uint         `gorm:"type:int unsigned;not null;default:1" json:"headcount"`
	Status          TaskStatus   `gorm:"type:enum('pending_approval','recruiting','in_progress','payment_pending','completed','closed','rejected');not null;default:'pending_approval';index" json:"status"`
	IsPublic        bool         `gorm:"not null;default:true;index" json:"is_public"`
	IsUrgent        bool         `gorm:"not null;default:false;index" json:"is_urgent"`
	PublishedAt     *time.Time   `gorm:"index" json:"published_at"`
	CreatedAt       time.Time    `gorm:"not null;default:CURRENT_TIMESTAMP;index" json:"created_at"`
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
func (t *Task) BeforeCreate(tx *gorm.DB) (err error) {
	// Generate UUID if not set
	if t.UUID == "" {
		t.UUID = uuid.New().String()
	}

	// Check if the index exists before creating it
	var count int64
	tx.Raw("SELECT COUNT(*) FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'tasks' AND index_name = 'idx_tasks_employer_id_status'").Count(&count)

	if count == 0 {
		// Create index if it doesn't exist
		return tx.Exec("CREATE INDEX idx_tasks_employer_id_status ON tasks(employer_id, status)").Error
	}
	return nil
}

// TableName specifies the table name and adds a composite index
func (t *Task) TableName() string {
	// This will create a composite index on employer_id and status
	return "tasks"
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
