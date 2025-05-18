-- -----------------------------------------------------
-- MySQL Database Schema for Intelligent Gig Platform
-- -----------------------------------------------------

-- -----------------------------------------------------
-- Table `users`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `users` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `uuid` VARCHAR(36) NOT NULL UNIQUE COMMENT 'Public unique identifier',
  `username` VARCHAR(50) NULL UNIQUE,
  `email` VARCHAR(255) NULL UNIQUE,
  `phone_number` VARCHAR(20) NULL UNIQUE,
  `password_hash` VARCHAR(255) NULL,
  `user_type` ENUM('worker', 'employer', 'admin') NOT NULL,
  `name` VARCHAR(100) NULL,
  `avatar_url` VARCHAR(512) NULL,
  `bio` TEXT NULL,
  `location` VARCHAR(255) NULL,
  `hourly_rate` DECIMAL(10,2) NULL COMMENT 'For workers',
  `phone_verified_at` TIMESTAMP NULL,
  `email_verified_at` TIMESTAMP NULL,
  `identity_verified_status` ENUM('not_verified', 'pending', 'verified', 'rejected') NOT NULL DEFAULT 'not_verified',
  `identity_verification_docs` JSON NULL COMMENT 'Stores ID card image URLs, etc.',
  `balance` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` TIMESTAMP NULL COMMENT 'For soft deletes',
  PRIMARY KEY (`id`),
  INDEX `idx_users_uuid` (`uuid`),
  INDEX `idx_users_user_type` (`user_type`),
  INDEX `idx_users_deleted_at` (`deleted_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------
-- Table `verification_codes`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `verification_codes` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `target` VARCHAR(255) NOT NULL COMMENT 'Phone number or email',
  `code` VARCHAR(10) NOT NULL,
  `type` ENUM('register', 'login', 'password_reset', 'phone_bind') NOT NULL,
  `expires_at` TIMESTAMP NOT NULL,
  `used_at` TIMESTAMP NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_verification_codes_target_type` (`target`, `type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------
