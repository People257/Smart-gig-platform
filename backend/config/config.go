package config

import (
	"fmt"
	"io/ioutil"
	"os"
	"path/filepath"

	_ "github.com/go-sql-driver/mysql"
	"github.com/jinzhu/gorm"
	"gopkg.in/yaml.v2"
)

// DBConfig 表示数据库配置
type DBConfig struct {
	Dialect      string `yaml:"dialect"`
	Datasource   string `yaml:"datasource"`
	MaxIdleConns int    `yaml:"max_idle_conns"`
	MaxOpenConns int    `yaml:"max_open_conns"`
	LogMode      bool   `yaml:"log_mode"`
}

// Config 表示应用配置
type Config struct {
	Database DBConfig `yaml:"database"`
}

// LoadConfig 从YAML文件加载配置
func LoadConfig() (*Config, error) {
	// 读取配置文件
	configPath := filepath.Join("config", "database.yml")
	yamlFile, err := ioutil.ReadFile(configPath)
	if err != nil {
		return nil, fmt.Errorf("无法读取配置文件: %v", err)
	}

	// 解析YAML
	var config Config
	if err := yaml.Unmarshal(yamlFile, &config); err != nil {
		return nil, fmt.Errorf("解析配置文件失败: %v", err)
	}

	// 处理环境变量
	config.Database.Datasource = os.ExpandEnv(config.Database.Datasource)

	return &config, nil
}

// InitDB 初始化数据库连接
func InitDB() (*gorm.DB, error) {
	// 加载配置
	config, err := LoadConfig()
	if err != nil {
		return nil, err
	}

	// 打开数据库连接
	db, err := gorm.Open(config.Database.Dialect, config.Database.Datasource)
	if err != nil {
		return nil, err
	}

	// 设置连接池
	db.DB().SetMaxIdleConns(config.Database.MaxIdleConns)
	db.DB().SetMaxOpenConns(config.Database.MaxOpenConns)
	db.LogMode(config.Database.LogMode)

	return db, nil
}

// GetDSNFromEnv 根据环境变量生成DSN
func GetDSNFromEnv() string {
	dbUser := os.Getenv("DB_USER")
	if dbUser == "" {
		dbUser = "root"
	}

	dbPassword := os.Getenv("DB_PASSWORD")
	dbHost := os.Getenv("DB_HOST")
	if dbHost == "" {
		dbHost = "localhost"
	}

	dbPort := os.Getenv("DB_PORT")
	if dbPort == "" {
		dbPort = "3306"
	}

	dbName := os.Getenv("DB_NAME")
	if dbName == "" {
		dbName = "gigplatform"
	}

	// MySQL DSN: username:password@tcp(host:port)/dbname?charset=utf8&parseTime=True&loc=Local
	dsn := fmt.Sprintf("%s:%s@tcp(%s:%s)/%s?charset=utf8&parseTime=True&loc=Local",
		dbUser, dbPassword, dbHost, dbPort, dbName)

	return dsn
}
