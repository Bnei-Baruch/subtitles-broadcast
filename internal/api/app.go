package api

import (
	"fmt"
	"net/http"
	"os"

	log "github.com/sirupsen/logrus"
	"gitlab.com/gitlab.bbdev.team/vh/broadcast-subtitles/internal/config"
	"gitlab.com/gitlab.bbdev.team/vh/broadcast-subtitles/internal/pkg/database"
)

var (
	conf    *config.Config
	Version = "Dev"
	Build   = "Dev"
	Date    = "Dev"
)

func init() {
	fmt.Printf("Build Date: %s\nBuild Version: %s\nBuild: %s\n\n", Date, Version, Build)
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

	db, err := database.NewPostgres(conf.Postgres.Url)
	if err != nil {
		log.Fatalln(err)
	}
	// if err := db.AutoMigrate(&File{}, &FileSource{}, &Bookmark{}, &Subtitle{}); err != nil {
	// 	log.Fatalln(err)
	// }
	cache, err := database.NewRedis(conf.Redis.Url)
	if err != nil {
		log.Fatalln(err)
	}

	return &http.Server{
		Addr:    ":" + fmt.Sprintf("%d", conf.Port),
		Handler: NewRouter(NewHandler(db, cache)),
	}
}
