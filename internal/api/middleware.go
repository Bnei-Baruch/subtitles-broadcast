package api

import (
	"fmt"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	log "github.com/sirupsen/logrus"

	"gitlab.com/gitlab.bbdev.team/vh/broadcast-subtitles/pkg/auth"
)

const (
	//SUPER_ADMIN = "super admin"
	SUPER_ADMIN = "mb_admin_users_finstats"
	USER        = "user"
	TRANSLATOR  = "translator"
)

var userRoles = map[string]struct{}{
	SUPER_ADMIN: {},
	USER:        {},
	TRANSLATOR:  {},
}

// var userRole string

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
		if len(authHeader) == 0 {
			err := fmt.Errorf("There is no authorization token")
			log.Error(err)
			ctx.JSON(401, gin.H{
				"success":     true,
				"code":        "",
				"err":         err.Error(),
				"description": "",
			})
			ctx.Abort()
			return
		}
		tokenString := authHeader[len("Bearer"):]
		roles, err := auth.GetUserRole(tokenString)
		if err != nil {
			log.Error(err)
			ctx.JSON(401, gin.H{
				"success":     true,
				"code":        "",
				"err":         err.Error(),
				"description": "",
			})
			ctx.Abort()
			return
		}
		isValidUser := false
		for _, role := range roles {
			if _, ok := userRoles[role.Name]; ok {
				isValidUser = true
				// userRole = role.Name
				break
			}
		}
		if !isValidUser {
			log.Info("The user is not authorized")
			ctx.JSON(401, gin.H{
				"success":     true,
				"code":        "",
				"err":         "The user is not authorized",
				"description": "",
			})
			ctx.Abort()
			return
		}
		ctx.Next()
	}
}
