package api

import (
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
	keyExpirationTime                 = 30
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

func (h *Handler) AddSelectedContent(ctx *gin.Context) {
	req := struct {
		ID string `json:"id"`
	}{}
	err := ctx.BindJSON(&req)
	if err != nil {
		log.Error(err)
		ctx.JSON(http.StatusBadRequest, gin.H{
			"success":     true,
			"code":        "",
			"err":         err.Error(),
			"description": "Binding data has failed",
		})
		return
	}
	userID := ctx.GetString("sub")
	contentID := strings.Split(req.ID, "_")[0]
	// Create a new transaction

	// Watch the key
	key := fmt.Sprintf(userSelectedContentkeyFormat, userID)
	err = h.Cache.Watch(ctx, func(tx *redis.Tx) error {
		_, err := tx.TxPipelined(ctx, func(pipe redis.Pipeliner) error {
			// Add multiple commands to the transaction
			pipe.Set(ctx, userSelectedContentkeyFormat, contentID, keyExpirationTime)
			pipe.Set(ctx, fmt.Sprintf(userLastActivatedContentkeyFormat, userID, contentID),
				"", keyExpirationTime)
			return nil
		})
		return err
	}, key)
	if err != nil {
		// Handle the situation where the transaction was discarded
		log.Error(err)
		ctx.JSON(http.StatusInternalServerError, gin.H{
			"success":     true,
			"code":        "",
			"err":         err.Error(),
			"description": "Adding data has failed",
		})
		return
	}

	ctx.JSON(http.StatusCreated, gin.H{
		"success":     true,
		"data":        struct{}{},
		"description": "Adding data has succeeded",
	})
}

func (h *Handler) GetUserBookContents(ctx *gin.Context) {
	userBooks := []*UserBook{}
	userBookContentsKey := fmt.Sprintf(userLastActivatedContentkeyFormat[:37], ctx.GetString("sub"))
	iter := h.Cache.Scan(ctx, 0, userBookContentsKey, 0).Iterator()
	for iter.Next(ctx) {
		keyComponents := strings.Split(iter.Val())
		contentID := keyComponents[len(keyComponents)-1]
		contents := getContents(h.Database, contentID)
		bookContents := []string{}
		for _, content := range contents {
			bookContents = append(bookContents, content.Content)
		}
		userBook := UserBook{
			BookTitle:     contents[0].Title,
			LastActivated: Sprintf("%d_%d_%s_%s", contents[0].ContentID, contents[0].Page, contents[0].Letter, contents[0].Subletter),
			Contents:      bookContents,
		}
		userBooks = append(userBooks, &userBook)
	}
	if err := iter.Err(); err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{
			"success":     true,
			"code":        "",
			"err":         err,
			"description": "Getting data has failed",
		})

	}
	if err := iter.Close(); err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{
			"success":     true,
			"code":        "",
			"err":         err,
			"description": "Getting data has failed",
		})

	}

	ctx.JSON(http.StatusOK, gin.H{
		"success":     true,
		"data":        bookContents,
		"description": "Getting data has succeeded",
	})
}

func getContents(db *gorm.DB, contentID string) ([]Content, error) {
	contents := []*Content{}

	subquery := db.
		Table("(SELECT ROW_NUMBER() OVER (ORDER BY book_id, page, letter, subletter ASC) AS row_num, c.id AS content_id, b.title AS title, c.page AS page, c.letter AS letter, c.subletter AS subletter, c.content AS content FROM books AS b INNER JOIN contents AS c ON b.id = c.book_id)").
		Select("row_num, title").
		Where("content_id = ?", contentID).
		QueryExpr()

	err := db.
		Table("(SELECT * FROM (SELECT ROW_NUMBER() OVER (ORDER BY book_id, page, letter, subletter ASC) AS row_num, c.id AS content_id, b.title AS title, c.page AS page, c.letter AS letter, c.subletter AS subletter, c.content AS content FROM books AS b INNER JOIN contents AS c ON b.id = c.book_id) AS rowlist)").
		Joins(fmt.Sprintf("JOIN (%s) AS start_row", subquery)).
		Where("row_num >= (SELECT row_num FROM start_row)").
		Where("title LIKE (SELECT title FROM start_row)").
		Limit(5).
		Find(&contents).
		Error
	if err != nil {
		return nil, err
	}

	return contents, nil
}

func (h *Handler) UpdateSelectedContent(ctx *gin.Context) {
	req := struct {
		ID string `json:"id"`
	}{}
	err := ctx.BindJSON(&req)
	if err != nil {
		log.Error(err)
		ctx.JSON(http.StatusBadRequest, gin.H{
			"success":     true,
			"code":        "",
			"err":         err.Error(),
			"description": "Binding data has failed",
		})
		return
	}
	userID := ctx.GetString("sub")
	contentID := strings.Split(req.ID, "_")[0]
	key := fmt.Sprintf(userSelectedContentkeyFormat, userID)
	err = h.Cache.Set(ctx, key, contentID, keyExpirationTime).Err()
	if err != nil {
		log.Error(err)
		ctx.JSON(http.StatusInternalServerError, gin.H{
			"success":     true,
			"code":        "",
			"err":         "failed to update data",
			"description": "Updating data has failed",
		})
		return
	}
	ctx.JSON(http.StatusOK, gin.H{
		"success":     true,
		"data":        struct{}{},
		"description": "Updating data has succeeded",
	})
}

