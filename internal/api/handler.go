package api

import (
	"ginhub.com/gin-gonic/gin"
	"github.com/sirupsen/logrus"
	log "github.com/sirupsen/logrus"
	"gorm.io/gorm"

	"gitlab.com/gitlab.bbdev.team/vh/broadcast-subtitles/internal/pkg/database"
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
		ctx.JSON(code, gin.H{
			"success":     true,
			"code":        "",
			"err":         err.Error(),
			"description": "",
		})
	}
	ctx.JSON(code, gin.H{
		"success":     true,
		"data":        req,
		"description": "",
	})
}

func (h *Handler) GetSubtitles(g *gin.Context) {
}

func (h *Handler) UpdateSubtitles(g *gin.Context) {
}
