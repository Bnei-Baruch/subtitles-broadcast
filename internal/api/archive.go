package api

import (
	"encoding/json"
	"fmt"
	"strings"

	"net/http"

	log "github.com/sirupsen/logrus"
	"gorm.io/gorm"

	"code.sajari.com/docconv"
)

const (
	KabbalahmediaSourcesUrl = "https://kabbalahmedia.info/backend/sqdata?language=%s"
	KabbalahmediaFilesUrl   = "https://kabbalahmedia.info/backend/content_units?id=%s&with_files=true"
	KabbalahmediaCdnUrl     = "https://cdn.kabbalahmedia.info/%s"

	KabbalahmediaFileSourceType = "archive"
)

func archiveMigration(database *gorm.DB, language string) {
	resp, err := http.Get(fmt.Sprintf(KabbalahmediaSourcesUrl, language))
	if err != nil {
		log.Fatalf("Internal error: %s", err)
	}
	var sources ArchiveSources

	err = json.NewDecoder(resp.Body).Decode(&sources)
	if err != nil {
		log.Fatalf("Internal error: %s", err)
	}
	resp.Body.Close()

	sourceUid := sources.Sources[0].Children[0].Children[0].ID
	resp, err = http.Get(fmt.Sprintf(KabbalahmediaFilesUrl, sources.Sources[0].Children[0].Children[0].ID))
	if err != nil {
		log.Fatalf("Internal error: %s", err)
	}
	var files ArchiveFiles

	err = json.NewDecoder(resp.Body).Decode(&files)
	if err != nil {
		log.Fatalf("Internal error: %s", err)
	}
	resp.Body.Close()

	var fileUid string
	for _, file := range files.ContentUnits[0].Files {
		if file.Language == language {
			fileUid = file.ID
			break
		}
	}

	resp, err = http.Get(fmt.Sprintf(KabbalahmediaCdnUrl, fileUid))
	if err != nil {
		log.Fatalf("Internal error: %s", err)
	}

	defer resp.Body.Close()

	// Check if the response status code is successful
	if resp.StatusCode != http.StatusOK {
		fmt.Printf("Received non-successful status code: %d\n", resp.StatusCode)
		return
	}

	res, _, err := docconv.ConvertDocx(resp.Body)
	if err != nil {
		log.Fatal(err)
	}
	contents := strings.Split(strings.TrimSpace(res), "\n")
	for idx, content := range contents {
		if len(content) > 0 {
			subtitle := Subtitle{
				SourceUid:      sourceUid,
				FileUid:        fileUid,
				FileSourceType: KabbalahmediaFileSourceType,
				Subtitle:       content,
				OrderNumber:    idx,
				Language:       language,
			}
			database.Create(&subtitle)
		}
	}
}
