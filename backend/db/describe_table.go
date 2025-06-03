package db

import (
	"fmt"
	"log"
	"os"
)

func main() {
	// 初始化数据库连接
	Init()

	if len(os.Args) < 2 {
		fmt.Println("用法: go run describe_table.go 表名")
		return
	}

	tableName := os.Args[1]

	// 查询表结构
	var columns []struct {
		Field   string `gorm:"column:Field"`
		Type    string `gorm:"column:Type"`
		Null    string `gorm:"column:Null"`
		Key     string `gorm:"column:Key"`
		Default string `gorm:"column:Default"`
		Extra   string `gorm:"column:Extra"`
	}

	if err := DB.Raw("DESCRIBE " + tableName).Scan(&columns).Error; err != nil {
		log.Fatalf("查询表结构失败: %v", err)
	}

	fmt.Printf("表 %s 的结构：\n", tableName)
	fmt.Println("--------------------------------------")
	fmt.Printf("%-20s %-30s %-5s %-5s %-15s %-15s\n", "字段名", "类型", "可空", "键", "默认值", "额外")
	fmt.Println("--------------------------------------")

	for _, col := range columns {
		fmt.Printf("%-20s %-30s %-5s %-5s %-15s %-15s\n",
			col.Field, col.Type, col.Null, col.Key, col.Default, col.Extra)
	}
}
