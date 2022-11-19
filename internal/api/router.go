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
	router.Group("/api/v1")
	router.PUT("/"+subtitles, handler.UpdateSubtitles)
	router.GET("/"+subtitles, handler.GetSubtitles)
	router.POST("/"+subtitles, handler.AddSubtitles)

	router.Use(CORSMiddleware())
	router.Use(UserRoleHandler())

	return router
}
