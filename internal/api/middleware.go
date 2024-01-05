package api

import (
	"net/http"
	"strings"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	log "github.com/sirupsen/logrus"

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
		roles, err := auth.GetUserRole(tokenString)
		if err != nil {
			handleResponse(ctx, http.StatusUnauthorized, err.Error())
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
			handleResponse(ctx, http.StatusUnauthorized, "The user is not authorized")
			return
		}
		ctx.Next()
	}
}

func UserInfoHandler() gin.HandlerFunc {
	return func(ctx *gin.Context) {
		authHeader := ctx.GetHeader("Authorization")
		if len(authHeader) == 0 {
			handleResponse(ctx, http.StatusUnauthorized, "there is no authorization token")
			return
		}
		tokenString := authHeader[len("Bearer"):]
		userInfo, err := auth.GetUserInfo(tokenString)
		if err != nil {
			handleResponse(ctx, http.StatusUnauthorized, err.Error())
			return
		}
		ctx.Set("user_id", userInfo.Sub)
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
	log.Error(errMsg)
	ctx.AbortWithStatusJSON(statusCode, gin.H{
		"success":     true,
		"data":        "",
		"err":         errMsg,
		"description": "",
	})
}
