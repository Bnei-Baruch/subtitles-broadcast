package api

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/redis/go-redis/v9"
	"gorm.io/gorm"
)

const (
	responseSuccess     = "success"
	responseData        = "data"
	responseError       = "error"
	responseDescription = "description"

	keyExpirationTime                 = 300000
	userSelectedContentkeyFormat      = "user_selected_content:userID:%s:contentID"
	userLastActivatedContentkeyFormat = "user_last_activated_content:userID:%s:contentID:%s"
)

type Handler struct {
	Database *gorm.DB
	Cache    *redis.Client
}

func NewHandler(database *gorm.DB, cache *redis.Client) *Handler {
	return &Handler{
		Database: database,
		Cache:    cache,
	}
}

func getResponse(success bool, data interface{}, err, description string) gin.H {
	return gin.H{
		responseSuccess:     success,
		responseData:        data,
		responseError:       err,
		responseDescription: description,
	}
}

func (h *Handler) GetSubtitles(ctx *gin.Context) {
	subtitles := []*Subtitle{}
	err := h.Database.WithContext(ctx).Order("order_number").Debug().Find(&subtitles).Error
	if err != nil {
		ctx.JSON(http.StatusInternalServerError,
			getResponse(false, nil, err.Error(), "Getting data has failed"))
		return
	}
	if len(subtitles) == 0 {
		ctx.JSON(http.StatusNotFound,
			getResponse(false, nil, "No author has found", "Getting data has failed"))
		return
	}
	ctx.JSON(http.StatusOK,
		getResponse(true,
			subtitles,
			"", "Getting data has succeeded"))
}

// func (h *Handler) roleChecker(role string) bool { // For checking user role verification for some apis
// 	return (userRole == role)
// }
