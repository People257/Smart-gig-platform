package models

import (
	"github.com/jinzhu/gorm"
)

// InitModels sets up the database models
func InitModels(db *gorm.DB) {
	// Auto-migrate models
	// This will automatically create tables and modify them to match the model structure
	db.AutoMigrate(
		&User{},
		&VerificationCode{},
		&Skill{},
		&Task{},
		&TaskApplication{},
		&TaskAssignment{},
		&Transaction{},
		&WithdrawalAccount{},
		&Review{},
		&UserPortfolio{},
		&ActivityLog{},
	)

	// Define foreign key relationships
	db.Model(&UserSkill{}).AddForeignKey("user_id", "users(id)", "CASCADE", "NO ACTION")
	db.Model(&UserSkill{}).AddForeignKey("skill_id", "skills(id)", "CASCADE", "NO ACTION")

	db.Model(&Task{}).AddForeignKey("employer_id", "users(id)", "RESTRICT", "NO ACTION")

	db.Model(&TaskSkill{}).AddForeignKey("task_id", "tasks(id)", "CASCADE", "NO ACTION")
	db.Model(&TaskSkill{}).AddForeignKey("skill_id", "skills(id)", "CASCADE", "NO ACTION")

	db.Model(&TaskApplication{}).AddForeignKey("task_id", "tasks(id)", "CASCADE", "NO ACTION")
	db.Model(&TaskApplication{}).AddForeignKey("worker_id", "users(id)", "CASCADE", "NO ACTION")

	db.Model(&TaskAssignment{}).AddForeignKey("task_application_id", "task_applications(id)", "SET NULL", "NO ACTION")
	db.Model(&TaskAssignment{}).AddForeignKey("task_id", "tasks(id)", "CASCADE", "NO ACTION")
	db.Model(&TaskAssignment{}).AddForeignKey("worker_id", "users(id)", "CASCADE", "NO ACTION")

	db.Model(&Transaction{}).AddForeignKey("user_id", "users(id)", "RESTRICT", "NO ACTION")
	db.Model(&Transaction{}).AddForeignKey("related_user_id", "users(id)", "SET NULL", "NO ACTION")
	db.Model(&Transaction{}).AddForeignKey("task_assignment_id", "task_assignments(id)", "SET NULL", "NO ACTION")

	db.Model(&WithdrawalAccount{}).AddForeignKey("user_id", "users(id)", "CASCADE", "NO ACTION")

	db.Model(&Review{}).AddForeignKey("task_assignment_id", "task_assignments(id)", "CASCADE", "NO ACTION")
	db.Model(&Review{}).AddForeignKey("reviewer_id", "users(id)", "CASCADE", "NO ACTION")
	db.Model(&Review{}).AddForeignKey("reviewee_id", "users(id)", "CASCADE", "NO ACTION")

	db.Model(&UserPortfolio{}).AddForeignKey("user_id", "users(id)", "CASCADE", "NO ACTION")

	db.Model(&UserFavorite{}).AddForeignKey("user_id", "users(id)", "CASCADE", "NO ACTION")
	db.Model(&UserFavorite{}).AddForeignKey("task_id", "tasks(id)", "CASCADE", "NO ACTION")
}