-- Table `skills`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `skills` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(100) NOT NULL UNIQUE,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------
-- Table `user_skills` (Pivot table for users and skills)
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `user_skills` (
  `user_id` BIGINT UNSIGNED NOT NULL,
  `skill_id` BIGINT UNSIGNED NOT NULL,
  PRIMARY KEY (`user_id`, `skill_id`),
  INDEX `fk_user_skills_skill_id_idx` (`skill_id` ASC),
  CONSTRAINT `fk_user_skills_user_id`
    FOREIGN KEY (`user_id`)
    REFERENCES `users` (`id`)
    ON DELETE CASCADE
    ON UPDATE NO ACTION,
  CONSTRAINT `fk_user_skills_skill_id`
    FOREIGN KEY (`skill_id`)
    REFERENCES `skills` (`id`)
    ON DELETE CASCADE
    ON UPDATE NO ACTION
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------
-- Table `tasks`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `tasks` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `uuid` VARCHAR(36) NOT NULL UNIQUE COMMENT 'Public unique identifier',
  `employer_id` BIGINT UNSIGNED NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `description` TEXT NOT NULL,
  `location_type` ENUM('online', 'offline') NOT NULL,
  `location_details` VARCHAR(255) NULL COMMENT 'If offline',
  `start_date` DATE NOT NULL,
  `end_date` DATE NOT NULL,
  `payment_type` ENUM('hourly', 'daily', 'fixed') NOT NULL,
  `budget_amount` DECIMAL(12,2) NOT NULL,
  `currency` VARCHAR(3) NOT NULL DEFAULT 'CNY',
  `headcount` INT UNSIGNED NOT NULL DEFAULT 1,
  `status` ENUM('pending_approval', 'recruiting', 'in_progress', 'payment_pending', 'completed', 'closed', 'rejected') NOT NULL DEFAULT 'pending_approval',
  `is_public` BOOLEAN NOT NULL DEFAULT TRUE,
  `is_urgent` BOOLEAN NOT NULL DEFAULT FALSE,
  `published_at` TIMESTAMP NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` TIMESTAMP NULL COMMENT 'For soft deletes',
  PRIMARY KEY (`id`),
  INDEX `idx_tasks_uuid` (`uuid`),
  INDEX `fk_tasks_employer_id_idx` (`employer_id` ASC),
  INDEX `idx_tasks_status` (`status`),
  INDEX `idx_tasks_deleted_at` (`deleted_at`),
  CONSTRAINT `fk_tasks_employer_id`
    FOREIGN KEY (`employer_id`)
    REFERENCES `users` (`id`)
    ON DELETE RESTRICT -- Prevent employer deletion if tasks exist, or use CASCADE if tasks should be deleted too
    ON UPDATE NO ACTION
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------
-- Table `task_skills` (Pivot table for tasks and skills)
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `task_skills` (
  `task_id` BIGINT UNSIGNED NOT NULL,
  `skill_id` BIGINT UNSIGNED NOT NULL,
  PRIMARY KEY (`task_id`, `skill_id`),
  INDEX `fk_task_skills_skill_id_idx` (`skill_id` ASC),
  CONSTRAINT `fk_task_skills_task_id`
    FOREIGN KEY (`task_id`)
    REFERENCES `tasks` (`id`)
    ON DELETE CASCADE
    ON UPDATE NO ACTION,
  CONSTRAINT `fk_task_skills_skill_id`
    FOREIGN KEY (`skill_id`)
    REFERENCES `skills` (`id`)
    ON DELETE CASCADE
    ON UPDATE NO ACTION
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------
-- Table `task_applications`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `task_applications` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `uuid` VARCHAR(36) NOT NULL UNIQUE COMMENT 'Public unique identifier',
  `task_id` BIGINT UNSIGNED NOT NULL,
  `worker_id` BIGINT UNSIGNED NOT NULL,
  `status` ENUM('pending', 'accepted', 'rejected', 'withdrawn') NOT NULL DEFAULT 'pending',
  `cover_letter` TEXT NULL,
  `applied_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_task_applications_uuid` (`uuid`),
  INDEX `fk_task_applications_task_id_idx` (`task_id` ASC),
  INDEX `fk_task_applications_worker_id_idx` (`worker_id` ASC),
  UNIQUE INDEX `uidx_task_worker_application` (`task_id`, `worker_id`), -- A worker can apply to a task only once
  CONSTRAINT `fk_task_applications_task_id`
    FOREIGN KEY (`task_id`)
    REFERENCES `tasks` (`id`)
    ON DELETE CASCADE
    ON UPDATE NO ACTION,
  CONSTRAINT `fk_task_applications_worker_id`
    FOREIGN KEY (`worker_id`)
    REFERENCES `users` (`id`)
    ON DELETE CASCADE
    ON UPDATE NO ACTION
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------
-- Table `task_assignments` (When an application is accepted)
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `task_assignments` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `uuid` VARCHAR(36) NOT NULL UNIQUE,
  `task_application_id` BIGINT UNSIGNED NULL UNIQUE COMMENT 'Link to the original application; NULL if directly assigned',
  `task_id` BIGINT UNSIGNED NOT NULL,
  `worker_id` BIGINT UNSIGNED NOT NULL,
  `assigned_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `worker_status` ENUM('working', 'submitted', 'completed', 'quit') NOT NULL DEFAULT 'working',
  `employer_status` ENUM('in_progress', 'review_pending', 'payment_pending', 'completed', 'disputed') NOT NULL DEFAULT 'in_progress',
  `completed_at` TIMESTAMP NULL,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_task_assignments_uuid` (`uuid`),
  INDEX `fk_task_assignments_task_id_idx` (`task_id`),
  INDEX `fk_task_assignments_worker_id_idx` (`worker_id`),
  CONSTRAINT `fk_task_assignments_application_id`
    FOREIGN KEY (`task_application_id`)
    REFERENCES `task_applications` (`id`)
    ON DELETE SET NULL
    ON UPDATE NO ACTION,
  CONSTRAINT `fk_task_assignments_task_id`
    FOREIGN KEY (`task_id`)
    REFERENCES `tasks` (`id`)
    ON DELETE CASCADE
    ON UPDATE NO ACTION,
  CONSTRAINT `fk_task_assignments_worker_id`
    FOREIGN KEY (`worker_id`)
    REFERENCES `users` (`id`)
    ON DELETE CASCADE
    ON UPDATE NO ACTION
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------
-- Table `transactions`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `transactions` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `uuid` VARCHAR(36) NOT NULL UNIQUE,
  `user_id` BIGINT UNSIGNED NOT NULL COMMENT 'User initiating or primary affected user',
  `related_user_id` BIGINT UNSIGNED NULL COMMENT 'Counterparty user, if applicable',
  `task_assignment_id` BIGINT UNSIGNED NULL COMMENT 'If related to a task payment',
  `amount` DECIMAL(12,2) NOT NULL,
  `currency` VARCHAR(3) NOT NULL DEFAULT 'CNY',
  `type` ENUM('task_payment_to_worker', 'task_payment_from_employer', 'withdrawal_request', 'withdrawal_fee', 'withdrawal_success', 'deposit', 'refund_to_employer', 'refund_from_worker', 'platform_fee') NOT NULL,
  `status` ENUM('pending', 'processing', 'completed', 'failed', 'cancelled', 'requires_action') NOT NULL DEFAULT 'pending',
  `description` VARCHAR(512) NULL,
  `payment_method_details` JSON NULL COMMENT 'Details about payment method, e.g. last 4 digits of card',
  `external_transaction_id` VARCHAR(255) NULL COMMENT 'ID from payment gateway',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_transactions_uuid` (`uuid`),
  INDEX `fk_transactions_user_id_idx` (`user_id` ASC),
  INDEX `fk_transactions_related_user_id_idx` (`related_user_id` ASC),
  INDEX `fk_transactions_task_assignment_id_idx` (`task_assignment_id` ASC),
  INDEX `idx_transactions_type_status` (`type`, `status`),
  CONSTRAINT `fk_transactions_user_id`
    FOREIGN KEY (`user_id`)
    REFERENCES `users` (`id`)
    ON DELETE RESTRICT
    ON UPDATE NO ACTION,
  CONSTRAINT `fk_transactions_related_user_id`
    FOREIGN KEY (`related_user_id`)
    REFERENCES `users` (`id`)
    ON DELETE SET NULL
    ON UPDATE NO ACTION,
  CONSTRAINT `fk_transactions_task_assignment_id`
    FOREIGN KEY (`task_assignment_id`)
    REFERENCES `task_assignments` (`id`)
    ON DELETE SET NULL
    ON UPDATE NO ACTION
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------
-- Table `withdrawal_accounts`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `withdrawal_accounts` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `uuid` VARCHAR(36) NOT NULL UNIQUE,
  `user_id` BIGINT UNSIGNED NOT NULL,
  `account_type` ENUM('alipay', 'wechatpay', 'bank_card') NOT NULL,
  `account_holder_name` VARCHAR(100) NOT NULL,
  `account_number_encrypted` VARCHAR(512) NOT NULL COMMENT 'Encrypted account number/ID',
  `bank_name` VARCHAR(100) NULL COMMENT 'If bank_card',
  `is_default` BOOLEAN NOT NULL DEFAULT FALSE,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` TIMESTAMP NULL,
  PRIMARY KEY (`id`),
  INDEX `idx_withdrawal_accounts_uuid` (`uuid`),
  INDEX `fk_withdrawal_accounts_user_id_idx` (`user_id` ASC),
  INDEX `idx_withdrawal_accounts_deleted_at` (`deleted_at`),
  CONSTRAINT `fk_withdrawal_accounts_user_id`
    FOREIGN KEY (`user_id`)
    REFERENCES `users` (`id`)
    ON DELETE CASCADE
    ON UPDATE NO ACTION
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------
-- Table `reviews`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `reviews` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `uuid` VARCHAR(36) NOT NULL UNIQUE,
  `task_assignment_id` BIGINT UNSIGNED NOT NULL,
  `reviewer_id` BIGINT UNSIGNED NOT NULL,
  `reviewee_id` BIGINT UNSIGNED NOT NULL,
  `rating` TINYINT UNSIGNED NOT NULL COMMENT '1 to 5',
  `comment` TEXT NULL,
  `review_type` ENUM('employer_to_worker', 'worker_to_employer') NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_reviews_uuid` (`uuid`),
  INDEX `fk_reviews_task_assignment_id_idx` (`task_assignment_id` ASC),
  INDEX `fk_reviews_reviewer_id_idx` (`reviewer_id` ASC),
  INDEX `fk_reviews_reviewee_id_idx` (`reviewee_id` ASC),
  UNIQUE INDEX `uidx_review_per_assignment_reviewer` (`task_assignment_id`, `reviewer_id`),
  CONSTRAINT `fk_reviews_task_assignment_id`
    FOREIGN KEY (`task_assignment_id`)
    REFERENCES `task_assignments` (`id`)
    ON DELETE CASCADE
    ON UPDATE NO ACTION,
  CONSTRAINT `fk_reviews_reviewer_id`
    FOREIGN KEY (`reviewer_id`)
    REFERENCES `users` (`id`)
    ON DELETE CASCADE
    ON UPDATE NO ACTION,
  CONSTRAINT `fk_reviews_reviewee_id`
    FOREIGN KEY (`reviewee_id`)
    REFERENCES `users` (`id`)
    ON DELETE CASCADE
    ON UPDATE NO ACTION,
  CONSTRAINT `chk_rating_range` CHECK (`rating` >= 1 AND `rating` <= 5)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------
-- Table `user_portfolios`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `user_portfolios` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `uuid` VARCHAR(36) NOT NULL UNIQUE,
  `user_id` BIGINT UNSIGNED NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `description` TEXT NULL,
  `file_url` VARCHAR(512) NOT NULL COMMENT 'URL to image, video, document',
  `thumbnail_url` VARCHAR(512) NULL,
  `file_type` VARCHAR(50) NULL COMMENT 'e.g., image/jpeg, application/pdf',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` TIMESTAMP NULL,
  PRIMARY KEY (`id`),
  INDEX `idx_user_portfolios_uuid` (`uuid`),
  INDEX `fk_user_portfolios_user_id_idx` (`user_id` ASC),
  INDEX `idx_user_portfolios_deleted_at` (`deleted_at`),
  CONSTRAINT `fk_user_portfolios_user_id`
    FOREIGN KEY (`user_id`)
    REFERENCES `users` (`id`)
    ON DELETE CASCADE
    ON UPDATE NO ACTION
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------
-- Table `activity_logs` (For user dashboard and admin audit)
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `activity_logs` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` BIGINT UNSIGNED NULL COMMENT 'User performing the action, or NULL for system actions',
  `target_user_id` BIGINT UNSIGNED NULL COMMENT 'User affected by the action',
  `target_entity_type` VARCHAR(50) NULL COMMENT 'e.g., task, user, transaction',
  `target_entity_id` VARCHAR(36) NULL COMMENT 'UUID of the target entity',
  `action_type` VARCHAR(100) NOT NULL COMMENT 'e.g., USER_LOGIN, TASK_CREATED, PROFILE_UPDATED',
  `description` TEXT NULL,
  `details` JSON NULL COMMENT 'Additional context for the activity',
  `ip_address` VARCHAR(45) NULL,
  `user_agent` TEXT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_activity_logs_user_id` (`user_id`),
  INDEX `idx_activity_logs_target_user_id` (`target_user_id`),
  INDEX `idx_activity_logs_target_entity` (`target_entity_type`, `target_entity_id`),
  INDEX `idx_activity_logs_action_type` (`action_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------
-- Table `user_favorites` (For favorited tasks)
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `user_favorites` (
  `user_id` BIGINT UNSIGNED NOT NULL,
  `task_id` BIGINT UNSIGNED NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`user_id`, `task_id`),
  INDEX `fk_user_favorites_task_id_idx` (`task_id`),
  CONSTRAINT `fk_user_favorites_user_id`
    FOREIGN KEY (`user_id`)
    REFERENCES `users` (`id`)
    ON DELETE CASCADE
    ON UPDATE NO ACTION,
  CONSTRAINT `fk_user_favorites_task_id`
    FOREIGN KEY (`task_id`)
    REFERENCES `tasks` (`id`)
    ON DELETE CASCADE
    ON UPDATE NO ACTION
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci; 