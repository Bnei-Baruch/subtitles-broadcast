package api

import (
	"fmt"
	"net/http"
	"os"

	log "github.com/sirupsen/logrus"

	"gitlab.com/gitlab.bbdev.team/vh/broadcast-subtitles/internal/config"
	"gitlab.com/gitlab.bbdev.team/vh/broadcast-subtitles/internal/pkg/database"
)

func init() {
	log.SetFormatter(&log.JSONFormatter{})
}

func NewApp() *http.Server {
	config.SetConfig(fmt.Sprintf("config_%s", os.Getenv("BSSVR_PROFILE")))
	conf := config.GetConfig()
	db, err := database.New(conf.Postgres.Url)
	if err != nil {

	}
	return &http.Server{
		Addr:    ":" + fmt.Sprintf("%d", conf.Port),
		Handler: NewRouter(NewHandler(db)),
	}
}
