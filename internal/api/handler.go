package api

import (
	"ginhub.com/gin-gonic/gin"
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

func (h *Handler) AddSubtitles(g *gin.Context) {
}

func (h *Handler) GetSubtitles(g *gin.Context) {
}

func (h *Handler) UpdateSubtitles(g *gin.Context) {
}
