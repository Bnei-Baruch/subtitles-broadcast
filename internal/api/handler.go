package api

import (
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
	ctx.JSON(200, gin.H{
		"success":     true,
		"data":        req,
		"description": "",
	})
}

func (h *Handler) GetSubtitles(g *gin.Context) {
}

func (h *Handler) UpdateSubtitles(g *gin.Context) {
}
