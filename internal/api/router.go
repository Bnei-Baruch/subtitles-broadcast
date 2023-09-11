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

	v1.POST("/bookmark/:subtitle_id", handler.AddBookmark)
	v1.GET("/bookmark/:subtitle_id", handler.GetBookmarkPath)
	v1.POST("/subtitle", handler.AddSubtitles)
	v1.GET("/subtitle", handler.GetSubtitles)
	v1.PATCH("/subtitle", handler.UpdateSubtitle)

	v1.GET("/source_name", handler.GetSourceName)
	v1.GET("/source_path", handler.GetSourcePath)

	return router
}
