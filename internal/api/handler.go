package api

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"regexp"
	"sort"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/lib/pq"
	log "github.com/sirupsen/logrus"
	"gorm.io/gorm"
)

const (
	responseSuccess     = "success"
	responseData        = "data"
	responseError       = "error"
	responseDescription = "description"

	defaultListLimit = 50

	DBTableSlides      = "slides"
	DBTableBookmarks   = "bookmarks"
	DBTableFiles       = "files"
	DBTableSourcePaths = "source_paths"

	ERR_UNIQUE_VIOLATION_CODE      = "23505"
	ERR_FOREIGN_KEY_VIOLATION_CODE = "23503"
)

type Handler struct {
	Database *gorm.DB
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
	reqs := []*struct {
		FileUid     string `json:"file_uid"`
		Slide       string `json:"slide"`
		OrderNumber int    `json:"order_number"`
		LeftToRight bool   `json:"left_to_right"`
		SlideType   string `json:"slide_type"`
	}{}
	err := ctx.BindJSON(&reqs)
	if err != nil {
		log.Error(err)
		ctx.JSON(http.StatusBadRequest,
			getResponse(false, nil, err.Error(), "Binding data has failed"))
		return
	}
	tx := h.Database.Debug().WithContext(ctx).Begin()
	if tx.Error != nil {
		log.Error(tx.Error)
		ctx.JSON(http.StatusInternalServerError,
			getResponse(false, nil, tx.Error.Error(), "Creating transaction has failed"))
		return
	}
	userId, _ := ctx.Get("user_id")
	for _, req := range reqs {
		now := time.Now()
		if err = tx.Create(&Slide{
			FileUid:     req.FileUid,
			Slide:       req.Slide,
			OrderNumber: req.OrderNumber,
			LeftToRight: req.LeftToRight,
			SlideType:   req.SlideType,
			CreatedAt:   now,
			UpdatedAt:   now,
			CreatedBy:   userId.(string),
			UpdatedBy:   userId.(string),
		}).Error; err != nil {
			tx.Rollback()
			log.Error(err)
			ctx.JSON(http.StatusInternalServerError,
				getResponse(false, nil, err.Error(), "Creating file data has failed"))
			return
		}
	}
	if err = tx.Commit().Error; err != nil {
		log.Error(err)
		ctx.JSON(http.StatusInternalServerError,
			getResponse(false, nil, err.Error(), "Adding slide data has failed"))
		return
	}
	ctx.JSON(http.StatusOK, getResponse(true, nil, "", "Adding slide data has succeeded"))
}

func (h *Handler) AddCustomSlides(ctx *gin.Context) {
	req := struct {
		FileName    string   `json:"file_name"`
		SourcePath  string   `json:"source_path"`
		Languages   []string `json:"languages"`
		SourceUid   string   `json:"source_uid"`
		FileUid     string   `json:"file_uid"`
		Slides      []string `json:"slides"`
		SlidesTypes []string `json:"slides_types"`
		LeftToRight bool     `json:"left_to_right"`
	}{}
	err := ctx.BindJSON(&req)
	if err != nil {
		log.Error(err)
		ctx.JSON(http.StatusBadRequest,
			getResponse(false, nil, err.Error(), "Binding data has failed"))
		return
	}
	tx := h.Database.Debug().WithContext(ctx).Begin()
	if tx.Error != nil {
		log.Error(tx.Error)
		ctx.JSON(http.StatusInternalServerError,
			getResponse(false, nil, tx.Error.Error(), "Creating transaction has failed"))
		return
	}
	// When SourcePath in the request has just source uid and get source path from the DB
	if regexp.MustCompile(`^[a-zA-Z0-9]{8}$`).MatchString(req.SourcePath) {
		sourcePath := struct {
			Path string `gorm:"column:path"`
		}{}
		result := h.Database.Debug().WithContext(ctx).
			Select("path").
			Table(DBTableSourcePaths).
			Where("source_uid = ?", req.SourcePath).
			Where("languages = ?", pq.StringArray(req.Languages)).
			First(&sourcePath)
		if result.Error != nil {
			log.Error(result.Error)
			// Some Likutim or new sources might not have source path.
			// TODO: Allow renaming source path for any loaded material.
			sourcePath.Path = "Unknown"
		}
		req.SourcePath = sourcePath.Path
	}
	now := time.Now()
	userId, _ := ctx.Get("user_id")
	sourcePathData := &SourcePath{
		Languages: pq.StringArray(req.Languages),
		SourceUid: req.SourceUid,
		Path:      req.SourcePath,
		CreatedBy: userId.(string),
		UpdatedBy: userId.(string),
		CreatedAt: now,
		UpdatedAt: now,
	}
	if err = tx.Table(DBTableSourcePaths).Create(sourcePathData).Error; err != nil {
		tx.Rollback()
		if pgErr, ok := err.(*pgconn.PgError); ok && pgErr.Code == ERR_UNIQUE_VIOLATION_CODE {
			ctx.JSON(http.StatusBadRequest,
				getResponse(false, nil, err.Error(), "The source uid with the langauges already exists"))
			return
		}
		log.Error(err)
		ctx.JSON(http.StatusInternalServerError,
			getResponse(false, nil, err.Error(), "Creating source path data has failed"))
		return
	}

	fileData := &File{
		Type:      UploadFileSourceType,
		Languages: pq.StringArray(req.Languages),
		SourceUid: req.SourceUid,
		FileUid:   req.FileUid,
		Filename:  req.FileName,
		CreatedBy: userId.(string),
		UpdatedBy: userId.(string),
		CreatedAt: now,
		UpdatedAt: now,
	}
	if err = tx.Table(DBTableFiles).Create(fileData).Error; err != nil {
		tx.Rollback()
		log.Error(err)
		ctx.JSON(http.StatusInternalServerError,
			getResponse(false, nil, err.Error(), "Creating file data has failed"))
		return
	}
	for idx, slide := range req.Slides {
		slideData := Slide{
			Slide:       strings.ReplaceAll(slide, "\n", "\\n"),
			OrderNumber: idx / len(req.Languages),
			LeftToRight: req.LeftToRight,
			SlideType:   req.SlidesTypes[idx],
			CreatedBy:   userId.(string),
			UpdatedBy:   userId.(string),
			CreatedAt:   now,
			UpdatedAt:   now,
		}
		if len(req.FileUid) > 0 {
			slideData.FileUid = req.FileUid
		}
		if err = tx.Create(&slideData).Error; err != nil {
			tx.Rollback()
			log.Error(err)
			ctx.JSON(http.StatusInternalServerError,
				getResponse(false, nil, err.Error(), "Creating slide data has failed"))
			return
		}
	}

	if err = tx.Commit().Error; err != nil {
		log.Error(err)
		ctx.JSON(http.StatusInternalServerError,
			getResponse(false, nil, err.Error(), "Adding slide data has failed"))
		return
	}
	ctx.JSON(http.StatusOK, getResponse(true, nil, "", "Adding custom slide data has succeeded"))
}

