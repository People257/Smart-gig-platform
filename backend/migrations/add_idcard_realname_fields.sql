-- Add ID card and real name fields to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS id_card VARCHAR(18) DEFAULT NULL COMMENT '身份证号码',
ADD COLUMN IF NOT EXISTS real_name VARCHAR(50) DEFAULT NULL COMMENT '真实姓名';

-- Add index on id_card for faster lookups
ALTER TABLE users 
ADD INDEX IF NOT EXISTS idx_users_id_card (id_card); 