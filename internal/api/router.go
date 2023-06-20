package api

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

const (
	books     = "books"
	bookmarks = "bookmarks"
)

func NewRouter(handler *Handler) http.Handler {
	router := gin.Default()
	router.Use(CORSMiddleware())
	router.Use(UserRoleHandler())
	router.Use(UserInfoHandler())

	v1 := router.Group("/api/v1")

	v1.PUT("/"+books, handler.UpdateBooks)
	v1.PUT("/user/"+bookmarks, handler.UpdateBookmarks)

	v1.POST("/selected-content", handler.AddSelectedContent)
	v1.GET("/author", handler.GetAuthors)
	v1.GET("/booktitle", handler.GetBookTitles)
	v1.GET("/archive", handler.GetArchives)

	return router
}
