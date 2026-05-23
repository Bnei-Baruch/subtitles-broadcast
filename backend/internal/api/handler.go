package api

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"regexp"
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
	res := gin.H{
		responseSuccess:     success,
		responseData:        data,
		responseError:       err,
		responseDescription: description,
	}

	return res
}

func (h *Handler) AddSlides(ctx *gin.Context) {
	reqs := []*struct {
		FileUid     string `json:"file_uid"`
		Slide       string `json:"slide"`
		OrderNumber int    `json:"order_number"`
		LeftToRight bool   `json:"left_to_right"`
		SlideType   string `json:"slide_type"`
		Renderer    string `json:"renderer"`
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
			Renderer:    req.Renderer,
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
		Renderers   []string `json:"renderers"`
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
		UploadType: UploadFileSourceType,
		Languages:  pq.StringArray(req.Languages),
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
			Renderer:    req.Renderers[idx],
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
	channel := ctx.Query("channel")
	keyword := ctx.Query("keyword")
	hidden := ctx.Query("hidden")
	slides := []*SlideDetail{}
	if len(language) == 0 {
		ctx.JSON(http.StatusBadRequest,
			getResponse(false, nil, "Query language is missing", "Query language is missing"))
		return
	}
	if len(channel) == 0 {
		ctx.JSON(http.StatusBadRequest,
			getResponse(false, nil, "Query channel is missing", "Query channel is missing"))
		return
	}

	force_master := ""
	if ctx.Query("read_after_write") == "true" {
		force_master = "random(),"
	}

	query := h.Database.Debug().WithContext(ctx).
		Table(DBTableSlides).
		Joins("INNER JOIN files ON slides.file_uid = files.file_uid").
		Joins("INNER JOIN source_paths ON source_paths.source_uid = files.source_uid AND source_paths.languages = files.languages").
		Joins("LEFT JOIN bookmarks ON slides.id = bookmarks.slide_id AND bookmarks.language = ? AND bookmarks.channel = ?", language, channel).
		Where("? = ANY(files.languages)", language)
	if len(sourceUid) > 0 {
		query = query.Where("files.source_uid = ?", sourceUid)
	}
	if len(fileUid) > 0 {
		query = query.Where("files.file_uid = ?", fileUid)
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
	query = query.
		Select(fmt.Sprintf(`
			%s
			slides.*,
			source_paths.id AS source_path_id,
			source_paths.path AS source_path,
			CASE WHEN bookmarks.language = ? AND bookmarks.channel = ? THEN bookmarks.id END AS bookmark_id,
			files.source_uid,
			source_paths.languages,
			source_paths.path || ' / ' || slides.order_number + 1 AS slide_source_path
		`, force_master), language, channel).
		Order("slides.file_uid").Order("slides.order_number").Order("slides.updated_at").
		Count(&totalRows)

	if limit > 0 {
		query = query.Limit(limit).Offset(offset)
	}
	result = query.Find(&slides)
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

func (h *Handler) UpdateSlides(ctx *gin.Context) {
	reqs := []*struct {
		SlideID     uint   `json:"slide_id"`
		Slide       string `json:"slide"`
		OrderNumber int    `json:"order_number"`
		LeftToRight bool   `json:"left_to_right"`
		SlideType   string `json:"slide_type"`
		Renderer    string `json:"renderer"`
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
		value := fmt.Sprintf("(%d, ?, %d, %t, '%s', '%s')", req.SlideID, req.OrderNumber, req.LeftToRight, req.SlideType, req.Renderer)
		valuesQuery = append(valuesQuery, value)

		// Append Slide value to placeholders
		placeholders = append(placeholders, req.Slide)
	}

	withQuery := `
		WITH reqs(slide_id, slide, order_number, left_to_right, slide_type, renderer) AS
		(VALUES ` + strings.Join(valuesQuery, ", ") + ") "
	updateQuery := `UPDATE slides AS s SET
		slide = r.slide,
		order_number = r.order_number,
		left_to_right = r.left_to_right,
		slide_type = r.slide_type,
		renderer = r.renderer,
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

	var bookmarksToRemove []int64
	result := tx.Table(DBTableSlides).
		Select("bookmarks.id").
		Joins("INNER JOIN bookmarks ON slides.id = bookmarks.slide_id").
		Where("slides.id IN (?)", req.SlideIds).Find(&bookmarksToRemove)
	if result.Error != nil {
		log.Error(result.Error)
		ctx.JSON(http.StatusInternalServerError,
			getResponse(false, nil, result.Error.Error(), "Deleting slide data has failed"))
		return
	}
	if len(bookmarksToRemove) > 0 {
		if !req.ForceDeleteBookmarks {
			errMsg := "There are bookmarks refer to slide(id) in table to delete."
			log.Error(errMsg)
			ctx.JSON(http.StatusBadRequest,
				getResponse(false, nil, errMsg, "Deleting slide data has failed."))
			return
		}
		result = tx.Where("id IN (?)", bookmarksToRemove).Delete(&Bookmark{})
		if result.Error != nil {
			tx.Rollback()
			log.Error(result.Error)
			ctx.JSON(http.StatusInternalServerError,
				getResponse(false, nil, result.Error.Error(), "Failed to delete slides bookmarks."))
			return
		}
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
		Language             string `form:"language"`
		Type                 string `form:"type"`
	}{}
	if err := ctx.BindQuery(&queryParams); err != nil {
		log.Error(err)
		ctx.JSON(http.StatusInternalServerError,
			getResponse(false, nil, err.Error(), "Getting data has failed"))
		return
	}
	if len(queryParams.Language) == 0 && !queryParams.Forever && queryParams.Type != "karaoke" {
		msg := "Language must be set for deletion."
		log.Error(msg)
		ctx.JSON(http.StatusBadRequest, getResponse(false, nil, msg, msg))
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
	baseQuery := tx.Select("DISTINCT ON (slides.file_uid) slides.file_uid AS file_uid").
		Table(DBTableSlides).
		Joins("INNER JOIN files ON files.file_uid = slides.file_uid AND files.source_uid = ?", sourceUid)
	if len(queryParams.Language) > 0 {
		baseQuery = baseQuery.Where("? = ANY(files.languages)", queryParams.Language)
	}
	if !queryParams.ForceDeleteBookmarks {
		result := baseQuery.Joins("INNER JOIN bookmarks ON slides.id = bookmarks.slide_id").Find(&fileUids)
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
	query := baseQuery
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
		result = tx.
			Where("file_uid in ?", fileUids).
			Delete(&Slide{})
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

	fileQuery := tx.Where("source_uid = ?", sourceUid)
	if len(queryParams.Language) > 0 {
		fileQuery = fileQuery.Where("? = ANY(languages)", queryParams.Language)
	}
	if queryParams.Forever {
		result = fileQuery.Delete(&File{})
	} else {
		result = fileQuery.Model(&File{}).Updates(updates)
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

	if queryParams.ForceDeleteBookmarks && len(fileUids) > 0 {
		if err := tx.Where("file_uid IN ? AND type = 'karaoke'", fileUids).Delete(&Bookmark{}).Error; err != nil {
			log.Error(err)
			ctx.JSON(http.StatusInternalServerError,
				getResponse(false, nil, err.Error(), "Removing song from setlists has failed"))
			return
		}
	}

	if queryParams.Forever {
		spQuery := tx.Where("source_uid = ?", sourceUid)
		if len(queryParams.Language) > 0 {
			spQuery = spQuery.Where("? = ANY(languages)", queryParams.Language)
		}
		result = spQuery.Delete(&SourcePath{})
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

func (h *Handler) AddOrUpdateBookmark(ctx *gin.Context) {
	userId, _ := ctx.Get("user_id")
	req := struct {
		Language    string `json:"language"`
		Channel     string `json:"channel"`
		Preset      string `json:"preset"`
		FileUid     string `json:"file_uid"`
		SlideId     int    `json:"slide_id"`
		Update      bool   `json:"update"`
		OrderNumber *int   `json:"order_number"`
		Type        string `json:"type"`
	}{}
	err := ctx.BindJSON(&req)
	if err != nil {
		log.Error(err)
		ctx.JSON(http.StatusBadRequest, getResponse(false, nil, err.Error(), "Binding data has failed"))
		return
	}
	if len(req.Channel) == 0 {
		ctx.JSON(http.StatusBadRequest,
			getResponse(false, nil, "Query channel is missing", "Query channel is missing"))
		return
	}
	if req.Type == "" {
		req.Type = "subtitles"
	}

	bookmark := Bookmark{}

	if req.Type == "karaoke" {
		if req.Update {
			now := time.Now()
			if err = h.Database.WithContext(ctx).Exec(
				`UPDATE bookmarks SET slide_id = ?, updated_at = ?, updated_by = ?
				 WHERE file_uid = ? AND channel = ? AND preset = ? AND type = 'karaoke'`,
				req.SlideId, now, userId.(string), req.FileUid, req.Channel, req.Preset,
			).Error; err != nil {
				log.Error(err)
				ctx.JSON(http.StatusInternalServerError, getResponse(false, nil, err.Error(), "Updating setlist slide has failed"))
				return
			}
			h.Database.WithContext(ctx).Table(DBTableBookmarks).
				Where("file_uid = ? AND channel = ? AND preset = ? AND type = 'karaoke'", req.FileUid, req.Channel, req.Preset).
				First(&bookmark)
		} else {
			var firstSlideId int
			h.Database.WithContext(ctx).Raw(
				"SELECT id FROM slides WHERE file_uid = ? AND slide_type = 'karaoke' ORDER BY order_number ASC LIMIT 1",
				req.FileUid,
			).Scan(&firstSlideId)

			var maxOrder int
			h.Database.WithContext(ctx).Table(DBTableBookmarks).
				Where("channel = ? AND preset = ? AND type = 'karaoke'", req.Channel, req.Preset).
				Select("COALESCE(MAX(order_number), -1)").
				Scan(&maxOrder)

			now := time.Now()
			bookmark.Type = "karaoke"
			bookmark.Language = ""
			bookmark.Channel = req.Channel
			bookmark.Preset = req.Preset
			bookmark.SlideId = firstSlideId
			bookmark.FileUid = req.FileUid
			bookmark.OrderNumber = maxOrder + 1
			bookmark.CreatedAt = now
			bookmark.CreatedBy = userId.(string)
			bookmark.UpdatedAt = now
			bookmark.UpdatedBy = userId.(string)
			if err = h.Database.Create(&bookmark).Error; err != nil {
				log.Error(err)
				if pgErr, ok := err.(*pgconn.PgError); ok && pgErr.Code == ERR_UNIQUE_VIOLATION_CODE {
					ctx.JSON(http.StatusBadRequest, getResponse(false, nil, err.Error(), "Song already in setlist for this channel and preset"))
					return
				}
				ctx.JSON(http.StatusInternalServerError, getResponse(false, nil, err.Error(), "Adding to setlist has failed"))
				return
			}
		}
		ctx.JSON(http.StatusOK, getResponse(true, bookmark, "", "Setlist updated"))
		return
	}

	// --- subtitles bookmark ---
	if len(req.Language) == 0 {
		ctx.JSON(http.StatusBadRequest,
			getResponse(false, nil, "Query language is missing", "Query language is missing"))
		return
	}
	if req.Update {
		updateOrder := ""
		placeholders := []interface{}{req.SlideId}
		if req.OrderNumber != nil {
			placeholders = append(placeholders, *req.OrderNumber)
			updateOrder = "order_number = ?,"
		}
		placeholders = append(placeholders, time.Now(), userId.(string), req.FileUid, req.Language, req.Channel, req.Preset)
		updateQuery := fmt.Sprintf(`UPDATE bookmarks
			 SET slide_id = ?,
			 %s
			 updated_at = ?,
			 updated_by = ?
			 WHERE file_uid = ?
			 AND language = ?
			 AND channel = ?
			 AND preset = ?`, updateOrder)
		result := h.Database.Debug().WithContext(ctx).Exec(updateQuery, placeholders...).Table(DBTableBookmarks).
			Select("*").
			Where("file_uid = ? AND language = ? AND channel = ? AND preset = ?", req.FileUid, req.Language, req.Channel, req.Preset).
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
		bookmark.Type = "subtitles"
		bookmark.Language = req.Language
		bookmark.Channel = req.Channel
		bookmark.Preset = req.Preset
		bookmark.SlideId = req.SlideId
		bookmark.FileUid = req.FileUid
		bookmark.OrderNumber = *req.OrderNumber
		bookmark.CreatedAt = now
		bookmark.CreatedBy = userId.(string)
		bookmark.UpdatedAt = now
		bookmark.UpdatedBy = userId.(string)
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
					getResponse(false, nil, err.Error(), "The bookmark with the same file, language and channel already exist."))
				return
			}
			ctx.JSON(http.StatusInternalServerError, getResponse(false, nil, err.Error(), "Adding bookmark has failed"))
			return
		}
	}
	ctx.JSON(http.StatusOK, getResponse(true, bookmark, "", "Adding bookmark data has succeeded"))
}

func (h *Handler) GetBookmarks(ctx *gin.Context) {
	channel := ctx.Query("channel")
	if len(channel) == 0 {
		ctx.JSON(http.StatusBadRequest,
			getResponse(false, nil, "Query channel is missing", "Query channel is missing"))
		return
	}

	bookmarkType := ctx.DefaultQuery("type", "subtitles")

	if bookmarkType == "karaoke" {
		type karaokeRow struct {
			ID          uint      `json:"id"`
			FileUid     string    `json:"file_uid"`
			OrderNumber int       `json:"order_number"`
			Channel     string    `json:"channel"`
			Filename    string    `json:"filename"`
			SlideCount  int       `json:"slide_count"`
			CreatedAt   time.Time `json:"created_at"`
			CreatedBy   string    `json:"created_by"`
		}
		karaokePreset := ctx.Query("preset")
		var items []karaokeRow
		result := h.Database.WithContext(ctx).
			Select("b.id, b.file_uid, b.order_number, b.channel, b.created_at, b.created_by, f.filename, COUNT(s.id) as slide_count").
			Table(DBTableBookmarks+" b").
			Joins("INNER JOIN "+DBTableFiles+" f ON f.file_uid = b.file_uid").
			Joins("LEFT JOIN "+DBTableSlides+" s ON s.file_uid = b.file_uid AND s.slide_type IN ('karaoke','karaoke_separator')").
			Where("b.channel = ? AND b.type = 'karaoke' AND b.preset = ?", channel, karaokePreset).
			Group("b.id, b.file_uid, b.order_number, b.channel, b.created_at, b.created_by, f.filename").
			Order("b.order_number ASC").
			Find(&items)
		if result.Error != nil {
			log.Error(result.Error)
			ctx.JSON(http.StatusInternalServerError, getResponse(false, nil, result.Error.Error(), "Getting data has failed"))
			return
		}
		if items == nil {
			items = []karaokeRow{}
		}
		ctx.JSON(http.StatusOK, getResponse(true, items, "", "Getting data has succeeded"))
		return
	}

	language := ctx.Query("language")
	if len(language) == 0 {
		ctx.JSON(http.StatusBadRequest,
			getResponse(false, nil, "Query language is missing", "Query language is missing"))
		return
	}
	preset := ctx.Query("preset")
	force_master := ""
	if ctx.Query("read_after_write") == "true" {
		force_master = "random(),"
	}
	result := []struct {
		Slide_Id     uint   `json:"slide_id"`
		BookmarkId   uint   `json:"bookmark_id"`
		BookmarkPath string `json:"bookmark_path"`
		OrderNumber  int    `json:"order_number"`
		FileUid      string `json:"file_uid"`
	}{}
	query := h.Database.Debug().WithContext(ctx).
		Select(fmt.Sprintf(" %s bookmarks.slide_id AS slide_id, bookmarks.order_number AS order_number, bookmarks.id AS bookmark_id, source_paths.path || ' / ' || slides.order_number+1 AS bookmark_path, files.file_uid AS file_uid", force_master)).
		Table(DBTableBookmarks).
		Joins("INNER JOIN slides ON bookmarks.slide_id = slides.id").
		Joins("INNER JOIN files ON slides.file_uid = files.file_uid").
		Joins("INNER JOIN source_paths ON files.source_uid = source_paths.source_uid AND source_paths.languages = files.languages AND ? = ANY(files.languages)", language).
		Where("bookmarks.language = ? AND bookmarks.channel = ? AND bookmarks.preset = ? AND bookmarks.type = 'subtitles'", language, channel, preset).
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

func (h *Handler) ReorderBookmarks(ctx *gin.Context) {
	reqs := []struct {
		ID          uint `json:"id"`
		OrderNumber int  `json:"order_number"`
	}{}
	if err := ctx.BindJSON(&reqs); err != nil {
		ctx.JSON(http.StatusBadRequest, getResponse(false, nil, err.Error(), "Binding data has failed"))
		return
	}

	tx := h.Database.Debug().WithContext(ctx).Begin()
	if tx.Error != nil {
		ctx.JSON(http.StatusInternalServerError, getResponse(false, nil, tx.Error.Error(), "Creating transaction has failed"))
		return
	}

	now := time.Now()
	for _, req := range reqs {
		if err := tx.Model(&Bookmark{}).Where("id = ?", req.ID).Updates(map[string]interface{}{
			"order_number": req.OrderNumber,
			"updated_at":   now,
		}).Error; err != nil {
			tx.Rollback()
			ctx.JSON(http.StatusInternalServerError, getResponse(false, nil, err.Error(), "Reordering bookmarks has failed"))
			return
		}
	}
	if err := tx.Commit().Error; err != nil {
		ctx.JSON(http.StatusInternalServerError, getResponse(false, nil, err.Error(), "Committing transaction has failed"))
		return
	}
	ctx.JSON(http.StatusOK, getResponse(true, nil, "", "Bookmarks reordered"))
}

func (h *Handler) GetBookmarkPresets(ctx *gin.Context) {
	channel := ctx.Query("channel")
	if len(channel) == 0 {
		ctx.JSON(http.StatusBadRequest,
			getResponse(false, nil, "Query channel is missing", "Query channel is missing"))
		return
	}
	bookmarkType := ctx.DefaultQuery("type", "subtitles")
	var presets []string
	if bookmarkType == "karaoke" {
		rows, err := h.Database.WithContext(ctx).Raw(`
			SELECT preset FROM bookmark_presets WHERE channel = ? AND type = 'karaoke'
			UNION
			SELECT DISTINCT preset FROM bookmarks WHERE channel = ? AND type = 'karaoke'
			ORDER BY preset
		`, channel, channel).Rows()
		if err != nil {
			log.Error(err)
			ctx.JSON(http.StatusInternalServerError,
				getResponse(false, nil, err.Error(), "Getting bookmark presets has failed"))
			return
		}
		defer rows.Close()
		for rows.Next() {
			var p string
			if scanErr := rows.Scan(&p); scanErr == nil {
				presets = append(presets, p)
			}
		}
		if presets == nil {
			presets = []string{}
		}
		ctx.JSON(http.StatusOK, getResponse(true, presets, "", "Getting data has succeeded"))
		return
	} else {
		language := ctx.Query("language")
		if len(language) == 0 {
			ctx.JSON(http.StatusBadRequest,
				getResponse(false, nil, "Query language is missing", "Query language is missing"))
			return
		}
		rows, err := h.Database.WithContext(ctx).Raw(`
			SELECT preset FROM bookmark_presets WHERE channel = ? AND type = 'subtitles'
			UNION
			SELECT DISTINCT preset FROM bookmarks WHERE language = ? AND channel = ? AND type = 'subtitles'
			ORDER BY preset
		`, channel, language, channel).Rows()
		if err != nil {
			log.Error(err)
			ctx.JSON(http.StatusInternalServerError,
				getResponse(false, nil, err.Error(), "Getting bookmark presets has failed"))
			return
		}
		defer rows.Close()
		for rows.Next() {
			var p string
			if scanErr := rows.Scan(&p); scanErr == nil {
				presets = append(presets, p)
			}
		}
		if presets == nil {
			presets = []string{}
		}
		ctx.JSON(http.StatusOK, getResponse(true, presets, "", "Getting data has succeeded"))
		return
	}
}

func (h *Handler) DeleteBookmark(ctx *gin.Context) {
	bookmarkIdInt, err := strconv.Atoi(ctx.Param("bookmark_id"))
	if err != nil {
		log.Error(err)
		ctx.JSON(http.StatusBadRequest, getResponse(false, nil, err.Error(), "Bookmark ID must be an integer"))
		return
	}
	result := h.Database.WithContext(ctx).Where("id = ?", bookmarkIdInt).Delete(&Bookmark{})
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

func (h *Handler) CreateBookmarkPreset(ctx *gin.Context) {
	req := struct {
		Channel string `json:"channel"`
		Preset  string `json:"preset"`
		Type    string `json:"type"`
	}{}
	if err := ctx.BindJSON(&req); err != nil {
		ctx.JSON(http.StatusBadRequest, getResponse(false, nil, err.Error(), "Binding data has failed"))
		return
	}
	if req.Channel == "" || req.Preset == "" {
		ctx.JSON(http.StatusBadRequest, getResponse(false, nil, "channel and preset are required", "channel and preset are required"))
		return
	}
	if req.Type == "" {
		req.Type = "subtitles"
	}
	kp := BookmarkPreset{Channel: req.Channel, Preset: req.Preset, Type: req.Type}
	result := h.Database.WithContext(ctx).
		Where(BookmarkPreset{Channel: req.Channel, Preset: req.Preset, Type: req.Type}).
		FirstOrCreate(&kp)
	if result.Error != nil {
		log.Error(result.Error)
		ctx.JSON(http.StatusInternalServerError, getResponse(false, nil, result.Error.Error(), "Creating preset has failed"))
		return
	}
	ctx.JSON(http.StatusOK, getResponse(true, nil, "", "Preset created"))
}

func (h *Handler) DeleteBookmarkPreset(ctx *gin.Context) {
	channel := ctx.Query("channel")
	preset := ctx.Query("preset")
	bookmarkType := ctx.DefaultQuery("type", "subtitles")
	if len(channel) == 0 || len(preset) == 0 {
		ctx.JSON(http.StatusBadRequest, getResponse(false, nil, "channel and preset are required", "channel and preset are required"))
		return
	}
	result := h.Database.WithContext(ctx).
		Where("channel = ? AND preset = ? AND type = ?", channel, preset, bookmarkType).
		Delete(&Bookmark{})
	if result.Error != nil {
		log.Error(result.Error)
		ctx.JSON(http.StatusInternalServerError, getResponse(false, nil, result.Error.Error(), "Deleting preset has failed"))
		return
	}
	h.Database.WithContext(ctx).
		Where("channel = ? AND preset = ? AND type = ?", channel, preset, bookmarkType).
		Delete(&BookmarkPreset{})
	ctx.JSON(http.StatusOK, getResponse(true, nil, "", "Preset deleted"))
}

func (h *Handler) RenameBookmarkPreset(ctx *gin.Context) {
	req := struct {
		Channel   string `json:"channel"`
		Preset    string `json:"preset"`
		NewPreset string `json:"new_preset"`
		Type      string `json:"type"`
	}{}
	if err := ctx.BindJSON(&req); err != nil {
		ctx.JSON(http.StatusBadRequest, getResponse(false, nil, err.Error(), "Binding data has failed"))
		return
	}
	if req.Channel == "" || req.Preset == "" || req.NewPreset == "" {
		ctx.JSON(http.StatusBadRequest, getResponse(false, nil, "channel, preset, new_preset are required", "channel, preset, new_preset are required"))
		return
	}
	if req.Type == "" {
		req.Type = "subtitles"
	}
	var existingCount int64
	h.Database.WithContext(ctx).Table(DBTableBookmarks).
		Where("channel = ? AND preset = ? AND type = ?", req.Channel, req.NewPreset, req.Type).
		Count(&existingCount)
	if existingCount > 0 {
		ctx.JSON(http.StatusConflict, getResponse(false, nil, "target preset already exists", "A preset with that name already exists"))
		return
	}
	result := h.Database.WithContext(ctx).
		Table(DBTableBookmarks).
		Where("channel = ? AND preset = ? AND type = ?", req.Channel, req.Preset, req.Type).
		Update("preset", req.NewPreset)
	if result.Error != nil {
		log.Error(result.Error)
		ctx.JSON(http.StatusInternalServerError, getResponse(false, nil, result.Error.Error(), "Renaming preset has failed"))
		return
	}
	h.Database.WithContext(ctx).
		Model(&BookmarkPreset{}).
		Where("channel = ? AND preset = ? AND type = ?", req.Channel, req.Preset, req.Type).
		Update("preset", req.NewPreset)
	ctx.JSON(http.StatusOK, getResponse(true, nil, "", "Preset renamed"))
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

/*
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
*/

func (h *Handler) GetSourcePath(ctx *gin.Context) {
	type SourcePathData struct {
		SlideID      uint           `json:"slide_id"`
		SlidesCount  uint           `json:"slides_count"`
		BookmarkID   *string        `json:"bookmark_id"`
		SourceUID    string         `json:"source_uid"`
		SourcePathID uint           `json:"source_path_id"`
		FileUID      string         `json:"file_uid"`
		Filename     string         `json:"filename"`
		Languages    pq.StringArray `json:"languages" gorm:"type:text[]"`
		Path         string         `json:"path"`
		SourceType   string         `json:"source_type"`
		SourceGroup  string         `json:"source_group"`
		Hidden       bool           `json:"hidden"`
		CreatedBy    string         `json:"created_by"`
		CreatedAt    time.Time      `json:"created_at"`
		UpdatedBy    string         `json:"updated_by"`
		UpdatedAt    time.Time      `json:"updated_at"`
		HasQuestions bool           `json:"has_questions"`
		HasSubtitles bool           `json:"has_subtitles"`
	}
	paths := []*SourcePathData{}

	_, isKaraokeQuery := ctx.GetQuery("source_type")
	if isKaraokeQuery {
		// Karaoke path: filter by source_type='karaoke', optionally narrow by source_group
		sourceGroup := ctx.Query("source_group")
		keyword := ctx.Query("keyword")
		showHidden := ctx.Query("show_hidden") == "true"
		filesJoin := "INNER JOIN " + DBTableFiles + " f ON f.file_uid = sp.source_uid"
		if !showHidden {
			filesJoin += " AND f.hidden = FALSE"
		}
		slidesJoin := "LEFT JOIN " + DBTableSlides + " s ON s.file_uid = f.file_uid"
		if !showHidden {
			slidesJoin += " AND s.hidden = FALSE"
		}
		query := h.Database.Debug().WithContext(ctx).
			Table(DBTableSourcePaths+" sp").
			Select(`sp.id AS source_path_id,
				sp.source_uid AS source_uid,
				sp.path AS path,
				sp.source_type AS source_type,
				sp.source_group AS source_group,
				sp.languages AS languages,
				sp.created_by AS created_by,
				sp.created_at AS created_at,
				sp.updated_by AS updated_by,
				sp.updated_at AS updated_at,
				f.file_uid AS file_uid,
				f.filename AS filename,
				f.hidden AS hidden,
				COUNT(s.id) AS slides_count`).
			Joins(filesJoin).
			Joins(slidesJoin).
			Where("sp.source_type = 'karaoke'").
			Group("sp.id, sp.source_uid, sp.path, sp.source_type, sp.source_group, sp.languages, sp.created_by, sp.created_at, sp.updated_by, sp.updated_at, f.file_uid, f.filename, f.hidden").
			Order("sp.path")
		if sourceGroup != "" {
			query = query.Where("sp.source_group = ?", sourceGroup)
		}
		if keyword != "" {
			query = query.Where(
				"(sp.path ILIKE ? OR EXISTS (SELECT 1 FROM "+DBTableSlides+" ks WHERE ks.file_uid = f.file_uid AND ks.slide ILIKE ?))",
				"%"+keyword+"%", "%"+keyword+"%",
			)
		}
		result := query.Find(&paths)
		if result.Error != nil {
			log.Error(result.Error)
			ctx.JSON(http.StatusInternalServerError,
				getResponse(false, nil, result.Error.Error(), "Getting data has failed"))
			return
		}
		ctx.JSON(http.StatusOK, getResponse(true, paths, "", "Getting data has succeeded"))
		return
	}

	language := ctx.Query("language")
	channel := ctx.Query("channel")
	if len(language) == 0 {
		ctx.JSON(http.StatusBadRequest,
			getResponse(false, nil, "", "language is needed"))
		return
	}
	if len(channel) == 0 {
		ctx.JSON(http.StatusBadRequest,
			getResponse(false, nil, "", "channel is needed"))
		return
	}
	force_master := ""
	if ctx.Query("read_after_write") == "true" {
		force_master = "random(),"
	}
	keyword := ctx.Query("keyword")
	fields := `
		slides.id AS slide_id,
		c.count as slides_count,
		bookmarks.id AS bookmark_id,
		source_paths.source_uid AS source_uid,
		files.file_uid AS file_uid,
		source_paths.languages AS languages,
		source_paths.path AS path,
		source_paths.source_type AS source_type,
		slides.hidden AS hidden,source_paths.created_by AS created_by,
		source_paths.created_at AS created_at,
		source_paths.updated_by AS updated_by,
		source_paths.updated_at AS updated_at,
		st.has_questions AS has_questions,
		st.has_subtitles AS has_subtitles,
		RANK() OVER (PARTITION BY source_paths.path, source_paths.source_uid ORDER BY bookmarks.id, slides.id) rank_number
	`
	orderBySql := " ORDER BY source_paths.path, source_paths.source_uid"
	templateSql := `
		SELECT
			%s
			%s
			%s
		FROM "slides"
		LEFT JOIN bookmarks ON slides.id = bookmarks.slide_id AND bookmarks.language = ? AND bookmarks.channel = ?
		INNER JOIN files ON slides.file_uid = files.file_uid
		INNER JOIN (SELECT slides.file_uid, COUNT(*) as count FROM slides GROUP BY slides.file_uid) AS c ON c.file_uid = files.file_uid
		INNER JOIN source_paths ON source_paths.source_uid = files.source_uid AND source_paths.languages = files.languages
		LEFT JOIN (
			SELECT files.source_uid, files.languages,
				BOOL_OR(slides.slide_type = 'question') AS has_questions,
				BOOL_OR(slides.slide_type != 'question' OR slides.slide_type IS NULL) AS has_subtitles
			FROM slides
			INNER JOIN files ON slides.file_uid = files.file_uid
			WHERE slides.hidden = FALSE
			GROUP BY files.source_uid, files.languages
		) AS st ON st.source_uid = source_paths.source_uid AND st.languages = source_paths.languages
		WHERE TRUE
			AND ? = ANY(files.languages)
			AND source_paths.path ILIKE ?
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
		force_master, fields, hiddenSql)
	result := h.Database.WithContext(ctx).Raw(querySql+orderBySql, language, channel, language, "%"+keyword+"%").Scan(&paths)
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
		Where("source_type = 'karaoke'").
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
//   return (userRole == role)
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