// Get all slides with bookmarked info by user
func (h *Handler) GetSlides(ctx *gin.Context) {
	userId, _ := ctx.Get("user_id")
	offsetStr := ctx.Query("offset")
	offset := 0
	var err error
	if len(offsetStr) > 0 {
		offset, err = strconv.Atoi(offsetStr)
	}
	if err != nil {
		ctx.JSON(http.StatusBadRequest, getResponse(false, nil, err.Error(), "Getting data has failed, failed to atoi offset"))
		return
	}
	limitStr := ctx.Query("limit")
	limit := 0
	if len(limitStr) > 0 {
		limit, err = strconv.Atoi(limitStr)
	}
	if err != nil {
		ctx.JSON(http.StatusBadRequest, getResponse(false, nil, err.Error(), "Getting data has failed, failed to atoi limit"))
		return
	}
	sourceUid := ctx.Query("source_uid")
	fileUid := ctx.Query("file_uid")
	language := ctx.Query("language")
	keyword := ctx.Query("keyword")
	hidden := ctx.Query("hidden")
	slides := []*SlideDetail{}
	query := h.constructSlideQuery(ctx, userId)
	if len(sourceUid) > 0 {
		query = query.Where("files.source_uid = ?", sourceUid)
	}
	if len(fileUid) > 0 {
		query = query.Where("files.file_uid = ?", fileUid)
	}
	if len(language) > 0 {
		query = query.Where("? = ANY(files.languages)", language)
	}
	if hidden != "true" {
		query = query.Where("slides.hidden = FALSE")
	}
	var lastModified sql.NullTime
	result := query.Select("MAX(slides.updated_at)").Scan(&lastModified)
	if result.Error != nil {
		log.Error(result.Error)
		ctx.JSON(http.StatusInternalServerError,
			getResponse(false, nil, result.Error.Error(), "Getting data has failed, while looking max last modified"))
		return
	}
	if len(keyword) > 0 {
		if ctx.FullPath() == "/api/v1/file_slide" {
			query = query.Where("slides.slide ILIKE ?", "%"+keyword+"%")
		} else {
			query = query.Where("(slides.slide ILIKE ? OR source_paths.path ILIKE ?)", "%"+keyword+"%", "%"+keyword+"%")
		}
	}
	var totalRows int64
	finalQuery := query.
		Select("slides.*, source_paths.id AS source_path_id, source_paths.path AS source_path, CASE WHEN bookmarks.user_id = ? THEN bookmarks.id END AS bookmark_id, files.source_uid, source_paths.languages, source_paths.path || ' / ' || slides.order_number+1 AS slide_source_path", userId).
		Order("slides.file_uid").Order("slides.order_number").Order("slides.updated_at").
		Count(&totalRows)
	if limit > 0 {
		finalQuery = finalQuery.Limit(limit).Offset(offset)
	}
	result = finalQuery.Find(&slides)
	if result.Error != nil {
		log.Error(result.Error)
		ctx.JSON(http.StatusInternalServerError,
			getResponse(false, nil, result.Error.Error(), "Getting data has failed"))
		return
	}

	slidesWithMetadata := struct {
		Slides       []*SlideDetail `json:"slides"`
		LastModified sql.NullTime   `json:"last_modified"`
		Total        int64          `json:"total"`
	}{
		Slides:       slides,
		LastModified: lastModified,
		Total:        totalRows,
	}

	ctx.JSON(http.StatusOK, getResponse(true, slidesWithMetadata, "", "Getting data has succeeded"))
}

// Constructs the base slide query based on user, fileUID, and keyword
func (h *Handler) constructSlideQuery(ctx *gin.Context, userId interface{}) *gorm.DB {
	return h.Database.Debug().WithContext(ctx).
		Table(DBTableSlides).
		Joins("INNER JOIN files ON slides.file_uid = files.file_uid").
		Joins("INNER JOIN source_paths ON source_paths.source_uid = files.source_uid AND source_paths.languages = files.languages").
		Joins("LEFT JOIN bookmarks ON slides.id = bookmarks.slide_id AND bookmarks.user_id = ?", userId)
}

