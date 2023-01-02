package api

import (
	"fmt"

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
	updateHandler(ctx, h.Database, req, req.Id)
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
	updateHandler(ctx, h.Database, req, req.Id)
}

func (h *Handler) roleChecker(role string) bool { // For checking user role verification for some apis
	return (userRole == role)
}

func insertHandler(ctx *gin.Context, db *gorm.DB, obj interface{}) {
	if err := ctx.BindJSON(obj); err != nil {
		log.Error(err)
		ctx.JSON(400, gin.H{
			"success":     true,
			"code":        "",
			"err":         err.Error(),
			"description": "",
		})
	}
	if db.WithContext(ctx).Create(obj).Error != nil {
		ctx.JSON(400, gin.H{
			"success":     true,
			"code":        "",
			"err":         fmt.Sprintf("failed to insert book: %v\n", obj),
			"description": "",
		})
	}
	ctx.JSON(200, gin.H{
		"success":     true,
		"data":        obj,
		"description": "",
	})
}

func getHandler(ctx *gin.Context, db *gorm.DB, obj interface{}) {
	err := db.WithContext(ctx).First(obj, ctx.Query("id")).Error
	if err != nil {
		log.Println(err)
		ctx.JSON(400, gin.H{
			"success":     true,
			"code":        "",
			"err":         "failed to get book",
			"description": "",
		})
	}
	ctx.JSON(200, gin.H{
		"success":     true,
		"data":        obj,
		"description": "",
	})
}

func updateHandler(ctx *gin.Context, db *gorm.DB, obj interface{}, id int) {
	if err := ctx.BindJSON(obj); err != nil {
		log.Error(err)
		ctx.JSON(400, gin.H{
			"success":     true,
			"code":        "",
			"err":         err.Error(),
			"description": "",
		})
	}
	if db.WithContext(ctx).Updates(obj).Where("id = ?", id).Error != nil {
		ctx.JSON(400, gin.H{
			"success":     true,
			"code":        "",
			"err":         fmt.Sprintf("failed to update book: %v\n", obj),
			"description": "",
		})
	}
	ctx.JSON(200, gin.H{
		"success":     true,
		"data":        obj,
		"description": "",
	})

}
