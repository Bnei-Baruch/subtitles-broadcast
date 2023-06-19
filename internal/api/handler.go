package api

import (
	"errors"
	"fmt"
	"math"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
	log "github.com/sirupsen/logrus"
	"gorm.io/gorm"
)

type Handler struct {
	Database *gorm.DB
}

func NewHandler(database *gorm.DB) *Handler {
	return &Handler{
		Database: database,
	}
}

func (h *Handler) AddSelectedContent(ctx *gin.Context) {
	req := struct {
		ID string `json:"id"`
	}{}
	err := ctx.BindJSON(&req)
	if err != nil {
		log.Error(err)
		ctx.JSON(400, gin.H{
			"success":     true,
			"code":        "",
			"err":         err.Error(),
			"description": "Binding data has failed",
		})
		return
	}
	userID := ctx.GetString("sub")
	contentIDStr := strings.Split(req.ID, "_")[0]
	contentID, _ := strconv.Atoi(contentIDStr)
	usersSelectedContent := UsersSelectedContent{
		UserID:    userID,
		ContentID: contentID,
	}
	err = h.Database.WithContext(ctx).Create(&usersSelectedContent).Debug().Error // Need to make this in procedure
	if err != nil {
		ctx.JSON(400, gin.H{
			"success":     true,
			"code":        "",
			"err":         fmt.Sprintf("failed to insert data: %v\n", usersSelectedContent),
			"description": "Inserting data has failed",
		})
		return
	}
	usersLastActivatedContent := UsersLastActivatedContent{
		UserID:    userID,
		ContentID: contentID,
	}
	err = h.Database.WithContext(ctx).Create(&usersLastActivatedContent).Debug().Error
	if err != nil {
		ctx.JSON(400, gin.H{
			"success":     true,
			"code":        "",
			"err":         fmt.Sprintf("failed to insert data: %v\n", usersLastActivatedContent),
			"description": "Inserting data has failed",
		})
		return
	}
	ctx.JSON(200, gin.H{
		"success":     true,
		"data":        usersSelectedContent,
		"description": "Inserting data has succeeded",
	})
}

func (h *Handler) GetAuthors(ctx *gin.Context) {
	obj := []*string{}
	book := &Book{}
	err := h.Database.WithContext(ctx).Model(book).Distinct("author").Order("author").Debug().Find(&obj).Error
	if err != nil {
		ctx.JSON(400, gin.H{
			"success":     true,
			"code":        "",
			"err":         err,
			"description": "Getting data has failed",
		})
		return
	}
	ctx.JSON(200, gin.H{
		"success": true,
		"data": struct {
			Authors []*string `json:"authors"`
		}{
			Authors: obj,
		},
		"description": "Getting data has succeeded",
	})
}

func (h *Handler) UpdateBooks(ctx *gin.Context) {
	req := &Book{}
	err := ctx.BindJSON(req)
	if err != nil {
		log.Error(err)
		ctx.JSON(400, gin.H{
			"success":     true,
			"code":        "",
			"err":         err.Error(),
			"description": "Binding data has failed",
		})
		return
	}
	targetData := &Book{}
	err = h.Database.WithContext(ctx).First(targetData, req.Id).Error
	if err != nil {
		log.Error(err)
		ctx.JSON(400, gin.H{
			"success":     true,
			"code":        "",
			"err":         "failed to get data",
			"description": "Getting data has failed",
		})
		return
	}
	targetData.Author = req.Author
	targetData.Title = req.Title
	updateHandler(ctx, h.Database, targetData, targetData.Id)
}

func (h *Handler) AddBookmarks(ctx *gin.Context) {
	req := &Bookmark{}
	insertHandler(ctx, h.Database, req)
}

func (h *Handler) GetBookTitles(ctx *gin.Context) {
	obj := []*string{}
	book := &Book{}
	err := h.Database.WithContext(ctx).Model(book).Distinct("title").Order("title").Debug().Find(&obj).Error
	if err != nil {
		ctx.JSON(400, gin.H{
			"success":     true,
			"code":        "",
			"err":         err,
			"description": "Getting data has failed",
		})
		return
	}
	ctx.JSON(200, gin.H{
		"success": true,
		"data": struct {
			Titles []*string `json:"titles"`
		}{
			Titles: obj,
		},
		"description": "Getting data has succeeded",
	})
}

func (h *Handler) UpdateBookmarks(ctx *gin.Context) {
	req := &Bookmark{}
	err := ctx.BindJSON(req)
	if err != nil {
		log.Error(err)
		ctx.JSON(400, gin.H{
			"success":     true,
			"code":        "",
			"err":         err.Error(),
			"description": "Binding data has failed",
		})
		return
	}
	targetData := &Bookmark{}
	err = h.Database.WithContext(ctx).First(targetData, req.Id).Error
	if err != nil {
		log.Error(err)
		ctx.JSON(400, gin.H{
			"success":     true,
			"code":        "",
			"err":         "failed to get data",
			"description": "Getting data has failed",
		})
		return
	}
	targetData.BookId = req.BookId
	targetData.Path = req.Path
	updateHandler(ctx, h.Database, targetData, targetData.Id)
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
		ctx.JSON(400, gin.H{
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
		ctx.JSON(400, gin.H{
			"success":     true,
			"code":        "",
			"err":         err,
			"description": "Getting data has failed",
		})
		return
	}
	ctx.JSON(200, gin.H{
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

func insertHandler(ctx *gin.Context, db *gorm.DB, obj interface{}) {
	err := db.WithContext(ctx).Create(obj).Error
	if err != nil {
		ctx.JSON(400, gin.H{
			"success":     true,
			"code":        "",
			"err":         fmt.Sprintf("failed to insert data: %v\n", obj),
			"description": "Inserting data has failed",
		})
		return
	}
	ctx.JSON(200, gin.H{
		"success":     true,
		"data":        obj,
		"description": "Inserting data has succeeded",
	})
}

func updateHandler(ctx *gin.Context, db *gorm.DB, obj interface{}, id int) {
	err := db.WithContext(ctx).Updates(obj).Where("id = ?", id).Error
	if err != nil {
		ctx.JSON(400, gin.H{
			"success":     true,
			"code":        "",
			"err":         fmt.Sprintf("failed to update book: %v\n", obj),
			"description": "Updating data has failed",
		})
		return
	}
	ctx.JSON(200, gin.H{
		"success":     true,
		"data":        obj,
		"description": "Updating data has succeeded",
	})
}
