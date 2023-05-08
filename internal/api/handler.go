package api

import (
	"fmt"
	"math"
	"strconv"

	"github.com/gin-gonic/gin"
	log "github.com/sirupsen/logrus"
	"gorm.io/gorm"
)

const listLimit = 50

type Handler struct {
	Database *gorm.DB
}

func NewHandler(database *gorm.DB) *Handler {
	return &Handler{
		Database: database,
	}
}

func (h *Handler) AddBooks(ctx *gin.Context) {
	req := &Book{}
	insertHandler(ctx, h.Database, req)
}

func (h *Handler) GetBooks(ctx *gin.Context) {
	book := &Book{}
	getHandler(ctx, h.Database, book)
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

func (h *Handler) GetBookmarks(ctx *gin.Context) {
	bookmark := &Bookmark{}
	getHandler(ctx, h.Database, bookmark)
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

func (h *Handler) GetArchive(ctx *gin.Context) {
	offset := 0
	pageStr := ctx.Query("page")
	page, err := strconv.Atoi(pageStr)
	if len(pageStr) > 0 && err != nil {
		ctx.JSON(400, gin.H{
			"success":     true,
			"code":        "",
			"err":         err,
			"description": "Getting data has failed",
		})
		return
	}
	if page > 1 {
		offset = listLimit * (page - 1)
	}

	obj := []*Archive{}

	var totalRows int64
	err = h.Database.WithContext(ctx).Model(&Content{}).Limit(listLimit).Offset(offset).Order("books.title, contents.page, contents.letter, contents.subletter").
		Select("contents.content As text, books.title As type, books.author As author, books.title As title").
		Joins("inner join books on contents.book_id = books.id").Count(&totalRows).Find(&obj).Error
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
	err := ctx.BindJSON(obj)
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
	err = db.WithContext(ctx).Create(obj).Error
	if err != nil {
		ctx.JSON(400, gin.H{
			"success":     true,
			"code":        "",
			"err":         fmt.Sprintf("failed to insert book: %v\n", obj),
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

func getHandler(ctx *gin.Context, db *gorm.DB, obj interface{}) {
	err := db.WithContext(ctx).First(obj, ctx.Query("id")).Error
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
	ctx.JSON(200, gin.H{
		"success":     true,
		"data":        obj,
		"description": "Getting data has succeeded",
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
