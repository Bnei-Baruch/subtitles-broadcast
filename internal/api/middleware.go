package api

import (
	"context"
	"net/http"
	"strings"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"

	"gitlab.com/gitlab.bbdev.team/vh/broadcast-subtitles/pkg/auth"
)

const (
	//SUPER_ADMIN = "super admin"
	SuperAdmin = "mb_admin_users_finstats"
	User       = "user"
	Translator = "translator"

	BearerPrefix = "Bearer"
)

var userRoles = map[string]struct{}{
	SuperAdmin: {},
	User:       {},
	Translator: {},
}

// var userRole string

func CORSMiddleware() gin.HandlerFunc {
	return cors.New(cors.Config{
		// Now for testing, no cors filter but in the future, will add preventing ones.
		AllowOrigins:     []string{"*"},
		AllowMethods:     []string{"*"},
		AllowHeaders:     []string{"*"},
		AllowCredentials: true,
	})
}

func UserRoleHandler() gin.HandlerFunc {
	return func(ctx *gin.Context) {
		authHeader := ctx.GetHeader("Authorization")
		if len(authHeader) == 0 {
			handleResponse(ctx, http.StatusUnauthorized, "there is no authorization token")
			return
		}
		if !strings.HasPrefix(authHeader, BearerPrefix+" ") {
			handleResponse(ctx, http.StatusUnauthorized, "Invalid authorization format")
			return
		}
		tokenString := authHeader[len(BearerPrefix)+1:]
		claims, err := auth.GetClaims(context.TODO(), tokenString)
		if err != nil {
			handleResponse(ctx, http.StatusUnauthorized, err.Error())
			return
		}

		// TODO: manage user role

		ctx.Set("user_id", claims.Sub)
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
					handleResponse(ctx, http.StatusMethodNotAllowed, "Method Not Allowed")
					return
				}
				break
			}
		}

		ctx.Next()
	}
}

func handleResponse(ctx *gin.Context, statusCode int, errMsg string) {
	ctx.AbortWithStatusJSON(statusCode, gin.H{
		"success":     true,
		"data":        "",
		"err":         errMsg,
		"description": "",
	})
}