func (h *Handler) UpdateSlides(ctx *gin.Context) {
	reqs := []*struct {
		SlideID     uint   `json:"slide_id"`
		Slide       string `json:"slide"`
		OrderNumber int    `json:"order_number"`
		LeftToRight bool   `json:"left_to_right"`
		SlideType   string `json:"slide_type"`
	}{}
	err := ctx.BindJSON(&reqs)
	if err != nil {
		log.Error(err)
		ctx.JSON(http.StatusBadRequest, getResponse(false, nil, err.Error(), "Binding data has failed"))
		return
	}
	tx := h.Database.Debug().WithContext(ctx).Begin()
	if tx.Error != nil {
		log.Error(tx.Error)
		ctx.JSON(http.StatusInternalServerError,
			getResponse(false, nil, tx.Error.Error(), "Creating transaction has failed"))
		return
	}
	userId, _ := ctx.Get("user_id")
	valuesQuery := []string{}
	placeholders := []interface{}{}

	for _, req := range reqs {
		// Use a placeholder for req.Slide and escape any special characters
		value := fmt.Sprintf("(%d, ?, %d, %t, '%s')", req.SlideID, req.OrderNumber, req.LeftToRight, req.SlideType)
		valuesQuery = append(valuesQuery, value)

		// Append Slide value to placeholders
		placeholders = append(placeholders, req.Slide)
	}

	withQuery := `
    WITH reqs(slide_id, slide, order_number, left_to_right, slide_type) AS
    (VALUES ` + strings.Join(valuesQuery, ", ") + ") "
	updateQuery := `UPDATE slides AS s SET
    slide = r.slide,
    order_number = r.order_number,
    left_to_right = r.left_to_right,
    slide_type = r.slide_type,
    updated_at = ?,
    updated_by = ? `
	query := withQuery + updateQuery + "FROM reqs AS r WHERE s.id = r.slide_id"

	// Append the timestamp placeholder to the placeholders slice
	placeholders = append(placeholders, time.Now(), userId)

	// Execute the SQL query
	result := tx.Exec(query, placeholders...)

	if result.Error != nil {
		tx.Rollback()
		log.Error(result.Error)
		ctx.JSON(http.StatusInternalServerError, getResponse(false, nil, result.Error.Error(), "Updating slide data has failed"))
		return
	}
	if result.RowsAffected == 0 {
		reqSlideIds := []string{}
		for _, req := range reqs {
			reqSlideIds = append(reqSlideIds, fmt.Sprintf("%d", req.SlideID))
		}
		errMsg := fmt.Sprintf("No slide(id: %s) to update", reqSlideIds)
		ctx.JSON(http.StatusBadRequest, getResponse(false, nil, errMsg, errMsg))
		return
	}

	if err := tx.Commit().Error; err != nil {
		log.Error(err)
		ctx.JSON(http.StatusInternalServerError,
			getResponse(false, nil, err.Error(), "Updating slide data has failed"))
		return
	}

	ctx.JSON(http.StatusOK, getResponse(true, nil, "", "Updating data has succeeded"))
}

func (h *Handler) DeleteSlides(ctx *gin.Context) {
	req := struct {
		ForceDeleteBookmarks bool   `json:"force_delete_bookmarks"`
		SlideIds             []uint `json:"slide_ids"`
	}{}
	err := ctx.BindJSON(&req)
	if err != nil {
		log.Error(err)
		ctx.JSON(http.StatusBadRequest, getResponse(false, nil, err.Error(), "Binding data has failed"))
		return
	}
	tx := h.Database.Debug().WithContext(ctx).Begin()
	if tx.Error != nil {
		log.Error(tx.Error)
		ctx.JSON(http.StatusInternalServerError,
			getResponse(false, nil, tx.Error.Error(), "Creating transaction has failed"))
		return
	}

	var totalRows int64
	result := tx.Table(DBTableSlides).
		Joins("INNER JOIN bookmarks ON slides.id = bookmarks.slide_id").
		Where("slides.id In (?)", req.SlideIds).Count(&totalRows)
	if result.Error != nil {
		log.Error(result.Error)
		ctx.JSON(http.StatusInternalServerError,
			getResponse(false, nil, result.Error.Error(), "Deleting slide data has failed"))
		return
	}
	if !req.ForceDeleteBookmarks && totalRows > 0 {
		errMsg := "There are bookmarks refer to slide(id) in table to delete"
		log.Error(errMsg)
		ctx.JSON(http.StatusBadRequest,
			getResponse(false, nil, errMsg, "Deleting slide data has failed"))
		return
	}
	result = tx.Where("id In (?)", req.SlideIds).Delete(&Slide{})
	if result.Error != nil {
		tx.Rollback()
		log.Error(result.Error)
		ctx.JSON(http.StatusInternalServerError,
			getResponse(false, nil, result.Error.Error(), "Deleting slide data has failed"))
		return
	}
	if result.RowsAffected == 0 {
		reqSlideIds := []string{}
		for _, slideId := range req.SlideIds {
			reqSlideIds = append(reqSlideIds, fmt.Sprintf("%d", slideId))
		}
		errMsg := fmt.Sprintf("No slide(id: %s) to delete", reqSlideIds)
		ctx.JSON(http.StatusBadRequest, getResponse(false, nil, errMsg, errMsg))
		return
	}

	if err := tx.Commit().Error; err != nil {
		log.Error(err)
		ctx.JSON(http.StatusInternalServerError,
			getResponse(false, nil, err.Error(), "Deleting slide data has failed"))
		return
	}

	ctx.JSON(http.StatusOK, getResponse(true, nil, "", "Deleting data has succeeded"))
}

