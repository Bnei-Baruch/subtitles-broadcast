package api

import (
	"errors"
	"fmt"
	"math"
	"net/http"
	"strconv"
	"strings"
	"sync"
	"time"

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

	keyExpirationTime                 = 300000
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

func getResponse(success bool, data interface{}, err, description string) gin.H {
	return gin.H{
		responseSuccess:     success,
		responseData:        data,
		responseError:       err,
		responseDescription: description,
	}
}

func (h *Handler) AddSelectedContent(ctx *gin.Context) {
	req := struct {
		ID string `json:"id"`
	}{}
	err := ctx.BindJSON(&req)
	if err != nil {
		log.Error(err)
		ctx.JSON(http.StatusBadRequest,
			getResponse(true, nil, err.Error(), "Binding data has failed"))
		return
	}
	userID := ctx.GetString("sub")
	contentID := strings.Split(req.ID, "_")[0]
	err = checkValidContentID(h.Database, contentID)
	if err != nil {
		log.Error(err)
		if errors.Is(err, gorm.ErrRecordNotFound) {
			ctx.JSON(http.StatusNotFound,
				getResponse(true, nil, err.Error(), fmt.Sprintf("Content id %s not found", contentID)))
			return
		}
		ctx.JSON(http.StatusInternalServerError,
			getResponse(false, nil, err.Error(), "Adding data has failed"))
		return
	}

	// Create a new transaction
	// Watch the key
	key := fmt.Sprintf(userSelectedContentkeyFormat, userID)
	err = h.Cache.Watch(ctx, func(tx *redis.Tx) error {
		_, err := tx.TxPipelined(ctx, func(pipe redis.Pipeliner) error {
			// Add multiple commands to the transaction
			pipe.Set(ctx, fmt.Sprintf(userSelectedContentkeyFormat, userID), contentID, keyExpirationTime*time.Second)
			pipe.Set(ctx, fmt.Sprintf(userLastActivatedContentkeyFormat, userID, contentID),
				"", keyExpirationTime*time.Second)
			return nil
		})
		if err != nil {
			return err
		}
		return nil
	}, key)

	if err != nil {
		// Handle the situation where the transaction was discarded
		log.Error(err)
		ctx.JSON(http.StatusInternalServerError,
			getResponse(false, nil, err.Error(), "Adding data has failed"))
		return
	}

	ctx.JSON(http.StatusCreated,
		getResponse(true, struct{}{}, "", "Adding data has succeeded"))
}

func checkValidContentID(db *gorm.DB, contentID string) error {
	contentIDInt, err := strconv.Atoi(contentID)
	if err != nil {
		return err
	}
	err = db.First(&Content{}, contentIDInt).Error
	if err != nil {
		return err
	}
	return nil
}

func (h *Handler) GetUserBookContents(ctx *gin.Context) {
	var wg sync.WaitGroup
	userBooks := []*UserBook{}
	userBookContentsKey := fmt.Sprintf(userLastActivatedContentkeyFormat, ctx.GetString("sub"), "*")
	iter := h.Cache.Scan(ctx, 0, userBookContentsKey, 0).Iterator()
	if err := iter.Err(); err != nil {
		ctx.JSON(http.StatusInternalServerError,
			getResponse(false, nil, err.Error(), "Getting data has failed"))
		return
	}
	for iter.Next(ctx) {
		keyComponents := strings.Split(iter.Val(), ":")
		contentID := keyComponents[len(keyComponents)-1]
		wg.Add(1)
		go func() {
			defer wg.Done()
			contents, err := getContents(h.Database, contentID)
			if err != nil {
				ctx.JSON(http.StatusInternalServerError,
					getResponse(false, nil, err.Error(), "Getting data has failed"))
				return
			}
			bookContents := []string{}
			for _, content := range contents {
				bookContents = append(bookContents, content.Content)
			}
			userBook := UserBook{
				BookTitle:     contents[0].Title,
				LastActivated: fmt.Sprintf("%d_%d_%s_%s", contents[0].ContentID, contents[0].Page, contents[0].Letter, contents[0].Subletter),
				Contents:      bookContents,
			}
			userBooks = append(userBooks, &userBook)
		}()
	}
	wg.Wait()
	if len(userBooks) == 0 {
		ctx.JSON(http.StatusNotFound,
			getResponse(false, nil, "No user book content has found", "Getting data has failed"))
		return
	}

	ctx.JSON(http.StatusOK,
		getResponse(true, userBooks, "", "Getting data has succeeded"))
}

func getContents(db *gorm.DB, contentID string) ([]*BookContent, error) {
	contents := []*BookContent{}

	subquery := db.Raw(`
		WITH rowlist AS (
			SELECT ROW_NUMBER() OVER (ORDER BY book_id, page, letter, subletter ASC) AS row_num,
			c.id AS content_id,
			b.title AS title,
			c.page AS page,
			c.letter AS letter,
			c.subletter AS subletter,
			c.content AS content
			FROM books AS b
			INNER JOIN contents AS c ON b.id = c.book_id
		),
		start_row AS (
			SELECT row_num
			FROM rowlist
			WHERE content_id = ?
			LIMIT 1
		)
		SELECT *
		FROM rowlist
		WHERE row_num >= (SELECT row_num FROM start_row)
		LIMIT 5
	`, contentID).Find(&contents)
	if subquery.Error != nil {
		return nil, subquery.Error
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
		ctx.JSON(http.StatusBadRequest,
			getResponse(true, nil, err.Error(), "Binding data has failed"))
		return
	}
	userID := ctx.GetString("sub")
	contentID := strings.Split(req.ID, "_")[0]
	err = checkValidContentID(h.Database, contentID)
	if err != nil {
		log.Error(err)
		if errors.Is(err, gorm.ErrRecordNotFound) {
			ctx.JSON(http.StatusNotFound,
				getResponse(true, nil, err.Error(), fmt.Sprintf("Content id %s not found", contentID)))
			return
		}
		ctx.JSON(http.StatusInternalServerError,
			getResponse(false, nil, err.Error(), "Updating data has failed"))
		return
	}

	err = h.Cache.Set(ctx, fmt.Sprintf(userSelectedContentkeyFormat, userID),
		contentID, keyExpirationTime*time.Second).Err()
	if err != nil {
		log.Error(err)
		ctx.JSON(http.StatusInternalServerError,
			getResponse(false, nil, "failed to update data", "Updating data has failed"))
		return
	}
	ctx.JSON(http.StatusOK,
		getResponse(true, struct{}{}, "", "Updating data has succeeded"))
}

func (h *Handler) DeleteActivatedContent(ctx *gin.Context) {
	id := ctx.Query("id")
	if len(id) == 0 {
		ctx.JSON(http.StatusBadRequest,
			getResponse(true, nil, "No id parameter", "Getting id has failed"))
		return
	}
	userID := ctx.GetString("sub")
	contentID := strings.Split(id, "_")[0]

	// Watch the key
	key := fmt.Sprintf(userSelectedContentkeyFormat, userID)
	err := h.Cache.Watch(ctx, func(tx *redis.Tx) error {
		val, err := h.Cache.Get(ctx, fmt.Sprintf(userSelectedContentkeyFormat, userID)).Result()
		if err != nil {
			return err
		}
		_, err = tx.TxPipelined(ctx, func(pipe redis.Pipeliner) error {
			if val == contentID {
				err := pipe.Del(ctx, fmt.Sprintf(userSelectedContentkeyFormat, userID)).Err()
				if err != nil {
					return err
				}
				err = pipe.Del(ctx, fmt.Sprintf(userLastActivatedContentkeyFormat, userID, contentID)).Err()
				if err != nil {
					return err
				}
			}

			return nil
		})
		return err
	}, key)
	if errors.Is(err, redis.Nil) {
		ctx.JSON(http.StatusNotFound,
			getResponse(true, nil, "Not redis key found", fmt.Sprintf("The user %s does not have any content", userID)))
		return
	}
	if err != nil {
		// Handle the situation where the transaction was discarded
		log.Error(err)
		ctx.JSON(http.StatusInternalServerError,
			getResponse(false, nil, err.Error(), "Deleting data has failed"))
		return
	}

	ctx.JSON(http.StatusOK,
		getResponse(true, struct{}{}, "", "Deleting data has succeeded"))
}

func (h *Handler) DeleteContent(ctx *gin.Context) {
	id := ctx.Query("id")
	if len(id) == 0 {
		ctx.JSON(http.StatusBadRequest,
			getResponse(true, nil, "No id parameter", "Getting id has failed"))
		return
	}
	userID := ctx.GetString("sub")
	contentID := strings.Split(id, "_")[0]
	key := fmt.Sprintf(userLastActivatedContentkeyFormat, userID, contentID)
	exist, err := h.Cache.Exists(ctx, key).Result()
	if exist != 1 {
		ctx.JSON(http.StatusNotFound,
			getResponse(true, nil, "failed to Delete data", fmt.Sprintf("Key %s not found", key)))
		return
	}
	if err != nil {
		log.Error(err)
		ctx.JSON(http.StatusInternalServerError,
			getResponse(false, nil, "failed to Delete data", fmt.Sprintf("Checking key %s has failed", key)))
		return
	}

	// Perform Redis operations within the transaction
	err = h.Cache.Watch(ctx, func(redisTx *redis.Tx) error {
		val, err := h.Cache.Get(ctx, fmt.Sprintf(userSelectedContentkeyFormat, userID)).Result()
		if err != nil {
			return err
		}
		_, err = h.Cache.TxPipelined(ctx, func(pipe redis.Pipeliner) error {
			err = pipe.Del(ctx, fmt.Sprintf(userLastActivatedContentkeyFormat, userID, contentID)).Err()
			if err != nil {
				return err
			}
			if val == contentID {
				err = pipe.Del(ctx, fmt.Sprintf(userSelectedContentkeyFormat, userID)).Err()
				if err != nil {
					return err
				}
			}
			contentIDInt, err := strconv.Atoi(contentID)
			if err != nil {
				return err
			}
			// Perform PostgreSQL operations within the transaction
			if err := h.Database.Delete(&Content{}, contentIDInt).Error; err != nil {
				return err
			}
			return nil
		})
		return err
	}, key)
	if err != nil {
		ctx.JSON(http.StatusInternalServerError,
			getResponse(false, nil, err.Error(), "failed to Delete data"))
		return
	}

	ctx.JSON(http.StatusOK,
		getResponse(true, struct{}{}, "", "Deleting data has succeeded"))
}

func (h *Handler) GetAuthors(ctx *gin.Context) {
	obj := []*string{}
	book := &Book{}
	err := h.Database.WithContext(ctx).Model(book).Distinct("author").Order("author").Debug().Find(&obj).Error
	if err != nil {
		ctx.JSON(http.StatusInternalServerError,
			getResponse(false, nil, err.Error(), "Getting data has failed"))
		return
	}
	if len(obj) == 0 {
		ctx.JSON(http.StatusNotFound,
			getResponse(false, nil, "No author has found", "Getting data has failed"))
		return
	}
	ctx.JSON(http.StatusOK,
		getResponse(true,
			struct {
				Authors []*string `json:"authors"`
			}{
				Authors: obj,
			},
			"", "Getting data has succeeded"))
}

func (h *Handler) GetBookTitles(ctx *gin.Context) {
	obj := []*string{}
	book := &Book{}
	err := h.Database.WithContext(ctx).Model(book).Distinct("title").Order("title").Debug().Find(&obj).Error
	if err != nil {
		ctx.JSON(http.StatusInternalServerError,
			getResponse(false, nil, err.Error(), "Getting data has failed"))
		return
	}
	if len(obj) == 0 {
		ctx.JSON(http.StatusNotFound,
			getResponse(false, nil, "No book title has found", "Getting data has failed"))
		return
	}
	ctx.JSON(http.StatusOK,
		getResponse(true,
			struct {
				Titles []*string `json:"titles"`
			}{
				Titles: obj,
			},
			"", "Getting data has succeeded"))
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
	query := h.Database.WithContext(ctx).Model(&Content{}).Order("books.title, contents.page, contents.letter, contents.subletter").
		Select("concat(contents.id,'_',contents.page,'_',contents.letter,'_',contents.subletter) As id, contents.content As text, books.title As type, books.author As author, books.title As title").
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
		ctx.JSON(http.StatusInternalServerError,
			getResponse(false, nil, err.Error(), "Getting data has failed"))
		return
	}
	if len(obj) == 0 {
		ctx.JSON(http.StatusNotFound,
			getResponse(false, nil, "No archive has found", "Getting data has failed"))
		return
	}
	ctx.JSON(http.StatusOK,
		getResponse(true,
			struct {
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
			"", "Getting data has succeeded"))
}

// func (h *Handler) roleChecker(role string) bool { // For checking user role verification for some apis
// 	return (userRole == role)
// }
