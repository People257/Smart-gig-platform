package db

import (
	"fmt"
	"log"
	"os"
	"time"

	"zhlg/backend/models"

	"gopkg.in/yaml.v2"
	"gorm.io/driver/mysql"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

// DB 全局数据库连接实例
var DB *gorm.DB

// DBConfig 数据库配置结构
type DBConfig struct {
	Database struct {
		Dialect      string `yaml:"dialect"`
		Host         string `yaml:"host"`
		Port         string `yaml:"port"`
		Username     string `yaml:"username"`
		Password     string `yaml:"password"`
		DBName       string `yaml:"dbname"`
		Charset      string `yaml:"charset"`
		ParseTime    bool   `yaml:"parse_time"`
		Loc          string `yaml:"loc"`
		MaxIdleConns int    `yaml:"max_idle_conns"`
		MaxOpenConns int    `yaml:"max_open_conns"`
		LogMode      bool   `yaml:"log_mode"`
	} `yaml:"database"`
}

// 初始化数据库连接
func Init() {
	// 从配置文件加载数据库配置
	config, err := loadConfig()
	if err != nil {
		log.Fatalf("Failed to load database config: %v", err)
	}

	// 构建数据库连接字符串
	dsn := fmt.Sprintf(
		"%s:%s@tcp(%s:%s)/%s?charset=%s&parseTime=%t&loc=%s",
		config.Database.Username,
		config.Database.Password,
		config.Database.Host,
		config.Database.Port,
		config.Database.DBName,
		config.Database.Charset,
		config.Database.ParseTime,
		config.Database.Loc,
	)

	// 配置GORM日志记录器
	logLevel := logger.Silent
	if config.Database.LogMode {
		logLevel = logger.Info
	}

	newLogger := logger.New(
		log.New(os.Stdout, "\r\n", log.LstdFlags),
		logger.Config{
			SlowThreshold:             time.Second,
			LogLevel:                  logLevel,
			IgnoreRecordNotFoundError: true,
			Colorful:                  true,
		},
	)

	// 打开数据库连接
	DB, err = gorm.Open(mysql.Open(dsn), &gorm.Config{
		Logger: newLogger,
	})

	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}

	// 设置连接池参数
	sqlDB, err := DB.DB()
	if err != nil {
		log.Fatalf("Failed to get DB instance: %v", err)
	}

	sqlDB.SetMaxIdleConns(config.Database.MaxIdleConns)
	sqlDB.SetMaxOpenConns(config.Database.MaxOpenConns)
	sqlDB.SetConnMaxLifetime(time.Hour)

	log.Println("Database connection established")

	// 自动创建数据表
	migrateDB()
}

// 加载数据库配置
func loadConfig() (*DBConfig, error) {
	configFile := "config/database.yml"

	// 尝试从环境变量获取配置文件路径
	if envConfig := os.Getenv("DB_CONFIG_PATH"); envConfig != "" {
		configFile = envConfig
	}

	// 读取配置文件
	data, err := os.ReadFile(configFile)
	if err != nil {
		return nil, fmt.Errorf("error reading config file: %v", err)
	}

	// 解析YAML
	var config DBConfig
	err = yaml.Unmarshal(data, &config)
	if err != nil {
		return nil, fmt.Errorf("error parsing config: %v", err)
	}

	return &config, nil
}

// 自动迁移表结构
func migrateDB() {
	log.Println("Running database migrations")
	DB.AutoMigrate(
		&models.User{},
		&models.VerificationCode{},
		&models.InvalidatedToken{},
		&models.Task{},
		&models.TaskApplication{},
		&models.TaskAssignment{},
		&models.Transaction{},
		&models.WithdrawalAccount{},
		&models.Skill{},
		&models.Review{},
		&models.UserPortfolio{},
		&models.ActivityLog{},
		&models.UserFavorite{},
	)

	// 执行自定义迁移
	if err := MigrateReviews(); err != nil {
		log.Printf("警告: Reviews表迁移失败: %v", err)
	}

	// 初始化模型间的关系
	models.InitModels(DB)
}

