-- Add invalidated_tokens table required for logout functionality
CREATE TABLE IF NOT EXISTS invalidated_tokens (
    id BIGINT NOT NULL AUTO_INCREMENT,
    token TEXT NOT NULL,
    expires_at DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    INDEX (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci; 