func (h *Handler) DeleteSourceSlides(ctx *gin.Context) {
	queryParams := struct {
		ForceDeleteBookmarks bool   `form:"force_delete_bookmarks"`
		Undelete             bool   `form:"undelete"`
		Forever              bool   `form:"forever"`
		DebugPath            string `form:"debug_path"`
	}{}
	if err := ctx.BindQuery(&queryParams); err != nil {
		log.Error(err)
		ctx.JSON(http.StatusInternalServerError,
			getResponse(false, nil, err.Error(), "Getting data has failed"))
		return
	}

	sourceUid := ctx.Param("source_uid")
	userId, _ := ctx.Get("user_id")
	log.Info(fmt.Sprintf("Deleting SourceSlides - sourceUid: %+v, queryParams: %+v, userId: %+v", sourceUid, queryParams, userId))
	tx := h.Database.Debug().WithContext(ctx).Begin()
	if tx.Error != nil {
		log.Error(tx.Error)
		ctx.JSON(http.StatusInternalServerError,
			getResponse(false, nil, tx.Error.Error(), "Creating transaction has failed"))
		return
	}
	fileUids := []string{}
	query := tx.Select("DISTINCT ON (slides.file_uid) slides.file_uid AS file_uid").
		Table(DBTableSlides).
		Joins("INNER JOIN files ON files.file_uid = slides.file_uid AND files.source_uid = ?", sourceUid)
	if !queryParams.ForceDeleteBookmarks {
		result := query.Joins("INNER JOIN bookmarks ON slides.id = bookmarks.slide_id").Find(&fileUids)
		if result.Error != nil {
			log.Error(result.Error)
			ctx.JSON(http.StatusInternalServerError,
				getResponse(false, nil, result.Error.Error(), "Deleting slide data has failed"))
			return
		}
		if len(fileUids) > 0 {
			errMsg := "There are bookmarks refer to slide(id) in table to delete"
			log.Error(errMsg)
			ctx.JSON(http.StatusBadRequest,
				getResponse(false, nil, errMsg, "Deleting file slide data has failed"))
			return
		}
	}
	result := query.Find(&fileUids)
	if result.Error != nil {
		log.Error(result.Error)
		ctx.JSON(http.StatusInternalServerError,
			getResponse(false, nil, result.Error.Error(), "Deleting slide data has failed"))
		return
	}

	updates := map[string]interface{}{
		"hidden":     !queryParams.Undelete,
		"updated_by": userId,
		"updated_at": time.Now(),
	}
	if queryParams.Forever {
		result = tx.Where("file_uid in ?", fileUids).Delete(&Slide{})
	} else {
		result = tx.Model(&Slide{}).
			Where("file_uid in ?", fileUids).
			Updates(updates)
	}
	if result.Error != nil {
		log.Error(result.Error)
		ctx.JSON(http.StatusInternalServerError,
			getResponse(false, nil, result.Error.Error(), "Hiding slide data has failed"))
		return
	}
	if result.RowsAffected == 0 {
		ctx.JSON(http.StatusBadRequest,
			getResponse(false, nil, fmt.Sprintf("No file slides in source %s", sourceUid), fmt.Sprintf("No file slides in source %s", sourceUid)))
		return
	}

	if queryParams.Forever {
		result = tx.Where("source_uid = ?", sourceUid).Delete(&File{})
	} else {
		result = tx.Model(&File{}).
			Where("source_uid = ?", sourceUid).
			Updates(updates)
	}
	if result.Error != nil {
		log.Error(result.Error)
		ctx.JSON(http.StatusInternalServerError,
			getResponse(false, nil, result.Error.Error(), "Hiding file data has failed"))
		return
	}
	if result.RowsAffected == 0 {
		ctx.JSON(http.StatusBadRequest,
			getResponse(false, nil, fmt.Sprintf("No file with %s", sourceUid), fmt.Sprintf("No file with %s", sourceUid)))
		return
	}

	if queryParams.Forever {
		result = tx.Where("source_uid = ?", sourceUid).Delete(&SourcePath{})
		if result.Error != nil {
			log.Error(result.Error)
			ctx.JSON(http.StatusInternalServerError,
				getResponse(false, nil, result.Error.Error(), "Deleting file slide data has failed"))
			return
		}
		if result.RowsAffected == 0 {
			ctx.JSON(http.StatusBadRequest,
				getResponse(false, nil, fmt.Sprintf("No source path with souruce uid %s", sourceUid), fmt.Sprintf("No source path with source uid %s", sourceUid)))
			return
		}
	}

	if err := tx.Commit().Error; err != nil {
		log.Error(err)
		ctx.JSON(http.StatusInternalServerError,
			getResponse(false, nil, err.Error(), "Deleting file slide data has failed"))
		return
	}
	ctx.JSON(http.StatusOK, getResponse(true, nil, "", "Deleting data has succeeded"))
}

