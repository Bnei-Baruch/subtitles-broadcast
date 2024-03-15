package api

import (
	"errors"
	"fmt"
	"math"
	"net/http"
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

	DBTableSlides    = "slides"
	DBTableBookmarks = "bookmarks"

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

/* not using
func (h *Handler) ImportSource(ctx *gin.Context) {
	req := struct {
		SourceUid string `json:"source_uid"`
		Language  string `json:"language"`
	}{}
	err := ctx.BindJSON(&req)
	if err != nil {
		log.Error(err)
		ctx.JSON(http.StatusBadRequest,
			getResponse(false, nil, err.Error(), "Binding data has failed"))
		return
	}
	if len(req.SourceUid) == 0 || len(req.Language) == 0 {
		ctx.JSON(http.StatusBadRequest,
			getResponse(false, nil, "Invalid request data", "Getting data has failed"))
		return
	}
	tx := h.Database.Debug().WithContext(ctx).Begin()
	if tx.Error != nil {
		log.Error(tx.Error)
		ctx.JSON(http.StatusInternalServerError,
			getResponse(false, nil, tx.Error.Error(), "Creating transaction has failed"))
		return
	}
	contents, fileUid := getFileContent(req.SourceUid, req.Language)
	if len(contents) == 0 {
		tx.Rollback()
		err := fmt.Errorf("failed to get file %s content", fileUid)
		log.Error(err)
		ctx.JSON(http.StatusInternalServerError,
			getResponse(false, nil, err.Error(), "Getting slide content has failed"))
		return
	}
	newFile := File{
		Type:      KabbalahmediaFileSourceType,
		Language:  req.Language,
		SourceUid: req.SourceUid,
		FileUid:   fileUid,
	}
	if err = tx.Create(&newFile).Error; err != nil {
		tx.Rollback()
		log.Error(err)
		ctx.JSON(http.StatusInternalServerError,
			getResponse(false, nil, err.Error(), "Creating file data has failed"))
		return
	}
	for idx, content := range contents {
		if len(content) > 0 {
			slide := Slide{
				FileUid:     newFile.FileUid,
				Slide:       content,
				OrderNumber: idx,
			}
			if err = tx.Create(&slide).Error; err != nil {
				tx.Rollback()
				log.Error(err)
				ctx.JSON(http.StatusInternalServerError,
					getResponse(false, nil, err.Error(), "Creating slide data has failed"))
				return
			}
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
*/

func (h *Handler) AddSlides(ctx *gin.Context) {
	reqs := []*struct {
		FileUid     string `json:"file_uid"`
		Slide       string `json:"slide"`
		OrderNumber int    `json:"order_number"`
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
	for _, req := range reqs {
		if err = tx.Create(&Slide{
			FileUid:     req.FileUid,
			Slide:       req.Slide,
			OrderNumber: req.OrderNumber,
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
		FileName  string   `json:"file_name,omitempty"`
		Languages []string `json:"languages"`
		SourceUid string   `json:"source_uid"`
		FileUid   string   `json:"file_uid"`
		Slides    []string `json:"slides"`
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
	fileData := &File{
		Type:      UploadFileSourceType,
		Languages: pq.StringArray(req.Languages),
		SourceUid: req.SourceUid,
		FileUid:   req.FileUid,
	}
	if len(req.FileName) > 0 {
		fileData.Filename = req.FileName
	}
	if err = tx.Table(DBTableFiles).Create(fileData).Error; err != nil {
		log.Error(err)
		ctx.JSON(http.StatusInternalServerError,
			getResponse(false, nil, err.Error(), "Creating file data has failed"))
		return
	}

	for _, slide := range req.Slides {
		slideData := Slide{
			Slide:     strings.ReplaceAll(slide, "\n", "\\n"),
			CreatedAt: time.Now(),
			UpdatedAt: time.Now(),
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
		Select("slides.*, CASE WHEN bookmarks.user_id = ? THEN bookmarks.id END AS bookmark_id, files.source_uid, source_paths.language, source_paths.path || ' / ' || slides.order_number+1 AS slide_source_path", userId).
		Joins("INNER JOIN files ON slides.file_uid = files.file_uid").
		Joins("INNER JOIN source_paths ON source_paths.source_uid = files.source_uid AND source_paths.language = ANY(files.languages)").
		Joins("LEFT JOIN bookmarks ON slides.id = bookmarks.slide_id AND bookmarks.user_id = ?", userId).
		Order("slides.file_uid").Order("order_number")
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
	updateQuery := "UPDATE slides AS s SET slide = r.slide, order_number = r.order_number, updated_at = ? "
	whereQuery := "WHERE s.id = r.slide_id"
	valuesQuery := []string{}
	placeholders := []interface{}{}

	for _, req := range reqs {
		// Use a placeholder for req.Slide and escape any special characters
		value := fmt.Sprintf("(%d, ?, %d)", req.SlideID, req.OrderNumber)
		valuesQuery = append(valuesQuery, value)

		// Append Slide value to placeholders
		placeholders = append(placeholders, req.Slide)
	}

	withQuery := "WITH reqs(slide_id, slide, order_number) AS (VALUES " + strings.Join(valuesQuery, ", ") + ") "
	query := withQuery + updateQuery + "FROM reqs AS r " + whereQuery

	// Append the timestamp placeholder to the placeholders slice
	placeholders = append(placeholders, time.Now())

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
		tx.Rollback()
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
		tx.Rollback()
		log.Error(err)
		ctx.JSON(http.StatusInternalServerError,
			getResponse(false, nil, err.Error(), "Deleting slide data has failed"))
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
		bookmark.SlideId = req.SlideId
		bookmark.FileUid = req.FileUid
		bookmark.UserId = userId.(string)
		bookmark.OrderNumber = req.Order
		bookmark.CreatedAt = time.Now()
		bookmark.UpdatedAt = time.Now()
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
		Joins("INNER JOIN source_paths ON files.source_uid = source_paths.source_uid AND source_paths.language = ANY(files.language)").
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
	sourceValueSlideCountList := []struct {
		SourceValue string `json:"source_value"`
		SlideCount  int    `json:"slide_count"`
	}{}
	result := h.Database.Debug().WithContext(ctx).Raw(`
		SELECT value AS source_value, COUNT(distinct slide) AS slide_count
		FROM (
			SELECT
				TRIM(split_part(unnest(string_to_array(path, '/')), '/', 1)) AS value,
				slide
			FROM
				source_paths
			LEFT JOIN (
				SELECT slide, source_paths.source_uid
				FROM slides
				INNER JOIN files ON slides.file_uid = files.file_uid
				INNER JOIN source_paths ON files.source_uid = source_paths.source_uid
			) AS t ON source_paths.source_uid = t.source_uid
		) AS source_values
		WHERE value LIKE ?
		GROUP BY value
		ORDER BY value;
	`, "%"+query+"%").Scan(&sourceValueSlideCountList)
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

func (h *Handler) GetSlideLanguages(ctx *gin.Context) {
	var result []string
	query := h.Database.Debug().WithContext(ctx).Table(DBTableFiles).
		Distinct("UNNEST(languages) AS language").Pluck("language", &result)
	if query.Error != nil {
		log.Error(query.Error)
		ctx.JSON(http.StatusInternalServerError,
			getResponse(false, nil, query.Error.Error(), "Getting data has failed"))
		return
	}
	ctx.JSON(http.StatusOK, getResponse(true, result, "", "Getting data has succeeded"))
}

// Unnecessary handler at this moment. If need, will be used

// func (h *Handler) GetSourceName(ctx *gin.Context) {
// 	sourceUid := ctx.Query("source_uid")
// 	if len(sourceUid) == 0 {
// 		ctx.JSON(http.StatusBadRequest,
// 			getResponse(false, nil, "", "source_uid parameter is needed"))
// 		return
// 	}
// 	sourcePath := SourcePath{}
// 	err := h.Database.Debug().WithContext(ctx).
// 		Table("source_paths").
// 		Where("source_uid = ?", sourceUid).First(&sourcePath).Error
// 	if err != nil {
// 		if !errors.Is(err, gorm.ErrRecordNotFound) {
// 			ctx.JSON(http.StatusInternalServerError,
// 				getResponse(false, nil, err.Error(), "Getting source path has failed"))
// 		return
// 	}
// 	re := regexp.MustCompile(`\(([^)]+)\)`)
// 	matches := re.FindStringSubmatch(sourcePath.Path)
// 	ctx.JSON(http.StatusOK,
// 		getResponse(true,
// 			matches[1],
// 			"", "Getting data has succeeded"))
// }

// func (h *Handler) GetSourcePath(ctx *gin.Context) {
// 	slideId := ctx.Query("slide_id")
// 	sourceUid := ctx.Query("source_uid")
// 	slideIdLength := len(slideId)
// 	sourceUidLength := len(sourceUid)
// 	if slideIdLength == 0 && sourceUidLength == 0 {
// 		ctx.JSON(http.StatusBadRequest,
// 			getResponse(false, nil, "", "Either the slide_id or source_uid is needed"))
// 		return
// 	}
// 	path := SourcePath{}
// 	if slideIdLength > 0 {
// 		slideIdInt, err := strconv.Atoi(slideId)
// 		if err != nil {
// 			ctx.JSON(http.StatusBadRequest,
// 				getResponse(false, nil, err.Error(), "The slide id must be an integer"))
// 			return
// 		}
// 		err = h.Database.Debug().WithContext(ctx).
// 			Select("source_paths.path || ' / ' || slides.id AS path").
// 			Table("slides").
// 			Joins("INNER JOIN files on slides.file_uid = files.file_uid").
// 			Joins("INNER JOIN source_paths on files.source_uid = source_paths.source_uid AND files.language = source_paths.language").
// 			Where("slides.id = ?", slideIdInt).First(&path).Error
// 		if err != nil {
// 				ctx.JSON(http.StatusInternalServerError,
// 					getResponse(false, nil, err.Error(), "Getting slide source path has failed"))
// 			return
// 		}
// 	} else if sourceUidLength > 0 {
// 		err := h.Database.Debug().WithContext(ctx).
// 			Select("path").
// 			Table("source_paths").
// 			Where("source_uid = ?", sourceUid).First(&path).Error
// 		if err != nil {
// 			if !errors.Is(err, gorm.ErrRecordNotFound) {
// 				ctx.JSON(http.StatusInternalServerError,
// 					getResponse(false, nil, err.Error(), "Getting source path has failed"))
// 			return
// 		}
// 	}

// 	ctx.JSON(http.StatusOK,
// 		getResponse(true,
// 			path,
// 			"", "Getting data has succeeded"))
// }

// For checking user role verification for the permissions (need to define user roles soon)

// func (h *Handler) roleChecker(role string) bool {
// 	return (userRole == role)
// }
