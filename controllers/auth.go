package controllers

import (
	"net/http"
	"your_project/config"
	"your_project/middleware"
	"your_project/models"

	"github.com/gin-gonic/gin"
)

func Login(c *gin.Context) {
	var req struct {
		Username string `json:"username"`
		Password string `json:"password"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "参数错误"})
		return
	}
	var user models.User
	if err := config.DB.Where("username = ?", req.Username).First(&user).Error; err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"success": false, "error": "用户不存在"})
		return
	}
	// 明文密码对比，便于测试
	if user.PasswordHash != req.Password {
		c.JSON(http.StatusUnauthorized, gin.H{"success": false, "error": "密码错误"})
		return
	}
	token, _ := middleware.GenerateToken(user.ID)
	user.PasswordHash = ""
	c.JSON(http.StatusOK, gin.H{"success": true, "data": gin.H{"user": user, "token": token}})
}
