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

	v1.POST("/bookmark/:slide_id", handler.AddUserBookmark)
	v1.GET("/bookmark", handler.GetUserBookmarks)
	v1.DELETE("/bookmark/:slide_id", handler.DeleteUserBookmark)

	v1.POST("/slide", handler.ImportSource)
	v1.GET("/slide", handler.GetSlides)
	v1.PATCH("/slide", handler.UpdateSlide)
	v1.DELETE("/slide/:slide_id", handler.DeleteSlide)
	v1.GET("/file_slide/:file_uid", handler.GetSlidesByFile)

	v1.GET("/author", handler.GetAuthors)

	// Unnecessary handler at this moment. If need, will be used
	// v1.GET("/source_name", handler.GetSourceName)
	// v1.GET("/source_path", handler.GetSourcePath)

	router.NoMethod(func(c *gin.Context) {
		c.JSON(http.StatusMethodNotAllowed, gin.H{
			"message": "Method Not Allowed",
		})
	})

	return router
}
