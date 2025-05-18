package models

import (
	"time"
)

// Skill represents the skills table
type Skill struct {
	ID        uint      `gorm:"primary_key" json:"id"`
	Name      string    `gorm:"type:varchar(100);unique_index;not null" json:"name"`
	CreatedAt time.Time `gorm:"not null;default:CURRENT_TIMESTAMP" json:"created_at"`

	// Relations
	Users []User `gorm:"many2many:user_skills;" json:"users,omitempty"`
	Tasks []Task `gorm:"many2many:task_skills;" json:"tasks,omitempty"`
}
