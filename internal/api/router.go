package api

import "ginhub.com/gin-gonic/gin"

const (
	subtitles = "subtitles"
)

func NewRouter(handler *Handler) *gin.Engine {
	router := gin.Default().Group("/api/v1")
	router.PUT("/"+subtitles, handler.UpdateSubtitles)
	router.GET("/"+subtitles, handler.GetSubtitles)
	router.POST("/"+subtitles, handler.AddSubtitles)

	return router
}
