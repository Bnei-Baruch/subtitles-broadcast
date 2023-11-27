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
	UploadFileSourceType        = "upload"
)

// Get source data by language and insert downloaded data to slide table
// (slide data initialization)
func archiveDataCopy(database *gorm.DB, languageCodes []string) {
	for _, languageCode := range languageCodes {
		resp, err := http.Get(fmt.Sprintf(KabbalahmediaSourcesUrl, languageCode))
		if err != nil {
			log.Fatalf("Internal error: %s", err)
		}
		var sources ArchiveSources

		err = json.NewDecoder(resp.Body).Decode(&sources)
		if err != nil {
			log.Fatalf("Internal error: %s", err)
		}
		resp.Body.Close()

		// for _, source := range sources.Sources {
		// 	for _, child1 := range source.Children {
		// 		for _, child2 := range child1.Children {
		//			sourceUid := child2.ID
		// 		}
		// 	}
		// }
		// - will use for all slides in the future
		sourceUid := sources.Sources[0].Children[0].Children[0].ID
		contents, fileUid, err := getFileContent(sourceUid, languageCode)
		if err != nil {
			log.Fatalf("Internal error: %s", err)
		}
		tx := database.Debug().Begin()
		if tx.Error != nil {
			log.Fatalf("Internal error: %s", err)
		}
		newFile := File{
			Type:      KabbalahmediaFileSourceType,
			Language:  languageCode,
			SourceUid: sourceUid,
			FileUid:   fileUid,
		}
		if err := tx.Create(&newFile).Error; err != nil {
			tx.Rollback()
			log.Fatalf("Internal error: %s", err)
		}
		for idx, content := range contents {
			if len(content) > 0 {
				slide := Slide{
					FileId:      newFile.ID,
					Slide:       content,
					OrderNumber: idx,
				}
				if err := tx.Create(&slide).Error; err != nil {
					tx.Rollback()
					log.Fatalf("Internal error: %s", err)
				}
			}
		}
		if err := tx.Commit().Error; err != nil {
			log.Fatalf("Internal error: %s", err)
		}
	}
}

// Download the file, convert the file content to string and return it
func getFileContent(sourceUid, language string) ([]string, string, error) {
	resp, err := http.Get(fmt.Sprintf(KabbalahmediaFilesUrl, sourceUid))
	if err != nil {
		log.Printf("Internal error: %s", err)
		return nil, "", err
	}
	var files ArchiveFiles

	err = json.NewDecoder(resp.Body).Decode(&files)
	if err != nil {
		log.Printf("Internal error: %s", err)
		return nil, "", err
	}
	resp.Body.Close()

	if len(files.ContentUnits) == 0 {
		return nil, "", fmt.Errorf("no content units")
	}

	var fileUid string
	for _, file := range files.ContentUnits[0].Files {
		if file.Language == language {
			fileUid = file.ID
			break
		}
	}

	resp, err = http.Get(fmt.Sprintf(KabbalahmediaCdnUrl, fileUid))
	if err != nil {
		log.Printf("Internal error: %s", err)
		return nil, "", err
	}

	defer resp.Body.Close()

	// Check if the response status code is successful
	if resp.StatusCode != http.StatusOK {
		err := fmt.Errorf("received non-successful status code: %d", resp.StatusCode)
		log.Println(err)
		return nil, "", err
	}

	res, _, err := docconv.ConvertDocx(resp.Body)
	if err != nil {
		log.Printf("Internal error: %s", err)
		return nil, "", err
	}
	return strings.Split(strings.TrimSpace(res), "\n"), fileUid, nil
}
