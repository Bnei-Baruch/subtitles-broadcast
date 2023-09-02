package api

import (
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/redis/go-redis/v9"
	"gorm.io/gorm"
)

const (
	responseSuccess     = "success"
	responseData        = "data"
	responseError       = "error"
	responseDescription = "description"

	// keyExpirationTime                 = 300000
	// userSelectedContentkeyFormat      = "user_selected_content:userID:%s:contentID"
	// userLastActivatedContentkeyFormat = "user_last_activated_content:userID:%s:contentID:%s"
)

type Handler struct {
	Database *gorm.DB
	Cache    *redis.Client
}

// func NewHandler(database *gorm.DB, cache *redis.Client) *Handler {
// 	return &Handler{
// 		Database: database,
// 		Cache:    cache,
// 	}
// }

func NewHandler(database *gorm.DB) *Handler {
	return &Handler{
		Database: database,
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
			getResponse(false, nil, "No subtitle has found", "Getting data has failed"))
		return
	}
	ctx.JSON(http.StatusOK,
		getResponse(true,
			subtitles,
			"", "Getting data has succeeded"))
}

func (h *Handler) GetBookmarkPath(ctx *gin.Context) {
	subtitleId := ctx.Param("subtitle_id")
	language := ctx.Param("language")
	subtitleIdInt, err := strconv.Atoi(subtitleId)
	if err != nil {
		ctx.JSON(http.StatusBadRequest,
			getResponse(false, nil, err.Error(), "Getting data has failed"))
		return
	}
	subtitle := Subtitle{}

	err = h.Database.WithContext(ctx).Where("id = ?", subtitleIdInt).First(&subtitle).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			ctx.JSON(http.StatusOK,
				getResponse(false, nil, err.Error(), "No subtitle data"))
		} else {
			ctx.JSON(http.StatusInternalServerError,
				getResponse(false, nil, err.Error(), "Getting data has failed"))
		}
		return
	}

	resp, err := http.Get(fmt.Sprintf(KabbalahmediaSourcesUrl, language))
	if err != nil {
		ctx.JSON(http.StatusInternalServerError,
			getResponse(false, nil, err.Error(), "Getting data has failed"))
		return
	}
	var sources ArchiveSources

	err = json.NewDecoder(resp.Body).Decode(&sources)
	if err != nil {
		ctx.JSON(http.StatusInternalServerError,
			getResponse(false, nil, err.Error(), "Getting data has failed"))
		return
	}
	resp.Body.Close()

	bookmarkPath := ""
	for _, source := range sources.Sources {
		for _, child1 := range source.Children {
			for _, child2 := range child1.Children {
				if child2.ID == subtitle.SourceUid {
					bookmarkPath = source.FullName + "(" + source.Name + ") / " + child2.Type + " / " + child2.Name
					break
				}
			}
		}
	}

	if len(bookmarkPath) == 0 {
		ctx.JSON(http.StatusNotFound,
			getResponse(false, nil, err.Error(), "No bookmark path"))
		return
	}

	ctx.JSON(http.StatusOK,
		getResponse(true,
			bookmarkPath,
			"", "Getting data has succeeded"))
}

// func (h *Handler) roleChecker(role string) bool { // For checking user role verification for some apis
// 	return (userRole == role)
// }
