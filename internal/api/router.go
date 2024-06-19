package api

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

func NewRouter(handler *Handler) http.Handler {
	router := gin.Default()
	router.Use(CORSMiddleware())
	router.Use(UserRoleHandler())

	v1 := router.Group("/api/v1")

	v1.POST("/bookmark", handler.AddOrUpdateUserBookmark)
	v1.GET("/bookmark", handler.GetUserBookmarks)
	v1.DELETE("/bookmark/:bookmark_id", handler.DeleteUserBookmark)

	//v1.POST("/slide", handler.ImportSource)
	v1.POST("/slide", handler.AddSlides)
	v1.GET("/slide", handler.GetSlides)
	v1.PATCH("/slide", handler.UpdateSlides)
	v1.DELETE("/slide", handler.DeleteSlides)
	v1.DELETE("/file-slide/:file_uid", handler.DeleteFileSlides)
	v1.POST("/custom_slide", handler.AddCustomSlides)

	v1.GET("/file_slide", handler.GetSlides)
	v1.GET("/author", handler.GetAuthors)
	v1.GET("/auto_complete", handler.GetSourceValuesByQuery)
	v1.GET("/source_language", handler.GetLanguageListSourceSupports)
	// v1.GET("/slide_language", handler.GetSlideLanguages)

	// Unnecessary handler at this moment. If need, will be used
	// v1.GET("/source_name", handler.GetSourceName)
	v1.GET("/source_path", handler.GetSourcePath)

	router.NoMethod(func(c *gin.Context) {
		c.JSON(http.StatusMethodNotAllowed, gin.H{
			"message": "Method Not Allowed",
		})
	})

	return router
}