func (h *Handler) AddOrUpdateUserBookmark(ctx *gin.Context) {
	userId, _ := ctx.Get("user_id")
	req := struct {
		FileUid     string `json:"file_uid"`
		SlideId     int    `json:"slide_id"`
		Update      bool   `json:"update"`
		OrderNumber *int   `json:"order_number"`
	}{}
	err := ctx.BindJSON(&req)
	if err != nil {
		log.Error(err)
		ctx.JSON(http.StatusBadRequest, getResponse(false, nil, err.Error(), "Binding data has failed"))
		return
	}
	bookmark := Bookmark{}
	if req.Update {
		updateOrder := ""
		placeholders := []interface{}{req.SlideId}
		if req.OrderNumber != nil {
			placeholders = append(placeholders, *req.OrderNumber)
			updateOrder = "order_number = ?,"
		}
		placeholders = append(placeholders, time.Now(), req.FileUid, userId.(string))
		updateQuery := fmt.Sprintf(`UPDATE bookmarks
			 SET slide_id = ?,
			 %s
			 updated_at = ?
			 WHERE file_uid = ?
			 AND user_id = ?`, updateOrder)
		result := h.Database.Debug().WithContext(ctx).Exec(updateQuery, placeholders...).Table(DBTableBookmarks).
			Select("*").
			Where("file_uid = ? AND user_id = ?", req.FileUid, userId.(string)).
			First(&bookmark)
		if result.Error != nil {
			log.Error(result.Error)
			if result.Error.Error() == gorm.ErrRecordNotFound.Error() {
				ctx.JSON(http.StatusBadRequest,
					getResponse(false, nil, "No bookmarked slide to update", "No bookmarked slide to update"))
				return
			}
			ctx.JSON(http.StatusInternalServerError,
				getResponse(false, nil, result.Error.Error(), "Updating bookmark has failed"))
			return
		}
	} else {
		if req.OrderNumber == nil {
			msg := "Expected order_number when adding bookmark."
			ctx.JSON(http.StatusBadRequest, getResponse(false, nil, msg, msg))
			return
		}
		now := time.Now()
		bookmark.SlideId = req.SlideId
		bookmark.FileUid = req.FileUid
		bookmark.UserId = userId.(string)
		bookmark.OrderNumber = *req.OrderNumber
		bookmark.CreatedAt = now
		bookmark.UpdatedAt = now
		err = h.Database.Debug().Create(&bookmark).Error
		if err != nil {
			log.Error(err)
			if pgErr, ok := err.(*pgconn.PgError); ok && pgErr.Code == ERR_FOREIGN_KEY_VIOLATION_CODE {
				ctx.JSON(http.StatusBadRequest,
					getResponse(false, nil, err.Error(), "The file_uid must be a valid file_uid in files table"))
				return
			}
			if pgErr, ok := err.(*pgconn.PgError); ok && pgErr.Code == ERR_UNIQUE_VIOLATION_CODE {
				ctx.JSON(http.StatusBadRequest,
					getResponse(false, nil, err.Error(), "The bookmark with the same file exists"))
				return
			}
			ctx.JSON(http.StatusInternalServerError, getResponse(false, nil, err.Error(), "Adding bookmark has failed"))
			return
		}
	}
	ctx.JSON(http.StatusOK, getResponse(true, bookmark, "", "Adding bookmark data has succeeded"))
}

func (h *Handler) GetUserBookmarks(ctx *gin.Context) {
	userId, _ := ctx.Get("user_id")
	language := ctx.Query("language")
	if len(language) == 0 {
		ctx.JSON(http.StatusBadRequest,
			getResponse(false, nil, "Query language is missing", "Query language is missing"))
		return
	}
	result := []struct {
		Slide_Id     uint   `json:"slide_id"`
		BookmarkId   uint   `json:"bookmark_id"`
		BookmarkPath string `json:"bookmark_path"`
		OrderNumber  int    `json:"order_number"`
		FileUid      string `json:"file_uid"`
	}{}
	query := h.Database.Debug().WithContext(ctx).
		Select("bookmarks.slide_id AS slide_id, bookmarks.order_number AS order_number, bookmarks.id AS bookmark_id, source_paths.path || ' / ' || slides.order_number+1 AS bookmark_path, files.file_uid AS file_uid").
		Table(DBTableBookmarks).
		Joins("INNER JOIN slides ON bookmarks.slide_id = slides.id").
		Joins("INNER JOIN files ON slides.file_uid = files.file_uid").
		Joins("INNER JOIN source_paths ON files.source_uid = source_paths.source_uid AND source_paths.languages = files.languages AND ? = ANY(files.languages)", language).
		Where("bookmarks.user_id = ?", userId).
		Order("bookmarks.order_number").
		Find(&result)
	if query.Error != nil {
		log.Error(query.Error)
		ctx.JSON(http.StatusInternalServerError,
			getResponse(false, nil, query.Error.Error(), "Getting data has failed"))
		return
	}
	ctx.JSON(http.StatusOK, getResponse(true, result, "", "Getting data has succeeded"))
}

