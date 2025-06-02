-- 用户测试数据
INSERT INTO users (uuid, username, password_hash, phone_number, email, name, user_type, avatar_url, bio, location, hourly_rate, is_identity_verified, id_card, created_at, updated_at)
VALUES
  ('11111111-1111-1111-1111-111111111111', 'employer1', '$2a$10$wH8Q1QwQwQwQwQwQwQwQwOQwQwQwQwQwQwQwQwQwQwQwQwQwQwQw', '13800000001', 'employer1@example.com', '雇主一', 'employer', NULL, '我是雇主一', '北京', 100.00, 1, '110101199001010011', NOW(), NOW()),
  ('22222222-2222-2222-2222-222222222222', 'worker1', '$2a$10$wH8Q1QwQwQwQwQwQwQwQwOQwQwQwQwQwQwQwQwQwQwQwQwQwQwQw', '13900000002', 'worker1@example.com', '零工一', 'worker', NULL, '我是零工一', '上海', 50.00, 1, '310101199201010022', NOW(), NOW()),
  ('33333333-3333-3333-3333-333333333333', 'admin1', '$2a$10$wH8Q1QwQwQwQwQwQwQwQwOQwQwQwQwQwQwQwQwQwQwQwQwQwQwQw', '13700000003', 'admin1@example.com', '管理员一', 'admin', NULL, '我是管理员', '广州', 0.00, 1, '440101199301010033', NOW(), NOW());
-- 密码均为 password123 