func (h *Handler) DeleteActivatedContent(ctx *gin.Context) {
	req := struct {
		ID string `json:"id"`
	}{}
	err := ctx.BindJSON(&req)
	if err != nil {
		log.Error(err)
		ctx.JSON(http.StatusBadRequest, gin.H{
			"success":     true,
			"code":        "",
			"err":         err.Error(),
			"description": "Binding data has failed",
		})
		return
	}
	userID := ctx.GetString("sub")
	contentID := strings.Split(req.ID, "_")[0]

	// Watch the key
	key := fmt.Sprintf(userSelectedContentkeyFormat, userID)
	err = h.Cache.Watch(ctx, func(tx *redis.Tx) error {
		_, err := tx.TxPipelined(ctx, func(pipe redis.Pipeliner) error {
			pipe.Del(ctx, fmt.Sprintf(userSelectedContentkeyFormat, userID))
			pipe.Del(ctx, fmt.Sprintf(userLastActivatedContentkeyFormat, userID, contentID))

			return nil
		})
		return err
	}, key)
	if err != nil {
		// Handle the situation where the transaction was discarded
		log.Error(err)
		ctx.JSON(http.StatusInternalServerError, gin.H{
			"success":     true,
			"code":        "",
			"err":         err.Error(),
			"description": "Adding data has failed",
		})
		return
	}

	ctx.JSON(http.StatusOK, gin.H{
		"success":     true,
		"data":        struct{}{},
		"description": "Deleting data has succeeded",
	})
}

func (h *Handler) GetAuthors(ctx *gin.Context) {
	obj := []*string{}
	book := &Book{}
	err := h.Database.WithContext(ctx).Model(book).Distinct("author").Order("author").Debug().Find(&obj).Error
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{
			"success":     true,
			"code":        "",
			"err":         err,
			"description": "Getting data has failed",
		})
		return
	}
	ctx.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": struct {
			Authors []*string `json:"authors"`
		}{
			Authors: obj,
		},
		"description": "Getting data has succeeded",
	})
}

func (h *Handler) GetBookTitles(ctx *gin.Context) {
	obj := []*string{}
	book := &Book{}
	err := h.Database.WithContext(ctx).Model(book).Distinct("title").Order("title").Debug().Find(&obj).Error
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{
			"success":     true,
			"code":        "",
			"err":         err,
			"description": "Getting data has failed",
		})
		return
	}
	ctx.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": struct {
			Titles []*string `json:"titles"`
		}{
			Titles: obj,
		},
		"description": "Getting data has succeeded",
	})
}

func (h *Handler) GetArchives(ctx *gin.Context) {
	var errPage, errLimit error
	var page, limit int
	offset := 0
	listLimit := 50

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
		ctx.JSON(http.StatusBadRequest, gin.H{
			"success":     true,
			"code":        "",
			"err":         err,
			"description": "Getting data has failed",
		})
		return
	}
	if limit > 0 {
		listLimit = limit
	}
	if page > 1 {
		offset = listLimit * (page - 1)
	}

	var totalRows int64
	query := h.Database.WithContext(ctx).Model(&Content{}).Order("books.title, contents.page, contents.letter, contents.subletter").
		Select("concat(content.id,'_',contents.page,'_',contents.letter,'_',contents.subletter) As id, contents.content As text, books.title As type, books.author As author, books.title As title").
		Joins("inner join books on contents.book_id = books.id")
	title := ctx.Query("title")
	if len(title) > 0 {
		query = query.Where("title like ?", "%"+title+"%")
	}
	author := ctx.Query("author")
	if len(author) > 0 {
		query = query.Where("author like ?", "%"+author+"%")
	}

	obj := []*Archive{}
	err = query.Count(&totalRows).Limit(listLimit).Offset(offset).Debug().Find(&obj).Error
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{
			"success":     true,
			"code":        "",
			"err":         err,
			"description": "Getting data has failed",
		})
		return
	}
	ctx.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": struct {
			Pagination *Pagination `json:"pagination"`
			Archives   []*Archive  `json:"archives"`
		}{
			Pagination: &Pagination{
				Limit:      listLimit,
				Page:       page,
				TotalRows:  totalRows,
				TotalPages: int(math.Ceil(float64(totalRows) / float64(listLimit))),
			},
			Archives: obj,
		},
		"description": "Getting data has succeeded",
	})
}

// func (h *Handler) roleChecker(role string) bool { // For checking user role verification for some apis
// 	return (userRole == role)
// }
