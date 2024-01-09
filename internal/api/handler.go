package api

import (
	"errors"
	"fmt"
	"math"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgconn"
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

	ERR_UNIQUE_VIOLATION_CODE = "23505"
	ERR_RECORD_NOT_FOUND_MSG  = "record not found"
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

// Get all slides with bookmarked info by user
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
		log.Error(err)
		ctx.JSON(http.StatusBadRequest, getResponse(false, nil, err.Error(), "Getting data has failed"))
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
	slides := []*SlideDetail{}
	query := h.Database.Debug().WithContext(ctx).
		Table(DBTableSlides).
		Select("slides.*, CASE WHEN bookmarks.user_id = ? THEN true ELSE false END AS bookmarked, files.source_uid, files.language, source_paths.path || ' / ' || slides.id AS slide_source_path", userId).
		Joins("INNER JOIN files ON slides.file_uid = files.file_uid").
		Joins("INNER JOIN source_paths ON source_paths.source_uid = files.source_uid AND source_paths.language = files.language").
		Joins("LEFT JOIN bookmarks ON slides.id = bookmarks.slide_id").
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
		query = query.Where("(slides.slide LIKE ? OR source_paths.path || ' / ' || slides.id LIKE ?)", "%"+keyword+"%", "%"+keyword+"%")
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
			struct {
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
			},
			"", "Getting data has succeeded"))
}

func (h *Handler) UpdateSlide(ctx *gin.Context) {
	req := struct {
		SlideID int    `json:"slide_id"`
		Slide   string `json:"slide"`
	}{}
	err := ctx.BindJSON(&req)
	if err != nil {
		log.Error(err)
		ctx.JSON(http.StatusBadRequest, getResponse(false, nil, err.Error(), "Binding data has failed"))
		return
	}
	result := h.Database.Debug().WithContext(ctx).
		Exec("UPDATE slides SET slide = ?, updated_at = ? WHERE id = ?", req.Slide, time.Now(), req.SlideID)
	if result.Error != nil {
		log.Error(result.Error)
		if result.Error.Error() == gorm.ErrRecordNotFound.Error() {
			ctx.JSON(http.StatusBadRequest,
				getResponse(false, nil, "No slide to update in the condition", "No slide to update in the condition"))
			return
		}
		ctx.JSON(http.StatusInternalServerError,
			getResponse(false, nil, result.Error.Error(), "Updating slide data has failed"))
		return
	}
	ctx.JSON(http.StatusOK, getResponse(true, nil, "", "Updating data has succeeded"))
}

func (h *Handler) DeleteSlide(ctx *gin.Context) {
	slideId := ctx.Param("slide_id")
	slideIdInt, err := strconv.Atoi(slideId)
	if err != nil {
		log.Error(err)
		ctx.JSON(http.StatusBadRequest, getResponse(false, nil, err.Error(), "Slide ID must be an integer"))
		return
	}
	tx := h.Database.Debug().WithContext(ctx).Begin()
	if tx.Error != nil {
		log.Error(tx.Error)
		ctx.JSON(http.StatusInternalServerError,
			getResponse(false, nil, tx.Error.Error(), "Creating transaction has failed"))
		return
	}
	if err := tx.Where("slide_id = ?", slideIdInt).Delete(&Bookmark{}).Error; err != nil {
		tx.Rollback()
		log.Error(err)
		ctx.JSON(http.StatusInternalServerError,
			getResponse(false, nil, err.Error(), "Deleting bookmark data related to the slide has failed"))
		return
	}
	result := tx.Where("id = ?", slideIdInt).Delete(&Slide{})
	if result.Error != nil {
		tx.Rollback()
		log.Error(result.Error)
		ctx.JSON(http.StatusInternalServerError,
			getResponse(false, nil, result.Error.Error(), "Deleting slide data has failed"))
		return
	}
	if result.RowsAffected == 0 {
		ctx.JSON(http.StatusBadRequest, getResponse(false, nil, "No slide with the id", "No slide with the id"))
		return
	}
	if err = tx.Commit().Error; err != nil {
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
		BookmarkPath string `json:"bookmark_path"`
		FileUid      string `json:"file_uid"`
	}{}
	query := h.Database.Debug().WithContext(ctx).
		Select("source_paths.path || ' / ' || slides.id AS bookmark_path, files.file_uid AS file_uid").
		Table(DBTableBookmarks).
		Joins("INNER JOIN slides ON bookmarks.slide_id = slides.id").
		Joins("INNER JOIN files ON slides.file_uid = files.file_uid").
		Joins("INNER JOIN source_paths ON files.source_uid = source_paths.source_uid AND files.language = source_paths.language").
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
