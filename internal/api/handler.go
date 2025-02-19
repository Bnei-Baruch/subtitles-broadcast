package api

import (
	"encoding/json"
	"errors"
	"fmt"
	"math"
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
	page, listLimit, offset, err := getPaginationParams(ctx)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, getResponse(false, nil, err.Error(), "Getting data has failed"))
		return
	}
	var totalRows int64
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
	if len(keyword) > 0 {
		if ctx.FullPath() == "/api/v1/file_slide" {
			query.Where("slides.slide LIKE ?", "%"+keyword+"%")
		} else {
			query.Where("(slides.slide LIKE ? OR source_paths.path LIKE ?)", "%"+keyword+"%", "%"+keyword+"%")
		}
	}
	if hidden != "true" {
		query = query.Where("slides.hidden = FALSE")
	}
	result := query.Count(&totalRows).Limit(listLimit).Offset(offset).Find(&slides)
	if result.Error != nil {
		log.Error(result.Error)
		ctx.JSON(http.StatusInternalServerError,
			getResponse(false, nil, result.Error.Error(), "Getting data has failed"))
		return

	}

	ctx.JSON(http.StatusOK,
		getResponse(true,
			constructResponsePagination(page, listLimit, totalRows, slides),
			"", "Getting data has succeeded"))
}

// constructSlideQuery constructs the slide query based on user, fileUID, and keyword
func (h *Handler) constructSlideQuery(ctx *gin.Context, userId interface{}) *gorm.DB {
	return h.Database.Debug().WithContext(ctx).
		Table(DBTableSlides).
		Select("slides.*, source_paths.id AS source_path_id, source_paths.path AS source_path, CASE WHEN bookmarks.user_id = ? THEN bookmarks.id END AS bookmark_id, files.source_uid, source_paths.languages, source_paths.path || ' / ' || slides.order_number+1 AS slide_source_path", userId).
		Joins("INNER JOIN files ON slides.file_uid = files.file_uid").
		Joins("INNER JOIN source_paths ON source_paths.source_uid = files.source_uid AND source_paths.languages = files.languages").
		Joins("LEFT JOIN bookmarks ON slides.id = bookmarks.slide_id AND bookmarks.user_id = ?", userId).
		Order("slides.file_uid").Order("order_number").Order("created_at")
}

// getPaginationParams extracts pagination parameters from the context
func getPaginationParams(ctx *gin.Context) (int, int, int, error) {
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
		log.Error(err)
		return 0, 0, 0, err
	}
	if limit > 0 {
		listLimit = limit
	}
	if page > 1 {
		offset = listLimit * (page - 1)
	}

	return page, listLimit, offset, nil
}

