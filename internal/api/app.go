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

	return &http.Server{
		Addr:    ":" + conf.Port,
		Handler: NewRouter(NewHandler(database.New(conf.Postgres.Url))),
	}
}
