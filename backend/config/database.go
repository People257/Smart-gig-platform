package config

import (
	"fmt"
	"os"

	_ "github.com/go-sql-driver/mysql"
	"github.com/jinzhu/gorm"
)

// InitDB initializes the database connection
func InitDB() (*gorm.DB, error) {
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

	// MySQL connection string: username:password@tcp(host:port)/dbname?charset=utf8&parseTime=True&loc=Local
	dbURI := fmt.Sprintf("%s:%s@tcp(%s:%s)/%s?charset=utf8&parseTime=True&loc=Local",
		dbUser, dbPassword, dbHost, dbPort, dbName)

	// Open database connection
	db, err := gorm.Open("mysql", dbURI)
	if err != nil {
		return nil, err
	}

	// Set connection pool settings
	db.DB().SetMaxIdleConns(10)
	db.DB().SetMaxOpenConns(100)

	// Enable Gorm log mode in non-production environments
	if os.Getenv("GIN_MODE") != "release" {
		db.LogMode(true)
	}

	return db, nil
}
