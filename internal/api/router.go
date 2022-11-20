package api

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

const (
	subtitles = "subtitles"
)

func NewRouter(handler *Handler) http.Handler {
	router := gin.Default()

	v1 := router.Group("/api/v1")
	v1.PUT("/"+subtitles, handler.UpdateSubtitles)
	v1.GET("/"+subtitles, handler.GetSubtitles)
	v1.POST("/"+subtitles, handler.AddSubtitles)

	router.Use(CORSMiddleware())
	router.Use(UserRoleHandler())

	return router
}
