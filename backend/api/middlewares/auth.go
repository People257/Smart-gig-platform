package middlewares

import (
	"fmt"
	"net/http"
	"strings"
	"time"

	"zhlg/backend/db"
	"zhlg/backend/models"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v4"
)

// JWT signing key - should be moved to config in production
const SigningKey = "your-secret-key"

// Custom claims for JWT
type Claims struct {
	UserID   uint   `json:"user_id"`
	UUID     string `json:"uuid"`
	UserType string `json:"user_type"`
	jwt.RegisteredClaims
}

// Generate JWT token for a user
func GenerateToken(user *models.User) (string, error) {
	// Set token expiration time (24 hours)
	expirationTime := time.Now().Add(24 * time.Hour)

	// Create claims
	claims := &Claims{
		UserID:   user.ID,
		UUID:     user.UUID,
		UserType: string(user.UserType),
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(expirationTime),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			NotBefore: jwt.NewNumericDate(time.Now()),
			Subject:   fmt.Sprintf("%d", user.ID),
		},
	}

	// Create token
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)

	// Sign token
	tokenString, err := token.SignedString([]byte(SigningKey))
	if err != nil {
		return "", err
	}

	return tokenString, nil
}

// Validate JWT token
func validateToken(tokenString string) (*Claims, error) {
	// Check if token is in invalidated tokens list
	var invalidatedToken models.InvalidatedToken
	if result := db.DB.Where("token = ?", tokenString).First(&invalidatedToken); result.Error == nil {
		return nil, fmt.Errorf("token has been invalidated")
	}

	// Parse token
	token, err := jwt.ParseWithClaims(tokenString, &Claims{}, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return []byte(SigningKey), nil
	})

	if err != nil {
		return nil, err
	}

	if claims, ok := token.Claims.(*Claims); ok && token.Valid {
		return claims, nil
	}

	return nil, fmt.Errorf("invalid token")
}

// AuthRequired is a middleware that checks if user is authenticated
func AuthRequired() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Handle preflight OPTIONS request
		if c.Request.Method == "OPTIONS" {
			c.Next()
			return
		}

		// Get token from header or cookie
		authHeader := c.GetHeader("Authorization")
		var tokenString string
		if authHeader != "" {
			parts := strings.Split(authHeader, " ")
			if len(parts) == 2 && parts[0] == "Bearer" {
				tokenString = parts[1]
			}
		}
		if tokenString == "" {
			// 尝试从 cookie 取
			cookieToken, err := c.Cookie("auth_token")
			if err == nil && cookieToken != "" {
				tokenString = cookieToken
			}
		}
		if tokenString == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Authorization header or auth_token cookie is required"})
			c.Abort()
			return
		}

		// Validate token
		claims, err := validateToken(tokenString)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid or expired token", "details": err.Error()})
			c.Abort()
			return
		}

		// Find user by ID
		var user models.User
		if result := db.DB.First(&user, claims.UserID); result.Error != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "User not found"})
			c.Abort()
			return
		}

		// Check for soft-deleted users
		if !user.DeletedAt.Time.IsZero() {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "User account has been deactivated"})
			c.Abort()
			return
		}

		// Set user in context
		c.Set("user", &user)
		c.Set("userID", claims.UserID)
		c.Set("user_uuid", claims.UUID)
		c.Set("user_type", claims.UserType)

		c.Next()
	}
}

// AdminRequired is a middleware that checks if user is an admin
func AdminRequired() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Get user from context
		user, exists := c.Get("user")
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "User not found in context"})
			c.Abort()
			return
		}

		// Check user type
		if user.(*models.User).UserType != models.UserTypeAdmin {
			c.JSON(http.StatusForbidden, gin.H{"error": "Admin permission required"})
			c.Abort()
			return
		}

		c.Next()
	}
}

// EmployerRequired is a middleware that checks if user is an employer
func EmployerRequired() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Get user from context
		user, exists := c.Get("user")
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "User not found in context"})
			c.Abort()
			return
		}

		// Check user type
		if user.(*models.User).UserType != models.UserTypeEmployer && user.(*models.User).UserType != models.UserTypeAdmin {
			c.JSON(http.StatusForbidden, gin.H{"error": "Employer permission required"})
			c.Abort()
			return
		}

		c.Next()
	}
}

// WorkerRequired is a middleware that checks if user is a worker
func WorkerRequired() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Get user from context
		user, exists := c.Get("user")
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "User not found in context"})
			c.Abort()
			return
		}

		// Check user type
		if user.(*models.User).UserType != models.UserTypeWorker && user.(*models.User).UserType != models.UserTypeAdmin {
			c.JSON(http.StatusForbidden, gin.H{"error": "Worker permission required"})
			c.Abort()
			return
		}

		c.Next()
	}
}
