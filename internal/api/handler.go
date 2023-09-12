package api

import (
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/redis/go-redis/v9"
	log "github.com/sirupsen/logrus"
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

func (h *Handler) AddSubtitles(ctx *gin.Context) {
	req := struct {
		SourceUid string `json:"source_uid"`
		Language  string `json:"language"`
	}{}
	err := ctx.BindJSON(&req)
	if err != nil {
		log.Error(err)
		ctx.JSON(http.StatusBadRequest,
			getResponse(true, nil, err.Error(), "Binding data has failed"))
		return
	}

	contents, fileUid, err := getFileContent(req.SourceUid, req.Language)
	if err != nil {
		log.Error(err)
		ctx.JSON(http.StatusInternalServerError,
			getResponse(true, nil, err.Error(), "Binding data has failed"))
		return
	}

	tx := h.Database.Begin()
	if tx.Error != nil {
		log.Error(err)
		ctx.JSON(http.StatusInternalServerError,
			getResponse(true, nil, err.Error(), "Binding data has failed"))
		return
	}
	for idx, content := range contents {
		if len(content) > 0 {
			subtitle := Subtitle{
				SourceUid:      req.SourceUid,
				FileUid:        fileUid,
				FileSourceType: KabbalahmediaFileSourceType,
				Subtitle:       content,
				OrderNumber:    idx,
				Language:       req.Language,
			}
			if err := h.Database.Create(&subtitle).Error; err != nil {
				tx.Rollback()
				log.Error(err)
				ctx.JSON(http.StatusInternalServerError,
					getResponse(true, nil, err.Error(), "Binding data has failed"))
				return
			}
		}
	}
	if err := tx.Commit().Error; err != nil {
		log.Error(err)
		ctx.JSON(http.StatusInternalServerError,
			getResponse(true, nil, err.Error(), "Binding data has failed"))
		return
	}
	ctx.JSON(http.StatusOK,
		getResponse(true,
			nil,
			"", "Adding data has succeeded"))
}

func (h *Handler) UpdateSubtitle(ctx *gin.Context) {
	req := struct {
		SubtitleID int    `json:"subtitle_id"`
		Language   string `json:"language"`
		Subtitle   string `json:"subtitle"`
	}{}
	err := ctx.BindJSON(&req)
	if err != nil {
		log.Error(err)
		ctx.JSON(http.StatusBadRequest,
			getResponse(true, nil, err.Error(), "Binding data has failed"))
		return
	}
	subtitle := Subtitle{}
	err = h.Database.WithContext(ctx).Order("order_number").Debug().Where("id = ?", req.SubtitleID).Where("language = ?", req.Language).Find(&subtitle).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			ctx.JSON(http.StatusNotFound,
				getResponse(true, nil, err.Error(), "No subtitle to update"))
			return
		}
		log.Error(err)
		ctx.JSON(http.StatusInternalServerError,
			getResponse(true, nil, err.Error(), "Binding data has failed"))
		return
	}
	subtitle.Subtitle = req.Subtitle
	if err := h.Database.WithContext(ctx).Updates(&subtitle).Error; err != nil {
		log.Error(err)
		ctx.JSON(http.StatusInternalServerError,
			getResponse(true, nil, err.Error(), "Binding data has failed"))
		return
	}
	ctx.JSON(http.StatusOK,
		getResponse(true,
			nil,
			"", "Updating data has succeeded"))
}

