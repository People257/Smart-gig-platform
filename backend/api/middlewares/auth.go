package middlewares

import (
	"net/http"
	"strings"
	"time"

	"zhlg/backend/models"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
)

// JWTClaims represents the JWT claims structure
type JWTClaims struct {
	UserID   uint            `json:"user_id"`
	UUID     string          `json:"uuid"`
	UserType models.UserType `json:"user_type"`
	jwt.RegisteredClaims
}

// AuthRequired is a middleware that checks if the user is authenticated
func AuthRequired() gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "未授权"})
			c.Abort()
			return
		}

		// Extract the token from the header (Bearer <token>)
		parts := strings.Split(authHeader, " ")
		if len(parts) != 2 || parts[0] != "Bearer" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "无效的授权头"})
			c.Abort()
			return
		}
		tokenString := parts[1]

		// Parse and validate the token
		// Note: In a real application, the secret should be loaded from environment variables
		token, err := jwt.ParseWithClaims(tokenString, &JWTClaims{}, func(token *jwt.Token) (interface{}, error) {
			return []byte("your-secret-key"), nil
		})

		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "无效的令牌"})
			c.Abort()
			return
		}

		if claims, ok := token.Claims.(*JWTClaims); ok && token.Valid {
			// Set user claims in context
			c.Set("userID", claims.UserID)
			c.Set("uuid", claims.UUID)
			c.Set("userType", claims.UserType)
			c.Next()
		} else {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "无效的令牌"})
			c.Abort()
			return
		}
	}
}

// WorkerRequired checks if the authenticated user is a worker
func WorkerRequired() gin.HandlerFunc {
	return func(c *gin.Context) {
		userType, exists := c.Get("userType")
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "未授权"})
			c.Abort()
			return
		}

		if userType != models.UserTypeWorker {
			c.JSON(http.StatusForbidden, gin.H{"error": "仅零工可执行此操作"})
			c.Abort()
			return
		}

		c.Next()
	}
}

// EmployerRequired checks if the authenticated user is an employer
func EmployerRequired() gin.HandlerFunc {
	return func(c *gin.Context) {
		userType, exists := c.Get("userType")
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "未授权"})
			c.Abort()
			return
		}

		if userType != models.UserTypeEmployer {
			c.JSON(http.StatusForbidden, gin.H{"error": "仅雇主可执行此操作"})
			c.Abort()
			return
		}

		c.Next()
	}
}

// AdminRequired checks if the authenticated user is an admin
func AdminRequired() gin.HandlerFunc {
	return func(c *gin.Context) {
		userType, exists := c.Get("userType")
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "未授权"})
			c.Abort()
			return
		}

		if userType != models.UserTypeAdmin {
			c.JSON(http.StatusForbidden, gin.H{"error": "仅管理员可执行此操作"})
			c.Abort()
			return
		}

		c.Next()
	}
}

// GenerateToken generates a JWT token for the given user
func GenerateToken(user *models.User) (string, error) {
	// Set expiration time
	expirationTime := time.Now().Add(24 * time.Hour) // 24 hours token

	// Create JWT claims
	claims := &JWTClaims{
		UserID:   user.ID,
		UUID:     user.UUID,
		UserType: user.UserType,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(expirationTime),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}

	// Create the JWT token
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)

	// Sign the token with a secret key (should be loaded from env in a real app)
	tokenString, err := token.SignedString([]byte("your-secret-key"))
	if err != nil {
		return "", err
	}

	return tokenString, nil
}
