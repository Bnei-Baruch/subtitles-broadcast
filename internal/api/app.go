//go:build !apitest

package api

import (
	"fmt"
	"net/http"
	"os"

	"github.com/golang-migrate/migrate/v4"
	"github.com/golang-migrate/migrate/v4/database/postgres"
	_ "github.com/golang-migrate/migrate/v4/source/file"
	_ "github.com/lib/pq"
	log "github.com/sirupsen/logrus"
	"gitlab.com/gitlab.bbdev.team/vh/broadcast-subtitles/internal/config"
	"gitlab.com/gitlab.bbdev.team/vh/broadcast-subtitles/internal/pkg/database"
	"gorm.io/gorm"
)

var (
	conf    *config.Config
	Version = "Dev"
	Build   = "Dev"
	Date    = "Dev"
)

const (
	LanguageCodeEnglish = "en"
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
	err = syncDBStructInsertionAndMigrations(db)
	if err != nil && err != migrate.ErrNoChange {
		log.Fatalln(err)
	}
	if err == nil {
		languageCodes := []string{LanguageCodeEnglish}
		archiveDataCopy(db, languageCodes)
	}

	return &http.Server{
		Addr:    ":" + fmt.Sprintf("%d", conf.Port),
		Handler: NewRouter(NewHandler(db)),
	}
}

func syncDBStructInsertionAndMigrations(db *gorm.DB) error {
	log.Println("Starting DB Migration")
	database, err := db.DB()
	if err != nil {
		log.Println("Error while creating migration instance ::", err)
		return err
	}
	driver, err := postgres.WithInstance(database, &postgres.Config{})
	if err != nil {
		log.Println("Error while creating migration instance ::", err)
		return err
	}
	m, err := migrate.NewWithDatabaseInstance(
		"file://./script/database/migration/", "postgres", driver)
	if err != nil {
		log.Println("Error while creating migration instance ::", err)
		return err
	}
	// Syncing Table struct (UP Mig), Insertion ( Up Mig ) & UP Migrations
	if err := m.Up(); err != nil {
		//m.Close()
		if err == migrate.ErrNoChange {
			log.Println("No changes in UP migration")
		}
		return err
	}
	//m.Close()
	log.Println("UP Migration Done!")
	return nil
}
