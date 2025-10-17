package api

import (
	"context"
	"net/http"
	"os"
	"regexp"
	"strings"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"

	"gitlab.com/gitlab.bbdev.team/vh/broadcast-subtitles/internal/config"
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
		// Paths to skip authentication
		noAuthPaths := map[string]bool{
			"/api/v1/ready": true,
		}

		if noAuthPaths[ctx.FullPath()] {
			ctx.Next()
			return
		}

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

		// Extract roles from both client and realm access (backward compatible)
		clientId := os.Getenv(config.EnvBssvrKeycloakClientId)
		userRoles := extractSubtitlesRoles(claims, clientId)

		ctx.Set("user_id", claims.Email)
		ctx.Set("user_roles", userRoles)
		ctx.Set("claims", claims)
		ctx.Next()
	}
}

// extractSubtitlesRoles extracts subtitles-related roles from JWT claims
// Checks both client roles (resource_access) and realm roles for backward compatibility
func extractSubtitlesRoles(claims *auth.IDTokenClaims, clientId string) []string {
	roles := []string{}
	roleMap := make(map[string]bool)

	subtitlesRoleRegex := regexp.MustCompile(`subtitles_(?P<role>.*)|(?P<admin_role>admin)`)

	// Check client roles first (preferred)
	if clientId != "" {
		clientRoles := claims.GetClientRoles(clientId)
		for _, role := range clientRoles {
			matches := subtitlesRoleRegex.FindStringSubmatch(role)
			if matches != nil {
				// Extract the role name from the regex groups
				extractedRole := matches[1] // subtitles_<role> group
				if extractedRole == "" {
					extractedRole = matches[2] // admin group
				}
				if extractedRole != "" && !roleMap[extractedRole] {
					roles = append(roles, extractedRole)
					roleMap[extractedRole] = true
				}
			}
		}
	}

	// Fallback to realm roles for backward compatibility
	realmRoles := claims.GetRealmRoles()
	for _, role := range realmRoles {
		matches := subtitlesRoleRegex.FindStringSubmatch(role)
		if matches != nil {
			// Extract the role name from the regex groups
			extractedRole := matches[1] // subtitles_<role> group
			if extractedRole == "" {
				extractedRole = matches[2] // admin group
			}
			if extractedRole != "" && !roleMap[extractedRole] {
				roles = append(roles, extractedRole)
				roleMap[extractedRole] = true
			}
		}
	}

	return roles
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
