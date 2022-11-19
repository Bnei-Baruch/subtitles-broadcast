package api

import (
	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"

	"gitlab.com/gitlab.bbdev.team/vh/broadcast-subtitles/pkg/auth"
)

const (
	SUPER_ADMIN = "super admin"
	USER        = "user"
	TRANSLATOR  = "translator"
)

var userRoles = map[string]struct{}{
	SUPER_ADMIN: struct{}{},
	USER:        struct{}{},
	TRANSLATOR:  struct{}{},
}

var userRole string

func CORSMiddleware() gin.HandlerFunc {
	return cors.New(cors.Config{
		AllowOrigins: []string{"*"},
		AllowMethods: []string{"POST", "PUT", "GET", "DELETE", "OPTIONS"},
		AllowHeaders: []string{
			"Content-Type", "Content-Length", "Accept-Encoding", "X-CSRF-Token",
			"Authorization", "accept", "origin", "Cache-Control", "X-Requested-With",
		},
		AllowCredentials: true,
	})
}

func UserRoleHandler() gin.HandlerFunc {
	return func(ctx *gin.Context) {
		authHeader := ctx.GetHeader("Authorization")
		tokenString := authHeader[len("Bearer"):]
		roles, err := auth.GetUserRole(tokenString)
		if err != nil {

		}
		isValidUser := false
		for _, role := range roles {
			if _, ok := userRoles[role.Name]; ok {
				isValidUser = true
				userRole = role.Name
				break
			}
		}
		if !isValidUser {

		}
		ctx.Next()
	}
}
