package api

import (
	"fmt"
	"net/http"

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
			err := fmt.Errorf("there is no authorization token")
			log.Error(err)
			ctx.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
				"success":     true,
				"code":        "",
				"err":         err.Error(),
				"description": "",
			})
			return
		}
		tokenString := authHeader[len("Bearer"):]
		roles, err := auth.GetUserRole(tokenString)
		if err != nil {
			log.Error(err)
			ctx.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
				"success":     true,
				"code":        "",
				"err":         err.Error(),
				"description": "",
			})
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
			ctx.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
				"success":     true,
				"code":        "",
				"err":         "The user is not authorized",
				"description": "",
			})
			return
		}
		ctx.Next()
	}
}

func UserInfoHandler() gin.HandlerFunc {
	return func(ctx *gin.Context) {
		authHeader := ctx.GetHeader("Authorization")
		if len(authHeader) == 0 {
			err := fmt.Errorf("there is no authorization token")
			log.Error(err)
			ctx.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
				"success":     true,
				"code":        "",
				"err":         err.Error(),
				"description": "",
			})
			return
		}
		tokenString := authHeader[len("Bearer"):]
		userInfo, err := auth.GetUserInfo(tokenString)
		if err != nil {
			log.Error(err)
			ctx.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
				"success":     true,
				"code":        "",
				"err":         err.Error(),
				"description": "",
			})
			return
		}
		ctx.Set("sub", userInfo.Sub)
		ctx.Next()
	}
}

func HttpMethodChecker(router *gin.Engine) gin.HandlerFunc {
	return func(ctx *gin.Context) {
		method := ctx.Request.Method
		route := ctx.Request.URL.Path
		routes := router.Routes()

		for _, r := range routes {
			if r.Path == route {
				if r.Method != method {
					log.Info("Method Not Allowed")
					ctx.AbortWithStatusJSON(http.StatusMethodNotAllowed, gin.H{
						"success":     true,
						"code":        "",
						"err":         "Method Not Allowed",
						"description": "",
					})
					return
				}
				break
			}
		}

		ctx.Next()
	}
}
