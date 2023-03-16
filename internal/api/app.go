package api

import (
	"fmt"
	"net/http"
	"os"

	log "github.com/sirupsen/logrus"

	"gitlab.com/gitlab.bbdev.team/vh/broadcast-subtitles/internal/config"
	"gitlab.com/gitlab.bbdev.team/vh/broadcast-subtitles/internal/pkg/database"
)

var conf *config.Config

func init() {
	err := config.SetConfig(fmt.Sprintf("config_%s", os.Getenv("BSSVR_PROFILE")))
	if err != nil {
		log.Fatal("No BSSVR_PROFILE value. Cannot start the server application")
	}
	conf = config.GetConfig()
	ll, err := log.ParseLevel(conf.LogLevel)
	if err != nil {
		ll = log.DebugLevel
	}
	log.SetLevel(ll)
	log.SetFormatter(&log.JSONFormatter{})
}

func NewApp() *http.Server {

	db, err := database.New(conf.Postgres.Url)
	if err != nil {
		log.Fatalln(err)
	}
	if err := db.AutoMigrate(&Book{}, &Bookmark{}); err != nil {
		log.Fatalln(err)
	}
	return &http.Server{
		Addr:    ":" + fmt.Sprintf("%d", conf.Port),
		Handler: NewRouter(NewHandler(db)),
	}
}
