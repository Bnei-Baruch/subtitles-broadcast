package api

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"math"
	"net/http"
	"strconv"
	"strings"

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
)

type Handler struct {
	Database *gorm.DB
	Cache    *redis.Client
}

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

func (h *Handler) AddSlides(ctx *gin.Context) {
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
	if len(req.SourceUid) == 0 || len(req.Language) == 0 {
		ctx.JSON(http.StatusBadRequest,
			getResponse(true, nil, "Invalid request data", "Getting data has failed"))
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
	newFile := File{
		Type:      KabbalahmediaFileSourceType,
		Language:  req.Language,
		SourceUid: req.SourceUid,
		FileUid:   fileUid,
	}
	if err := tx.Create(&newFile).Error; err != nil {
		tx.Rollback()
		log.Fatalf("Internal error: %s", err)
	}
	for idx, content := range contents {
		if len(content) > 0 {
			slide := Slide{
				FileId:      newFile.ID,
				Slide:       content,
				OrderNumber: idx,
			}
			if err := tx.Create(&slide).Error; err != nil {
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

func (h *Handler) UpdateSlide(ctx *gin.Context) {
	req := struct {
		SlideID  int    `json:"slide_id"`
		Language string `json:"language"`
		Slide    string `json:"slide"`
	}{}
	err := ctx.BindJSON(&req)
	if err != nil {
		log.Error(err)
		ctx.JSON(http.StatusBadRequest,
			getResponse(true, nil, err.Error(), "Binding data has failed"))
		return
	}
	slide := Slide{}
	err = h.Database.Debug().WithContext(ctx).
		Table("slides").
		Select("slides.*, files.language").
		Joins("INNER JOIN files ON slides.file_id = files.id").
		Where("slides.id = ?", req.SlideID).Where("files.language = ?", req.Language).First(&slide).Error
	if err != nil {
		if err.Error() == "record not found" {
			ctx.JSON(http.StatusNotFound,
				getResponse(true, nil, err.Error(), "No slide to update"))
			return
		}
		log.Error(err)
		ctx.JSON(http.StatusInternalServerError,
			getResponse(true, nil, err.Error(), "Binding data has failed"))
		return
	}
	slide.Slide = req.Slide
	if err := h.Database.WithContext(ctx).Updates(&slide).Error; err != nil {
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

func (h *Handler) GetSlides(ctx *gin.Context) {
	userId, _ := ctx.Get("user_id")
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
	slides := []*Slide{}
	query := h.Database.Debug().WithContext(ctx).
		Table("slides").
		Select("slides.*, CASE WHEN bookmarks.user_id = ? THEN true ELSE false END AS bookmarked, files.source_uid, files.language", userId).
		Joins("INNER JOIN files ON slides.file_id = files.id").Joins("LEFT JOIN bookmarks ON slides.id = bookmarks.slide_id").
		Order("slides.id").Order("order_number")
	if len(sourceUid) > 0 {
		query = query.Where("files.source_uid = ?", sourceUid)
	}
	if len(fileUid) > 0 {
		query = query.Where("files.file_uid = ?", fileUid)
	}
	if len(language) > 0 {
		query = query.Where("files.language = ?", language)
	}
	if len(keyword) > 0 {
		query = query.Where("slides.slide like ?", "%"+keyword+"%")
	}
	err = query.Count(&totalRows).Limit(listLimit).Offset(offset).Find(&slides).Error
	if err != nil {
		ctx.JSON(http.StatusInternalServerError,
			getResponse(false, nil, err.Error(), "Getting data has failed"))
		return
	}
	if len(slides) == 0 {
		ctx.JSON(http.StatusNotFound,
			getResponse(false, nil, "No slide has found", "No slide has found"))
		return
	}
	for i := range slides {
		sourceData, sourceGrandChild, err := getTargetSourceAndSourceGrandChild(slides[i].SourceUid, slides[i].Language)
		if err != nil {
			ctx.JSON(http.StatusBadRequest,
				getResponse(false, nil, err.Error(), "Getting data has failed"))
			return
		}
		slides[i].SourcePath = sourceData["full_name"].(string) + "(" + sourceData["name"].(string) + ") / " + sourceGrandChild["type"].(string) + " / " + sourceGrandChild["name"].(string) + " / " + fmt.Sprintf("%d", slides[i].ID)
	}

	ctx.JSON(http.StatusOK,
		getResponse(true,
			struct {
				Pagination *Pagination `json:"pagination"`
				Slides     []*Slide    `json:"slides"`
			}{
				Pagination: &Pagination{
					Limit:      listLimit,
					Page:       page,
					TotalRows:  totalRows,
					TotalPages: int(math.Ceil(float64(totalRows) / float64(listLimit))),
				},
				Slides: slides,
			},
			"", "Getting data has succeeded"))
}

func (h *Handler) DeleteSlides(ctx *gin.Context) {
	slideId := ctx.Param("slide_id")
	slideIdInt, err := strconv.Atoi(slideId)
	if err != nil {
		log.Error(err)
		ctx.JSON(http.StatusBadRequest,
			getResponse(true, nil, err.Error(), "Slide ID must be an integer"))
		return
	}
	if err := h.Database.Debug().Where("slide_id = ?", slideIdInt).Delete(&Bookmark{}).Error; err != nil {
		log.Error(err)
		ctx.JSON(http.StatusInternalServerError,
			getResponse(true, nil, err.Error(), "Binding data has failed"))
		return
	}
	if err := h.Database.Debug().Where("id = ?", slideIdInt).Delete(&Slide{}).Error; err != nil {
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
	userId, _ := ctx.Get("user_id")
	slideId := ctx.Param("slide_id")
	slideIdInt, err := strconv.Atoi(slideId)
	if err != nil {
		ctx.JSON(http.StatusBadRequest,
			getResponse(false, nil, err.Error(), "Getting data has failed"))
		return
	}
	bookmark := Bookmark{
		SlideId: slideIdInt,
		UserId:  userId.(string),
	}
	err = h.Database.Debug().Create(&bookmark).Error
	if err != nil {
		if strings.Contains(err.Error(), "SQLSTATE 23505") {
			ctx.JSON(http.StatusBadRequest,
				getResponse(false, nil, err.Error(), "The same bookmark exists"))
			return
		}
		ctx.JSON(http.StatusInternalServerError,
			getResponse(false, nil, err.Error(), "Adding data has failed"))
		return
	}
	ctx.JSON(http.StatusCreated,
		getResponse(true,
			bookmark,
			"", "Adding data has succeeded"))
}

func (h *Handler) GetUserBookmarks(ctx *gin.Context) {
	userId, _ := ctx.Get("user_id")
	bookmarks := []*Bookmark{}
	err := h.Database.Debug().WithContext(ctx).Where("user_id = ?", userId).Find(&bookmarks).Error
	if err != nil {
		ctx.JSON(http.StatusInternalServerError,
			getResponse(false, nil, err.Error(), "Getting data has failed"))
		return
	}
	if len(bookmarks) == 0 {
		ctx.JSON(http.StatusNotFound,
			getResponse(false, nil, err.Error(), "No bookmark data"))
		return
	}
	userBookmarkList := []string{}
	for _, bookmark := range bookmarks {
		sourcePath, statusCode, description, err := getSourcePathFromSlice(h.Database, ctx, bookmark.SlideId)
		if err != nil {
			ctx.JSON(statusCode,
				getResponse(false, nil, err.Error(), description))
			return
		}
		if len(sourcePath) == 0 {
			continue
		} else {
			userBookmarkList = append(userBookmarkList, sourcePath+" / "+fmt.Sprintf("%d", bookmark.SlideId))
		}
	}
	ctx.JSON(http.StatusOK,
		getResponse(true,
			userBookmarkList,
			"", "Getting data has succeeded"))
}

func (h *Handler) GetBookmarkPath(ctx *gin.Context) {
	slideId := ctx.Param("slide_id")
	slideIdInt, err := strconv.Atoi(slideId)
	if err != nil {
		ctx.JSON(http.StatusBadRequest,
			getResponse(false, nil, err.Error(), "Getting data has failed"))
		return
	}
	bookmark := Bookmark{}
	err = h.Database.Debug().WithContext(ctx).Where("slide_id = ?", slideIdInt).First(&bookmark).Error
	if err != nil {
		if err.Error() == "record not found" {
			ctx.JSON(http.StatusNotFound,
				getResponse(false, nil, err.Error(), "No bookmark data"))
		} else {
			ctx.JSON(http.StatusInternalServerError,
				getResponse(false, nil, err.Error(), "Getting data has failed"))
		}
		return
	}
	sourcePath, statusCode, description, err := getSourcePathFromSlice(h.Database, ctx, slideIdInt)
	if err != nil {
		ctx.JSON(statusCode,
			getResponse(false, nil, err.Error(), description))
		return
	}
	if len(sourcePath) == 0 {
		ctx.JSON(http.StatusNotFound,
			getResponse(false, nil, err.Error(), "No bookmark path"))
		return
	}
	ctx.JSON(http.StatusOK,
		getResponse(true,
			sourcePath+" / "+fmt.Sprintf("%d", bookmark.SlideId),
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
		return
	}
	if sourceGrandChild != nil {
		sourceName = sourceGrandChild["name"].(string)
	} else {
		ctx.JSON(http.StatusNotFound,
			getResponse(false, nil, "", "No source data"))
		return
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
	sourcePath, statusCode, description, err := getSourcePath(sourceUid, language)
	if err != nil {
		ctx.JSON(statusCode,
			getResponse(false, nil, err.Error(), description))
		return
	}
	ctx.JSON(statusCode,
		getResponse(true,
			sourcePath,
			"", description))
}

func getSourcePath(sourceUid, language string) (string, int, string, error) {
	sourcePath := ""
	sourceData, sourceGrandChild, err := getTargetSourceAndSourceGrandChild(sourceUid, language)
	if err != nil {
		return "", http.StatusInternalServerError, "Getting data has failed", err
	}
	if sourceData != nil && sourceGrandChild != nil {
		sourcePath = sourceData["full_name"].(string) + "(" + sourceData["name"].(string) + ") / " + sourceGrandChild["type"].(string) + " / " + sourceGrandChild["name"].(string)
	} else {
		return "", http.StatusNotFound, "No source data", fmt.Errorf("no source data")
	}
	return sourcePath, http.StatusOK, "Getting data has succeeded", nil
}

func getSourcePathFromSlice(database *gorm.DB, ctx context.Context, slideId int) (string, int, string, error) {
	slide, languageCode, err := getSlideAndLanguageCodeBySlideId(database, ctx, slideId)
	if err != nil {
		if err.Error() == "record not found" {
			if slide == nil {
				return "", http.StatusNotFound, "No slide data", err
			} else {
				return "", http.StatusBadRequest, "Not a valid language code", err
			}
		} else {
			return "", http.StatusInternalServerError, "Getting data has failed", err
		}
	}
	file := File{}
	err = database.Debug().WithContext(ctx).Where("id = ?", slide.FileId).First(&file).Error
	if err != nil {
		if err.Error() == "record not found" {
			return "", http.StatusNotFound, "No file data", err
		} else {
			return "", http.StatusInternalServerError, "Getting data has failed", err
		}
	}
	return getSourcePath(file.SourceUid, languageCode)
}

func getSlideAndLanguageCodeBySlideId(database *gorm.DB, ctx context.Context, slideId int) (*Slide, string, error) {
	slide := Slide{}
	err := database.Debug().WithContext(ctx).Where("id = ?", slideId).First(&slide).Error
	if err != nil {
		return nil, "", err
	}
	file := File{}
	err = database.Debug().WithContext(ctx).Where("id = ?", slide.FileId).First(&file).Error
	if err != nil {
		return nil, "", err
	}
	return &slide, file.Language, nil
}

// Get proper data to make source path from sources url
func getTargetSourceAndSourceGrandChild(sourceUid, language string) (map[string]interface{}, map[string]interface{}, error) {
	resp, err := http.Get(fmt.Sprintf(KabbalahmediaSourcesUrl, language))
	if err != nil {
		log.Fatalf("Internal error: %s", err)
	}
	var data map[string][]interface{}
	err = json.NewDecoder(resp.Body).Decode(&data)
	if err != nil {
		log.Println("Error:", err)
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