func (h *Handler) DeleteUserBookmark(ctx *gin.Context) {
	userId, _ := ctx.Get("user_id")
	bookmarkIdInt, err := strconv.Atoi(ctx.Param("bookmark_id"))
	if err != nil {
		log.Error(err)
		ctx.JSON(http.StatusBadRequest, getResponse(false, nil, err.Error(), "Bookmark ID must be an integer"))
		return
	}
	result := h.Database.Debug().WithContext(ctx).Where("id = ? AND user_id = ?", bookmarkIdInt, userId).Delete(&Bookmark{})
	if result.Error != nil {
		log.Error(result.Error)
		ctx.JSON(http.StatusInternalServerError,
			getResponse(false, nil, result.Error.Error(), "Deleting user bookmark data has failed"))
		return
	}
	if result.RowsAffected == 0 {
		ctx.JSON(http.StatusBadRequest,
			getResponse(false, nil, "No bookmarked slide with the user", "No bookmarked slide with the user"))
		return
	}
	ctx.JSON(http.StatusOK, getResponse(true, nil, "", "Deleting data has succeeded"))
}

func (h *Handler) GetAuthors(ctx *gin.Context) {
	authorList := []string{}
	result := h.Database.Debug().WithContext(ctx).Raw(`
		SELECT DISTINCT 
			TRIM(BOTH ' ' FROM
			CASE 
				WHEN POSITION('/' IN path) > 0 THEN SUBSTRING(path FROM 1 FOR POSITION('/' IN path) - 1)
				ELSE path
			END
			) AS first_name
		FROM source_paths
		WHERE path IS NOT NULL
		ORDER BY first_name
	`).Scan(&authorList)
	if result.Error != nil {
		log.Error(result.Error)
		ctx.JSON(http.StatusInternalServerError,
			getResponse(false, nil, result.Error.Error(), "Getting data has failed"))
		return
	}
	ctx.JSON(http.StatusOK, getResponse(true, authorList, "", "Getting data has succeeded"))
}

// GetArticleTitlesAndAuthorsByQuery
// Return article title and author name pairs by query
// e.g.
// If query is 'Baal HaSulam' and pathes are
// Baal HaSulam / Prefaces / Foreword to The Book of Zohar
// Michael Laitman / Summaries of articles and letters of Baal HaSulam / Baal HaSulam. I will know the creator from within myself (modified)
// Michael Laitman / Summaries of articles and letters of Baal HaSulam / Baal HaSulam. Letter 49 (modified)
// returns
// [Baal HaSulam,
//  Baal HaSulam. I will know the creator from within myself (modified),
//  Baal HaSulam. Letter 49 (modified)]

func (h *Handler) GetSourceValuesByQuery(ctx *gin.Context) {
	query := ctx.Query("query")
	language := ctx.Query("language")
	sourceValueSlideCountList := []struct {
		SourcePath  string `json:"source_path"`
		SourceValue string `json:"source_value"`
		SourceUid   string `json:"source_uid"`
		SlideCount  int    `json:"slide_count"`
	}{}
	result := h.Database.Debug().WithContext(ctx).Raw(`
	SELECT 
    source_path,
    source_value, 
    source_uid,
	languages,
    COUNT(DISTINCT slide) AS slide_count
	FROM (
		SELECT
		path As source_path,
		TRIM(unnest(string_to_array(path, '/'))) AS source_value,
			slide,
			source_paths.source_uid AS source_uid,
			languages
		FROM
			source_paths
		LEFT JOIN (
			SELECT 
				slide, 
				files.source_uid 
			FROM slides
			INNER JOIN files ON slides.file_uid = files.file_uid
		) AS t ON source_paths.source_uid = t.source_uid
	) AS source_values
	WHERE source_value <> ''
	AND source_value ILIKE ?
	AND ? ILIKE ANY(languages)
	GROUP BY 
		source_path,
		source_value, 
		source_uid,
		languages
	ORDER BY 
    source_value;
	`, "%"+query+"%", language).Scan(&sourceValueSlideCountList)
	if result.Error != nil {
		log.Error(result.Error)
		ctx.JSON(http.StatusInternalServerError,
			getResponse(false, nil, result.Error.Error(), "Getting data has failed"))
		return
	}
	ctx.JSON(http.StatusOK, getResponse(true, sourceValueSlideCountList, "", "Getting data has succeeded"))
}

func (h *Handler) GetLanguageListSourceSupports(ctx *gin.Context) {
	sourceUid := ctx.Query("source_uid")
	files, err := getFiles(sourceUid)
	if err != nil {
		ctx.JSON(http.StatusInternalServerError,
			getResponse(false, nil, err.Error(), "Getting data has failed"))
		return
	}
	languageList := []string{}
	for _, contentUnit := range files.ContentUnits {
		for _, file := range contentUnit.Files {
			languageList = append(languageList, file.Language)
		}
	}
	sort.Strings(languageList)
	ctx.JSON(http.StatusOK, getResponse(true, languageList, "", "Getting data has succeeded"))
}