func (h *Handler) GetSubtitles(ctx *gin.Context) {
	sourceUid := ctx.Query("source_uid")
	fileUid := ctx.Query("file_uid")
	language := ctx.Query("language")
	subtitles := []*Subtitle{}
	query := h.Database.WithContext(ctx).Order("order_number").Debug()
	if len(sourceUid) > 0 {
		query = query.Where("source_uid = ?", sourceUid)
	}
	if len(fileUid) > 0 {
		query = query.Where("file_uid = ?", fileUid)
	}
	if len(language) > 0 {
		query = query.Where("language = ?", language)
	}
	err := query.Find(&subtitles).Error
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

func (h *Handler) AddBookmark(ctx *gin.Context) {
	subtitleId := ctx.Param("subtitle_id")
	subtitleIdInt, err := strconv.Atoi(subtitleId)
	if err != nil {
		ctx.JSON(http.StatusBadRequest,
			getResponse(false, nil, err.Error(), "Getting data has failed"))
		return
	}

	bookmark := Bookmark{
		SubtitleId: subtitleIdInt,
	}
	err = h.Database.Create(&bookmark).Error
	if err != nil {
		ctx.JSON(http.StatusInternalServerError,
			getResponse(false, nil, err.Error(), "Adding data has failed"))
	}

	ctx.JSON(http.StatusCreated,
		getResponse(true,
			bookmark,
			"", "Adding data has succeeded"))
}

func (h *Handler) GetBookmarkPath(ctx *gin.Context) {
	subtitleId := ctx.Param("subtitle_id")
	subtitleIdInt, err := strconv.Atoi(subtitleId)
	if err != nil {
		ctx.JSON(http.StatusBadRequest,
			getResponse(false, nil, err.Error(), "Getting data has failed"))
		return
	}

	bookmark := Bookmark{}

	err = h.Database.WithContext(ctx).Where("subtitle_id = ?", subtitleIdInt).First(&bookmark).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			ctx.JSON(http.StatusOK,
				getResponse(false, nil, err.Error(), "No bookmark data"))
		} else {
			ctx.JSON(http.StatusInternalServerError,
				getResponse(false, nil, err.Error(), "Getting data has failed"))
		}
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

	resp, err := http.Get(fmt.Sprintf(KabbalahmediaSourcesUrl, subtitle.Language))
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

func (h *Handler) GetSourceName(ctx *gin.Context) {
	sourceUid := ctx.Query("source_uid")
	language := ctx.Query("language")
	if len(sourceUid) == 0 || len(language) == 0 {
		ctx.JSON(http.StatusBadRequest,
			getResponse(false, nil, "", "source_uid and language parameters both are needed"))
		return
	}
	resp, err := http.Get(fmt.Sprintf(KabbalahmediaSourcesUrl, language))
	if err != nil {
		log.Fatalf("Internal error: %s", err)
	}
	var sources ArchiveSources

	err = json.NewDecoder(resp.Body).Decode(&sources)
	if err != nil {
		log.Fatalf("Internal error: %s", err)
	}
	resp.Body.Close()

	sourceName := ""
	for _, source := range sources.Sources {
		for _, child1 := range source.Children {
			for _, child2 := range child1.Children {
				if child2.ID == sourceUid {
					sourceName = child2.Name
					break
				}
			}
		}
	}
	ctx.JSON(http.StatusOK,
		getResponse(true,
			sourceName,
			"", "Getting data has succeeded"))
}

func (h *Handler) GetSourcePath(ctx *gin.Context) {
	sourceUid := ctx.Query("source_uid")
	language := ctx.Query("language")
	if len(sourceUid) == 0 || len(language) == 0 {
		ctx.JSON(http.StatusBadRequest,
			getResponse(false, nil, "", "source_uid and language parameters both are needed"))
		return
	}
	resp, err := http.Get(fmt.Sprintf(KabbalahmediaSourcesUrl, language))
	if err != nil {
		log.Fatalf("Internal error: %s", err)
	}
	var sources ArchiveSources

	err = json.NewDecoder(resp.Body).Decode(&sources)
	if err != nil {
		log.Fatalf("Internal error: %s", err)
	}
	resp.Body.Close()

	sourcePath := ""
	for _, source := range sources.Sources {
		for _, child1 := range source.Children {
			for _, child2 := range child1.Children {
				if child2.ID == sourceUid {
					sourcePath = source.FullName + "(" + source.Name + ") / " + child2.Type + " / " + child2.Name
					break
				}
			}
		}
	}
	ctx.JSON(http.StatusOK,
		getResponse(true,
			sourcePath,
			"", "Getting data has succeeded"))
}

// func (h *Handler) roleChecker(role string) bool { // For checking user role verification for some apis
// 	return (userRole == role)
// }
