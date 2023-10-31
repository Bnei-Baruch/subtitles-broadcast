package api

import (
	"encoding/json"
	"errors"
	"fmt"
	"math"
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

	defaultListLimit = 50

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

	tx := h.Database.Debug().Begin()
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
			if err := tx.Debug().Create(&subtitle).Error; err != nil {
				tx.Debug().Rollback()
				log.Error(err)
				ctx.JSON(http.StatusInternalServerError,
					getResponse(true, nil, err.Error(), "Binding data has failed"))
				return
			}
		}
	}
	if err := tx.Debug().Commit().Error; err != nil {
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
	var errPage, errLimit error
	var offset, limit int
	page := 1
	listLimit := defaultListLimit

	pageStr := ctx.Query("page")
	if len(pageStr) > 0 {
		page, errPage = strconv.Atoi(pageStr)
	}
	limitStr := ctx.Query("limit")
	if len(limitStr) > 0 {
		limit, errLimit = strconv.Atoi(limitStr)
	}
	err := errors.Join(errPage, errLimit)
	if err != nil {
		ctx.JSON(http.StatusBadRequest,
			getResponse(true, nil, err.Error(), "Getting data has failed"))
		return
	}
	if limit > 0 {
		listLimit = limit
	}
	if page > 1 {
		offset = listLimit * (page - 1)
	}

	var totalRows int64

	sourceUid := ctx.Query("source_uid")
	fileUid := ctx.Query("file_uid")
	language := ctx.Query("language")
	keyword := ctx.Query("keyword")
	subtitles := []*Subtitle{}

	query := h.Database.WithContext(ctx).Model(&Subtitle{}).Order("id").Order("order_number").Debug()
	if len(sourceUid) > 0 {
		query = query.Where("source_uid = ?", sourceUid)
	}
	if len(fileUid) > 0 {
		query = query.Where("file_uid = ?", fileUid)
	}
	if len(language) > 0 {
		query = query.Where("language = ?", language)
	}
	if len(keyword) > 0 {
		query = query.Where("subtitle like ?", "%"+keyword+"%")
	}

	err = query.Count(&totalRows).Limit(listLimit).Offset(offset).Find(&subtitles).Error
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
	sourceData, _, err := getTargetSourceAndSourceGrandChild(subtitles[0].SourceUid, subtitles[0].Language)
	if err != nil {
		ctx.JSON(http.StatusBadRequest,
			getResponse(false, nil, err.Error(), "Getting data has failed"))
		return
	}
	for _, subtitle := range subtitles {
		subtitle.Author = sourceData["name"].(string)
	}

	ctx.JSON(http.StatusOK,
		getResponse(true,
			struct {
				Pagination *Pagination `json:"pagination"`
				Subtitles  []*Subtitle `json:"subtitles"`
			}{
				Pagination: &Pagination{
					Limit:      listLimit,
					Page:       page,
					TotalRows:  totalRows,
					TotalPages: int(math.Ceil(float64(totalRows) / float64(listLimit))),
				},
				Subtitles: subtitles,
			},
			"", "Getting data has succeeded"))
}

func (h *Handler) DeleteSubtitles(ctx *gin.Context) {
	subtitleId := ctx.Param("subtitle_id")
	subtitleIdInt, err := strconv.Atoi(subtitleId)
	if err != nil {
		log.Error(err)
		ctx.JSON(http.StatusBadRequest,
			getResponse(true, nil, err.Error(), "Subtitle ID must be an integer"))
		return
	}
	if err := h.Database.Where("id = ?", subtitleIdInt).Delete(&Subtitle{}).Error; err != nil {
		log.Error(err)
		ctx.JSON(http.StatusInternalServerError,
			getResponse(true, nil, err.Error(), "Binding data has failed"))
		return
	}
	ctx.JSON(http.StatusOK,
		getResponse(true,
			nil,
			"", "Deleting data has succeeded"))
}

func (h *Handler) AddBookmark(ctx *gin.Context) {
	userId, _ := ctx.Get("sub")
	subtitleId := ctx.Param("subtitle_id")
	subtitleIdInt, err := strconv.Atoi(subtitleId)
	if err != nil {
		ctx.JSON(http.StatusBadRequest,
			getResponse(false, nil, err.Error(), "Getting data has failed"))
		return
	}

	bookmark := Bookmark{
		SubtitleId: subtitleIdInt,
		UserId:     userId.(string),
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

	bookmarkPath := ""
	sourceData, sourceGrandChild, err := getTargetSourceAndSourceGrandChild(subtitle.SourceUid, subtitle.Language)
	if err != nil {
		ctx.JSON(http.StatusInternalServerError,
			getResponse(false, nil, err.Error(), "Getting data has failed"))
	}
	if sourceData != nil && sourceGrandChild != nil {
		bookmarkPath = sourceData["full_name"].(string) + "(" + sourceData["name"].(string) + ") / " + sourceGrandChild["type"].(string) + " / " + sourceGrandChild["name"].(string)
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

	sourceName := ""
	_, sourceGrandChild, err := getTargetSourceAndSourceGrandChild(sourceUid, language)
	if err != nil {
		ctx.JSON(http.StatusInternalServerError,
			getResponse(false, nil, err.Error(), "Getting data has failed"))
	}
	if sourceGrandChild != nil {
		sourceName = sourceGrandChild["name"].(string)
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

	sourcePath := ""
	sourceData, sourceGrandChild, err := getTargetSourceAndSourceGrandChild(sourceUid, language)
	if err != nil {
		ctx.JSON(http.StatusInternalServerError,
			getResponse(false, nil, err.Error(), "Getting data has failed"))
	}
	if sourceData != nil && sourceGrandChild != nil {
		sourcePath = sourceData["full_name"].(string) + "(" + sourceData["name"].(string) + ") / " + sourceGrandChild["type"].(string) + " / " + sourceGrandChild["name"].(string)
	}

	ctx.JSON(http.StatusOK,
		getResponse(true,
			sourcePath,
			"", "Getting data has succeeded"))
}

func getTargetSourceAndSourceGrandChild(sourceUid, language string) (map[string]interface{}, map[string]interface{}, error) {
	resp, err := http.Get(fmt.Sprintf(KabbalahmediaSourcesUrl, language))
	if err != nil {
		log.Fatalf("Internal error: %s", err)
	}

	// Create a map to store the JSON data
	var data map[string][]interface{}

	// Unmarshal the JSON data into the map
	err = json.NewDecoder(resp.Body).Decode(&data)
	if err != nil {
		fmt.Println("Error:", err)
		return nil, nil, err
	}
	resp.Body.Close()

	for _, source := range data["sources"] {
		if source.(map[string]interface{})["children"] != nil {
			for _, child1 := range source.(map[string]interface{})["children"].([]interface{}) {
				if child1.(map[string]interface{})["children"] != nil {
					for _, child2 := range child1.(map[string]interface{})["children"].([]interface{}) {
						child2Data := child2.(map[string]interface{})
						if child2Data["id"].(string) == sourceUid {
							return source.(map[string]interface{}), child2Data, nil
						}
					}
				}
			}
		}
	}
	return nil, nil, nil
}

// func (h *Handler) roleChecker(role string) bool { // For checking user role verification for some apis
// 	return (userRole == role)
// }