// getEnv 从环境变量读取配置，如果不存在则使用默认值
func getEnv(key, defaultValue string) string {
	value := os.Getenv(key)
	if value == "" {
		return defaultValue
	}
	return value
}

// MigrateReviews 执行reviews表的迁移
func MigrateReviews() error {
	log.Println("开始执行reviews表结构更新")

	// 检查reviews表是否存在
	var tables []string
	if err := DB.Raw("SHOW TABLES LIKE 'reviews'").Pluck("Tables_in_zhlg", &tables).Error; err != nil {
		return err
	}

	if len(tables) > 0 {
		// 检查uuid列是否存在
		var columns []struct {
			Field string
		}
		if err := DB.Raw("SHOW COLUMNS FROM reviews LIKE 'uuid'").Scan(&columns).Error; err != nil {
			return err
		}

		// 如果uuid列不存在，添加uuid列
		if len(columns) == 0 {
			log.Println("添加uuid列到reviews表")
			if err := DB.Exec("ALTER TABLE reviews ADD COLUMN uuid VARCHAR(36) NOT NULL DEFAULT '' AFTER id").Error; err != nil {
				return err
			}

			// 为现有记录生成UUID
			if err := DB.Exec("UPDATE reviews SET uuid = UUID() WHERE uuid = ''").Error; err != nil {
				return err
			}

			// 添加唯一索引
			if err := DB.Exec("ALTER TABLE reviews ADD UNIQUE INDEX idx_reviews_uuid (uuid)").Error; err != nil {
				return err
			}
		}

		// 检查task_id列是否存在
		columns = nil
		if err := DB.Raw("SHOW COLUMNS FROM reviews LIKE 'task_id'").Scan(&columns).Error; err != nil {
			return err
		}

		// 如果task_id列不存在，添加task_id列
		if len(columns) == 0 {
			log.Println("添加task_id列到reviews表")
			if err := DB.Exec("ALTER TABLE reviews ADD COLUMN task_id INT UNSIGNED NOT NULL AFTER uuid").Error; err != nil {
				return err
			}
		}

		// 检查task_assignment_id列是否存在
		columns = nil
		if err := DB.Raw("SHOW COLUMNS FROM reviews LIKE 'task_assignment_id'").Scan(&columns).Error; err != nil {
			return err
		}

		// 如果task_assignment_id列不存在，添加task_assignment_id列
		if len(columns) == 0 {
			log.Println("添加task_assignment_id列到reviews表")
			if err := DB.Exec("ALTER TABLE reviews ADD COLUMN task_assignment_id INT UNSIGNED NOT NULL AFTER task_id").Error; err != nil {
				return err
			}
		}

		// 检查review_type列是否存在
		columns = nil
		if err := DB.Raw("SHOW COLUMNS FROM reviews LIKE 'review_type'").Scan(&columns).Error; err != nil {
			return err
		}

		// 如果review_type列不存在，添加review_type列
		if len(columns) == 0 {
			log.Println("添加review_type列到reviews表")
			if err := DB.Exec("ALTER TABLE reviews ADD COLUMN review_type VARCHAR(20) NOT NULL DEFAULT 'worker_to_employer' AFTER comment").Error; err != nil {
				return err
			}
		}

		// 检查updated_at列是否存在
		columns = nil
		if err := DB.Raw("SHOW COLUMNS FROM reviews LIKE 'updated_at'").Scan(&columns).Error; err != nil {
			return err
		}

		// 如果updated_at列不存在，添加updated_at列
		if len(columns) == 0 {
			log.Println("添加updated_at列到reviews表")
			if err := DB.Exec("ALTER TABLE reviews ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP").Error; err != nil {
				return err
			}
		}
	}

	log.Println("reviews表结构更新完成")
	return nil
}