func (h *Handler) GetSourcePath(ctx *gin.Context) {
	userId, _ := ctx.Get("user_id")
	language := ctx.Query("language")
	languageLength := len(language)
	if languageLength == 0 {
		ctx.JSON(http.StatusBadRequest,
			getResponse(false, nil, "", "language is needed"))
		return
	}
	keyword := ctx.Query("keyword")
	type SourcePathData struct {
		SlideID     uint           `json:"slide_id"`
		SlidesCount uint           `json:"slides_count"`
		BookmarkID  *string        `json:"bookmark_id"`
		SourceUID   string         `json:"source_uid"`
		FileUID     string         `json:"file_uid"`
		Languages   pq.StringArray `json:"languages" gorm:"type:text[]"`
		Path        string         `json:"path"`
		Hidden      bool           `json:"hidden"`
		CreatedBy   string         `json:"created_by"`
		CreatedAt   time.Time      `json:"created_at"`
		UpdatedBy   string         `json:"updated_by"`
		UpdatedAt   time.Time      `json:"updated_at"`
	}
	paths := []*SourcePathData{}
	fields := `
    slides.id AS slide_id,
		c.count as slides_count,
    bookmarks.id AS bookmark_id,
    source_paths.source_uid AS source_uid,
    files.file_uid AS file_uid,
    source_paths.languages AS languages,
    source_paths.path AS path,
    slides.hidden AS hidden,source_paths.created_by AS created_by,
		source_paths.created_at AS created_at,
		source_paths.updated_by AS updated_by,
		source_paths.updated_at AS updated_at,
    RANK() OVER (PARTITION BY source_paths.path, source_paths.source_uid ORDER BY bookmarks.id, slides.id) rank_number
  `
	orderBySql := " ORDER BY source_paths.path, source_paths.source_uid"
	templateSql := `
    SELECT
      %s
      %s
    FROM "slides"
    LEFT JOIN bookmarks ON slides.id = bookmarks.slide_id AND bookmarks.user_id = '%s'
    INNER JOIN files ON slides.file_uid = files.file_uid
		INNER JOIN (SELECT slides.file_uid, COUNT(*) as count FROM slides GROUP BY slides.file_uid) AS c ON c.file_uid = files.file_uid
    INNER JOIN source_paths ON source_paths.source_uid = files.source_uid AND source_paths.languages = files.languages
    WHERE TRUE
      AND '%s' = ANY(files.languages)
      AND source_paths.path ILIKE '%%%s%%'
      %s
  `
	hidden := ctx.Query("hidden")
	hiddenSql := ""
	if hidden != "true" {
		hiddenSql = "AND slides.hidden = FALSE"
	}
	querySql := fmt.Sprintf(templateSql,
		// DISTINCT will "choose" the first RANK() OVER, e.g., rank_number.
		"DISTINCT ON (source_paths.path, source_paths.source_uid)",
		fields, userId, language, keyword, hiddenSql)
	result := h.Database.Debug().WithContext(ctx).Raw(querySql + orderBySql).Scan(&paths)
	if result.Error != nil {
		log.Error(result.Error)
		ctx.JSON(http.StatusInternalServerError,
			getResponse(false, nil, result.Error.Error(), "Getting data has failed"))
		return
	}
	ctx.JSON(http.StatusOK, getResponse(true, paths, "", "Getting data has succeeded"))
}

// UpdateSourcePath updates the source_path field for a given source_uid
func (h *Handler) UpdateSourcePath(ctx *gin.Context) {
	sourcePathID := ctx.Param("id")

	// Define a struct to parse the JSON request body
	var req struct {
		SourcePath string `json:"source_path"`
	}

	// Bind JSON data to the request struct
	if err := ctx.ShouldBindJSON(&req); err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "Invalid JSON provided"})
		return
	}

	var uploadSourcePath int64
	result := h.Database.Debug().WithContext(ctx).
		Table(DBTableSourcePaths).
		Where("id = ?", sourcePathID).
		Where("source_uid LIKE 'upload_%'").
		Count(&uploadSourcePath)
	if result.Error != nil {
		log.Error(result.Error)
		ctx.JSON(http.StatusInternalServerError,
			getResponse(false, nil, result.Error.Error(), "Deleting slide data has failed"))
		return
	}
	if uploadSourcePath == 0 {
		errMsg := "Cannot update source path to archive sources."
		log.Error(errMsg)
		ctx.JSON(http.StatusBadRequest,
			getResponse(false, nil, errMsg, "Update source path has failed"))
		return
	}

	// Update the source_path in the database
	userId, _ := ctx.Get("user_id")
	updates := map[string]interface{}{
		"path":       req.SourcePath,
		"updated_by": userId,
		"updated_at": time.Now(),
	}
	result = h.Database.Debug().Model(&SourcePath{}).
		Where("id = ?", sourcePathID).
		Updates(updates)

	// Check if the update was successful
	if result.Error != nil || result.RowsAffected == 0 {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update source path"})
		return
	}

	// Respond with a success message
	ctx.JSON(http.StatusOK, gin.H{"success": true, "message": "Source path updated successfully"})
}

func (h *Handler) GetUserSettings(ctx *gin.Context) {
	userID, exists := ctx.Get("user_id")
	if !exists {
		ctx.JSON(http.StatusUnauthorized, getResponse(false, nil, "Unauthorized", "User ID is missing"))
		return
	}

	var count int64
	err := h.Database.Table("user_settings").
		Where("user_id = ?", userID).
		Count(&count).Error

	// If no record exists, return 404 Not Found
	if count == 0 {
		log.Error(fmt.Sprintf("User settings not found for user: %s.", userID))
		ctx.JSON(http.StatusNotFound, getResponse(false, nil, "User settings not found", "User settings do not exist"))
		return
	}

	var existingSettings string
	err = h.Database.Table("user_settings").
		Select("app_settings").
		Where("user_id = ?", userID).
		Limit(1).
		Scan(&existingSettings).Error

	if err != nil {
		log.Error(fmt.Sprintf("Failed to retrieve user settings: %v", err))
		ctx.JSON(http.StatusInternalServerError, getResponse(false, nil, err.Error(), "Failed to retrieve user settings"))
		return
	}

	// ✅ If `app_settings` is empty, return 404 (record exists but is empty)
	if existingSettings == "" {
		log.Error(fmt.Sprintf("User settings exist but `app_settings` is empty for user: %s.", userID))
		ctx.JSON(http.StatusNotFound, getResponse(false, nil, "User settings not found", "User settings exist but `app_settings` is empty"))
		return
	}

	// ✅ Parse JSON settings
	var parsedSettings map[string]interface{}
	if err := json.Unmarshal([]byte(existingSettings), &parsedSettings); err != nil {
		log.Error(fmt.Sprintf("JSON Unmarshal Error: %v", err))
		ctx.JSON(http.StatusInternalServerError, getResponse(false, nil, err.Error(), "Failed to parse user settings"))
		return
	}

	log.Info(fmt.Sprintf("User settings retrieved successfully for User: %s - %v", userID, parsedSettings))
	ctx.JSON(http.StatusOK, getResponse(true, parsedSettings, "", "User settings retrieved successfully"))
}