// constructResponsePagination constructs the pagination response
func constructResponsePagination(page, listLimit int, totalRows int64, slides []*SlideDetail) interface{} {
	return struct {
		Pagination *Pagination    `json:"pagination"`
		Slides     []*SlideDetail `json:"slides"`
	}{
		Pagination: &Pagination{
			Limit:      listLimit,
			Page:       page,
			TotalRows:  totalRows,
			TotalPages: int(math.Ceil(float64(totalRows) / float64(listLimit))),
		},
		Slides: slides,
	}
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
		ForceDeleteBookmarks bool `form:"force_delete_bookmarks"`
	}{}
	if err := ctx.BindQuery(&queryParams); err != nil {
		log.Error(err)
		ctx.JSON(http.StatusInternalServerError,
			getResponse(false, nil, err.Error(), "Getting data has failed"))
		return
	}

	sourceUid := ctx.Param("source_uid")
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

	// We don't delete, we hide the slides.
	// result = tx.Where("file_uid in ?", fileUids).Delete(&Slide{})
	userId, _ := ctx.Get("user_id")
	updates := map[string]interface{}{
		"hidden":     true,
		"updated_by": userId,
		"updated_at": time.Now(),
	}
	result = tx.Model(&Slide{}).
		Where("file_uid in ?", fileUids).
		Updates(updates)
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
	// We don't delete, we hide the file.
	// result = tx.Where("source_uid = ?", sourceUid).Delete(&File{})
	result = tx.Model(&File{}).
		Where("source_uid = ?", sourceUid).
		Updates(updates)
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
	// When hiding slides and files, we don't need to delete or hide source paths.
	// result = tx.Where("source_uid = ?", sourceUid).Delete(&SourcePath{})
	// if result.Error != nil {
	// 	log.Error(result.Error)
	// 	ctx.JSON(http.StatusInternalServerError,
	// 		getResponse(false, nil, result.Error.Error(), "Deleting file slide data has failed"))
	// 	return
	// }
	// if result.RowsAffected == 0 {
	// 	ctx.JSON(http.StatusBadRequest,
	// 		getResponse(false, nil, fmt.Sprintf("No source path with souruce uid %s", sourceUid), fmt.Sprintf("No source path with source uid %s", sourceUid)))
	// 	return
	// }
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
		FileUid string `json:"file_uid"`
		SlideId int    `json:"slide_id"`
		Update  bool   `json:"update"`
		Order   int    `json:"order"`
	}{}
	err := ctx.BindJSON(&req)
	if err != nil {
		log.Error(err)
		ctx.JSON(http.StatusBadRequest, getResponse(false, nil, err.Error(), "Binding data has failed"))
		return
	}
	bookmark := Bookmark{}
	if req.Update {
		result := h.Database.Debug().WithContext(ctx).Exec(
			`UPDATE bookmarks
			 SET slide_id = ?,
			 order_number = ?,
			 updated_at = ?
			 WHERE file_uid = ?
			 AND user_id = ?`,
			req.SlideId, req.Order, time.Now(), req.FileUid, userId.(string),
		).Table(DBTableBookmarks).
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
		now := time.Now()
		bookmark.SlideId = req.SlideId
		bookmark.FileUid = req.FileUid
		bookmark.UserId = userId.(string)
		bookmark.OrderNumber = req.Order
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
		Order        int    `json:"order"`
		FileUid      string `json:"file_uid"`
	}{}
	query := h.Database.Debug().WithContext(ctx).
		Select("bookmarks.slide_id AS slide_id, bookmarks.order_number AS order, bookmarks.id AS bookmark_id, source_paths.path || ' / ' || slides.order_number+1 AS bookmark_path, files.file_uid AS file_uid").
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
	page, listLimit, offset, err := getPaginationParams(ctx)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, getResponse(false, nil, err.Error(), "Getting data has failed"))
		return
	}
	var totalRows int64
	type SourcePathData struct {
		SlideID    uint           `json:"slide_id"`
		BookmarkID *string        `json:"bookmark_id"`
		SourceUID  string         `json:"source_uid"`
		FileUID    string         `json:"file_uid"`
		Languages  pq.StringArray `json:"languages" gorm:"type:text[]"`
		Path       string         `json:"path"`
	}
	paths := []*SourcePathData{}
	limitSql := fmt.Sprintf(" LIMIT %d", listLimit)
	offsetSql := fmt.Sprintf(" OFFSET %d", offset)
	fields := `
    slides.id AS slide_id,
    bookmarks.id AS bookmark_id,
    source_paths.source_uid AS source_uid,
    files.file_uid AS file_uid,
    source_paths.languages AS languages,
    source_paths.path AS path,
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
		"DISTINCT ON (source_paths.path, source_paths.source_uid)",
		fields, userId, language, keyword, hiddenSql)
	countQuerySql := fmt.Sprintf(templateSql,
		"COUNT(DISTINCT (source_paths.path, source_paths.source_uid))",
		"", userId, language, keyword, hiddenSql)
	// Count total.
	h.Database.Debug().WithContext(ctx).Raw(countQuerySql).Scan(&totalRows)
	// Get specific page.
	result := h.Database.Debug().WithContext(ctx).Raw(
		querySql + orderBySql + limitSql + offsetSql).Scan(&paths)
	if result.Error != nil {
		log.Error(result.Error)
		ctx.JSON(http.StatusInternalServerError,
			getResponse(false, nil, result.Error.Error(), "Getting data has failed"))
		return
	}
	sourcePathList := struct {
		Pagination *Pagination       `json:"pagination"`
		Paths      []*SourcePathData `json:"paths"`
	}{
		Pagination: &Pagination{
			Limit:      listLimit,
			Page:       page,
			TotalRows:  totalRows,
			TotalPages: int(math.Ceil(float64(totalRows) / float64(listLimit))),
		},
		Paths: paths,
	}
	ctx.JSON(http.StatusOK,
		getResponse(true,
			sourcePathList,
			"", "Getting data has succeeded"))
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

	// ✅ If no record exists, return 404 Not Found
	if count == 0 {
		log.Printf("❌ No user settings record found for user: %s.", userID)
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
		log.Printf("❌ Error fetching user settings: %v", err)
		ctx.JSON(http.StatusInternalServerError, getResponse(false, nil, err.Error(), "Failed to retrieve user settings"))
		return
	}

	// ✅ If `app_settings` is empty, return 404 (record exists but is empty)
	if existingSettings == "" {
		log.Printf("❌ User settings exist but `app_settings` is empty for user: %s.", userID)
		ctx.JSON(http.StatusNotFound, getResponse(false, nil, "User settings not found", "User settings do not exist"))
		return
	}

	// ✅ Parse JSON settings
	var parsedSettings map[string]interface{}
	if err := json.Unmarshal([]byte(existingSettings), &parsedSettings); err != nil {
		log.Printf("❌ JSON Unmarshal Error: %v", err)
		ctx.JSON(http.StatusInternalServerError, getResponse(false, nil, err.Error(), "Failed to parse user settings"))
		return
	}

	log.Printf("✅ Retrieved User Settings for User: %s - %v", userID, parsedSettings)
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
		log.Printf("❌ JSON Decoding Error: %v", err)
		ctx.JSON(http.StatusBadRequest, getResponse(false, nil, err.Error(), "Invalid JSON format"))
		return
	}

	log.Printf("🛠️ Received User Settings Update - UserID: %s, Data: %+v", userID, requestData)

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
		log.Printf("⚠️ No existing settings found. Creating new entry for user: %s", userID)
		mergedSettings = map[string]interface{}{}
	} else if err != nil {
		log.Printf("❌ Error fetching existing user settings: %v", err)
		ctx.JSON(http.StatusInternalServerError, getResponse(false, nil, err.Error(), "Failed to retrieve user settings"))
		return
	} else {
		// Parse existing settings only if they exist and are not empty
		if existingSettings != "" {
			if err := json.Unmarshal([]byte(existingSettings), &mergedSettings); err != nil {
				log.Printf("❌ JSON Unmarshal Error: %v", err)
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
		log.Printf("❌ JSON Marshal Error: %v", err)
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
		log.Printf("❌ Error Updating User Settings: %v", err)
		ctx.JSON(http.StatusInternalServerError, getResponse(false, nil, err.Error(), "Failed to update user settings"))
		return
	}

	log.Printf("✅ User Settings Successfully Updated for User: %s", userID)
	ctx.JSON(http.StatusOK, getResponse(true, nil, "", "User settings updated successfully"))
}

// For checking user role verification for the permissions (need to define user roles soon)

// func (h *Handler) roleChecker(role string) bool {
// 	return (userRole == role)
// }
