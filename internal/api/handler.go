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

func (h *Handler) AddSubtitles(ctx *gin.Context) {
	req := &Book{}

	if err := ctx.BindJSON(req); err != nil {
		log.Error(err)
		ctx.JSON(400, gin.H{
			"success":     true,
			"code":        "",
			"err":         err.Error(),
			"description": "",
		})
	}
	if h.Database.WithContext(ctx).Create(req).Error != nil {
		ctx.JSON(400, gin.H{
			"success":     true,
			"code":        "",
			"err":         fmt.Sprintf("failed to insert book: %v\n", req),
			"description": "",
		})
	}
	ctx.JSON(200, gin.H{
		"success":     true,
		"data":        req,
		"description": "",
	})
}

func (h *Handler) GetSubtitles(ctx *gin.Context) {
	book := &Book{}
	err := h.Database.WithContext(ctx).First(book, ctx.Query("id")).Error
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
		"data":        book,
		"description": "",
	})
}

func (h *Handler) UpdateSubtitles(ctx *gin.Context) {
	req := &Book{}

	if err := ctx.BindJSON(req); err != nil {
		log.Error(err)
		ctx.JSON(400, gin.H{
			"success":     true,
			"code":        "",
			"err":         err.Error(),
			"description": "",
		})
	}
	if h.Database.WithContext(ctx).Updates(req).Where("id = ?", req.Id).Error != nil {
		ctx.JSON(400, gin.H{
			"success":     true,
			"code":        "",
			"err":         fmt.Sprintf("failed to update book: %v\n", req),
			"description": "",
		})
	}
	ctx.JSON(200, gin.H{
		"success":     true,
		"data":        req,
		"description": "",
	})
}

func (h *Handler) roleChecker() bool { // For checking super admin api
	return (userRole == SUPER_ADMIN)
}
