-- Add missing columns to tasks table to match the GORM model

-- Add location_type column if it doesn't exist
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS location_type VARCHAR(32) COMMENT '任务地点类型' AFTER location;

-- Add location_details column if it doesn't exist
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS location_details VARCHAR(255) AFTER location_type;

-- Add start_date, end_date columns if they don't exist
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS start_date DATETIME AFTER location_details;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS end_date DATETIME AFTER start_date;

-- Add payment_type column if it doesn't exist
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS payment_type VARCHAR(32) AFTER end_date;

-- Add budget_amount column if it doesn't exist (renaming from budget)
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS budget_amount DECIMAL(10,2) AFTER payment_type;

-- Add currency column if it doesn't exist
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS currency VARCHAR(10) DEFAULT 'CNY' AFTER budget_amount;

-- Add headcount column if it doesn't exist
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS headcount INT DEFAULT 1 AFTER currency;

-- Add is_public, is_urgent columns if they don't exist
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT TRUE AFTER status;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS is_urgent BOOLEAN DEFAULT FALSE AFTER is_public;

-- Add published_at column if it doesn't exist
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS published_at DATETIME AFTER is_urgent;

-- Add deleted_at column if it doesn't exist (for GORM soft delete)
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS deleted_at DATETIME NULL; 