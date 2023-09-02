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

func archiveMigration(database *gorm.DB) {
	resp, err := http.Get("https://kabbalahmedia.info/backend/sqdata?language=en")
	if err != nil {
		log.Fatalf("Internal error: %s", err)
	}
	var sources ArchiveSources

	err = json.NewDecoder(resp.Body).Decode(&sources)
	if err != nil {
		log.Fatalf("Internal error: %s", err)
	}
	resp.Body.Close()

	resp, err = http.Get(fmt.Sprintf("https://kabbalahmedia.info/backend/content_units?id=%s&with_files=true", sources.Sources[0].Children[0].Children[0].Id))
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
		if file.Language == "en" {
			fileUid = file.Id
			break
		}
	}

	resp, err = http.Get(fmt.Sprintf("https://cdn.kabbalahmedia.info/%s", fileUid))
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
	for i, content := range contents {
		if len(content) > 0 {
			subtitle := Subtitle{
				FileUid:        fileUid,
				FileSourceType: "archive",
				Subtitle:       content,
				OrderNumber:    i,
			}
			database.Create(&subtitle)
		}
	}
}
