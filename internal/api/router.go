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

	v1 := router.Group("/api/v1")

	v1.POST("/selected-content", handler.AddSelectedContent)
	v1.PUT("/selected-content", handler.UpdateSelectedContent)
	v1.DELETE("/activated-content", handler.DeleteActivatedContent)
	v1.DELETE("/content", handler.DeleteContent)
	v1.GET("/book-list", handler.GetUserBookContents)
	v1.GET("/author", handler.GetAuthors)
	v1.GET("/booktitle", handler.GetBookTitles)
	v1.GET("/archive", handler.GetArchives)

	return router
}
