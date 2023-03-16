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

	v1 := router.Group("/api/v1")

	v1.PUT("/"+books, handler.UpdateBooks)
	v1.GET("/"+books, handler.GetBooks)
	v1.POST("/"+books, handler.AddBooks)

	v1.PUT("/user/"+bookmarks, handler.UpdateBookmarks)
	v1.GET("/user/"+bookmarks, handler.GetBookmarks)
	v1.POST("/user/"+bookmarks, handler.AddBookmarks)

	return router
}
