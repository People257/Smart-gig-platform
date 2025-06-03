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
