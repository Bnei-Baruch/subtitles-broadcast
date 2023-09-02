package api

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

func NewRouter(handler *Handler) http.Handler {
	router := gin.Default()
	router.Use(CORSMiddleware())
	router.Use(UserRoleHandler())
	router.Use(UserInfoHandler())
	router.Use((HttpMethodChecker(router)))

	v1 := router.Group("/api/v1")

	v1.GET("/bookmark/:language/:subtitle_id", handler.GetBookmarkPath)
	v1.GET("/subtitle", handler.GetSubtitles)

	return router
}