func (h *Handler) UpdateUserSettings(ctx *gin.Context) {
	userID, exists := ctx.Get("user_id")
	if !exists {
		ctx.JSON(http.StatusUnauthorized, getResponse(false, nil, "Unauthorized", "User ID is missing"))
		return
	}

	var requestData map[string]interface{}
	decoder := json.NewDecoder(ctx.Request.Body)
	decoder.DisallowUnknownFields() // Prevents invalid fields from being processed

	if err := decoder.Decode(&requestData); err != nil {
		log.Error(fmt.Sprintf("Invalid JSON format: %v", err))
		ctx.JSON(http.StatusBadRequest, getResponse(false, nil, err.Error(), "Invalid JSON format"))
		return
	}

	log.Info(fmt.Sprintf("🛠️ Received User Settings Update - UserID: %s, Data: %+v", userID, requestData))

	// Initialize a map for new merged settings
	var mergedSettings map[string]interface{}

	// Fetch existing settings if they exist
	var existingSettings string
	err := h.Database.Table("user_settings").
		Select("app_settings").
		Where("user_id = ?", userID).
		Limit(1).
		Scan(&existingSettings).Error

	if errors.Is(err, gorm.ErrRecordNotFound) {
		log.Info(fmt.Sprintf("No existing settings found. Creating new entry for user: %s", userID))
		mergedSettings = map[string]interface{}{}
	} else if err != nil {
		log.Error(fmt.Sprintf("Failed to retrieve user settings: %v", err))
		ctx.JSON(http.StatusInternalServerError, getResponse(false, nil, err.Error(), "Failed to retrieve user settings"))
		return
	} else {
		// Parse existing settings only if they exist and are not empty
		if existingSettings != "" {
			if err := json.Unmarshal([]byte(existingSettings), &mergedSettings); err != nil {
				log.Error(fmt.Sprintf("Failed to parse user settings: %v", err))
				ctx.JSON(http.StatusInternalServerError, getResponse(false, nil, err.Error(), "Failed to parse user settings"))
				return
			}
		} else {
			mergedSettings = map[string]interface{}{}
		}
	}

	// Merge new settings with existing settings, avoiding nil values
	for key, value := range requestData {
		if value != nil { // ✅ Only update non-nil values
			mergedSettings[key] = value
		}
	}

	// Convert updated settings to JSON
	mergedSettingsJSON, err := json.Marshal(mergedSettings)
	if err != nil {
		log.Error(fmt.Sprintf("Failed to encode user settings: %v", err))
		ctx.JSON(http.StatusInternalServerError, getResponse(false, nil, err.Error(), "Failed to encode user settings"))
		return
	}

	// Insert or update user settings
	err = h.Database.Exec(`
        INSERT INTO user_settings (user_id, app_settings, created_by, updated_by, updated_at)
        VALUES (?, ?, ?, ?, NOW())
        ON CONFLICT (user_id) DO UPDATE 
        SET app_settings = EXCLUDED.app_settings, 
            updated_by = EXCLUDED.updated_by,
            updated_at = NOW()`,
		userID, mergedSettingsJSON, userID, userID,
	).Error

	if err != nil {
		log.Error(fmt.Sprintf("Failed to update user settings: %v", err))
		ctx.JSON(http.StatusInternalServerError, getResponse(false, nil, err.Error(), "Failed to update user settings"))
		return
	}

	log.Info(fmt.Sprintf("User settings updated successfully for User: %s", userID))
	ctx.JSON(http.StatusOK, getResponse(true, nil, "", "User settings updated successfully"))
}

// For checking user role verification for the permissions (need to define user roles soon)

// func (h *Handler) roleChecker(role string) bool {
// 	return (userRole == role)
// }
// Get all slides with bookmarked info by user

func (h *Handler) Ready(ctx *gin.Context) {
	ctxWithTimeout, cancel := context.WithTimeout(ctx.Request.Context(), 10*time.Second)
	defer cancel()

	sqlDb, err := h.Database.DB()
	if err != nil {
		log.Error(fmt.Sprintf("Failed to get database: %v", err))
		ctx.JSON(http.StatusInternalServerError, getResponse(false, nil, err.Error(), "Failed to get database."))
		return
	}

	err = sqlDb.PingContext(ctxWithTimeout)
	if err != nil {
		log.Error(fmt.Sprintf("Failed to ping to database: %v", err))
		ctx.JSON(http.StatusInternalServerError, getResponse(false, nil, err.Error(), "Failed to ping database."))
		return
	}
	log.Info("Is ready?!")
	ctx.JSON(http.StatusOK, getResponse(true, nil, "", "Ready"))
}
