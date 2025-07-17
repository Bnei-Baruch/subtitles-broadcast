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

	v1.POST("/slide", handler.AddSlides)
	v1.GET("/slide", handler.GetSlides)
	v1.PATCH("/slide", handler.UpdateSlides)
	v1.DELETE("/slide", handler.DeleteSlides)
	// We support only delete (hide) from sources page, not from archive page.
	// v1.DELETE("/file-slide/:file_uid", handler.DeleteFileSlides)
	v1.DELETE("/source-slide/:source_uid", handler.DeleteSourceSlides)
	v1.POST("/custom_slide", handler.AddCustomSlides)

	// v1.GET("/file_slide", handler.GetSlides)
	v1.GET("/author", handler.GetAuthors)
	v1.GET("/auto_complete", handler.GetSourceValuesByQuery)
	v1.GET("/source_language", handler.GetLanguageListSourceSupports)

	v1.GET("/source_path", handler.GetSourcePath)
	v1.PATCH("/source_path_id/:id", handler.UpdateSourcePath)

	v1.GET("/user/settings", handler.GetUserSettings)
	v1.POST("/user/settings", handler.UpdateUserSettings)

	v1.GET("/ready", handler.Ready)

	router.NoMethod(func(c *gin.Context) {
		c.JSON(http.StatusMethodNotAllowed, gin.H{
			"message": "Method Not Allowed",
		})
	})

	return router
}
