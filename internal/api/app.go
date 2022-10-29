package api

import (
	"fmt"
	"os"

	"gorm.io/gorm"

	"gitlab.com/gitlab.bbdev.team/vh/broadcast-subtitles/internal/config"
	"gitlab.com/gitlab.bbdev.team/vh/broadcast-subtitles/internal/pkg/database"
)

type App struct {
	Database *gorm.DB
}

func NewApp() *App {
	profile := fmt.Sprintf("config_%s", os.Getenv("BSSVR_PROFILE"))
	config.SetConfig(profile)
	config := config.GetConfig()
	app := App{
		Database: database.New(config.Postgres.Url),
	}
	return &app
}
