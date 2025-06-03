package models

import (
	"gorm.io/gorm"
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

	// Define foreign key relationships using the new GORM API
	db.Migrator().CreateConstraint(&UserSkill{}, "fk_user_skills_user")
	db.Migrator().CreateConstraint(&UserSkill{}, "fk_user_skills_skill")

	db.Migrator().CreateConstraint(&Task{}, "fk_tasks_employer")

	db.Migrator().CreateConstraint(&TaskSkill{}, "fk_task_skills_task")
	db.Migrator().CreateConstraint(&TaskSkill{}, "fk_task_skills_skill")

	db.Migrator().CreateConstraint(&TaskApplication{}, "fk_task_applications_task")
	db.Migrator().CreateConstraint(&TaskApplication{}, "fk_task_applications_worker")

	db.Migrator().CreateConstraint(&TaskAssignment{}, "fk_task_assignments_application")
	db.Migrator().CreateConstraint(&TaskAssignment{}, "fk_task_assignments_task")
	db.Migrator().CreateConstraint(&TaskAssignment{}, "fk_task_assignments_worker")

	db.Migrator().CreateConstraint(&Transaction{}, "fk_transactions_user")
	db.Migrator().CreateConstraint(&Transaction{}, "fk_transactions_task_assignment")

	db.Migrator().CreateConstraint(&WithdrawalAccount{}, "fk_withdrawal_accounts_user")

	db.Migrator().CreateConstraint(&Review{}, "fk_reviews_task_assignment")
	db.Migrator().CreateConstraint(&Review{}, "fk_reviews_reviewer")
	db.Migrator().CreateConstraint(&Review{}, "fk_reviews_reviewee")

	db.Migrator().CreateConstraint(&UserPortfolio{}, "fk_user_portfolios_user")

	db.Migrator().CreateConstraint(&UserFavorite{}, "fk_user_favorites_user")
	db.Migrator().CreateConstraint(&UserFavorite{}, "fk_user_favorites_task")
}
