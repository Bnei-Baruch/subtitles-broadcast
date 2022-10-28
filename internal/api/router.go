package api

import "ginhub.com/gin-gonic/gin"

const (
	subtitles = "subtitles"
)

func newRouter() *gin.Engine {
	router := gin.Default().Group("/api/v1")
	router.PUT("/"+subtitles, updateSubtitles)
	router.GET("/"+subtitles, getSubtitles)
	router.POST("/"+subtitles, addSubtitles)

	return router
}
