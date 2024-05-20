//go:build !apitest

package api

import (
	"fmt"
	"net/http"
	"os"
	"time"

	"github.com/golang-migrate/migrate/v4"
	"github.com/golang-migrate/migrate/v4/database/postgres"
	_ "github.com/golang-migrate/migrate/v4/source/file"
	_ "github.com/lib/pq"
	log "github.com/sirupsen/logrus"
	"gitlab.com/gitlab.bbdev.team/vh/broadcast-subtitles/internal/config"
	"gitlab.com/gitlab.bbdev.team/vh/broadcast-subtitles/internal/pkg/database"
	"gorm.io/gorm"
)

const (
	LanguageCodeEnglish = "en"
	LanguageCodeSpanish = "es"
	LanguageCodeHebrew  = "he"
	LanguageCodeRussian = "ru"

	SourcePathUpdateTermHour = 6
)

func NewApp(sig chan os.Signal) *http.Server {
	db, err := database.NewPostgres(config.Configuration.Postgres.Url)
	if err != nil {
		log.Fatalln(err)
	}
	err = syncDBStructInsertionAndMigrations(db)
	if err != nil && err != migrate.ErrNoChange {
		log.Fatalln(err)
	}
	languageCodes := []string{LanguageCodeEnglish, LanguageCodeSpanish, LanguageCodeHebrew, LanguageCodeRussian}
	sourcePaths, err := getSourcePathListByLanguages(languageCodes)
	if err != nil {
		log.Fatalln(err)
	}

	updateSourcePath(db, sourcePaths)
	// archiveDataCopy(db, sourcePaths)

	ticker := time.NewTicker(SourcePathUpdateTermHour * time.Hour)
	go func() {
		for {
			select {
			case <-ticker.C:
				log.Println("Updating source path.")
				sourcePaths, err := getSourcePathListByLanguages(languageCodes)
				if err != nil {
					log.Println(err)
				}
				updateSourcePath(db, sourcePaths)
			case <-sig:
				log.Println("Stopping source path update routine.")
				return
			}
		}
	}()

	return &http.Server{
		Addr:    ":" + fmt.Sprintf("%d", config.Configuration.Port),
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
