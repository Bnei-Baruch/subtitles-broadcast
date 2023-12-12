package api

import (
	"encoding/json"
	"errors"
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
	// checking if slide table has data
	var slideCount int64
	if err := database.Table("slides").Count(&slideCount).Error; err != nil {
		log.Fatalf("Internal error: %s", err)
	}
	// If so then does not import archive data for slides
	if slideCount > 0 {
		log.Println("Importing archive data has already done before")
		return
	}
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

		// Import/Migration function should be used once. Loads all sources, their content and splits them to slides.
		// TODO: Currently will load only one source. Make it go over all sources.
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
					FileUid:     newFile.FileUid,
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

// Update source_paths table(to sync source data regularly)
func updateSourcePath(database *gorm.DB, languageCodes []string) {
	sourcePathsToCheck := [][]interface{}{}
	sourcePathsToInsert := []*SourcePath{}
	for _, languageCode := range languageCodes {
		resp, err := http.Get(fmt.Sprintf(KabbalahmediaSourcesUrl, languageCode))
		if err != nil {
			log.Printf("Internal error: %s", err)
			return
		}
		var sources ArchiveSources

		err = json.NewDecoder(resp.Body).Decode(&sources)
		if err != nil {
			log.Printf("Internal error: %s", err)
			return
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

		// Import/Migration function should be used once. Loads all sources, their content and splits them to slides.
		// TODO: Currently will load only one source. Make it go over all sources.
		sourceUid := sources.Sources[0].Children[0].Children[0].ID
		sourcePath, err := getSourcePath(sourceUid, languageCode)
		if err != nil {
			log.Printf("Internal error: %s", err)
			return
		}
		sourcePathsToCheck = append(sourcePathsToCheck, []interface{}{languageCode, sourceUid, sourcePath})
		sourcePathsToInsert = append(sourcePathsToInsert, &SourcePath{Language: languageCode, SourceUid: sourceUid, Path: sourcePath})
	}
	// Compare sources in db with source from archive
	// Get source list to be deleted from db(means sources are no more existed in archive)
	sourcePathsToDelete := []*SourcePath{}
	result := database.Debug().Where("(source_uid, path) NOT IN (?)", sourcePathsToCheck).Find(&sourcePathsToDelete)
	if result.RowsAffected == 0 {
		log.Printf("No source path")
	}
	tx := database.Debug().Begin()
	if tx.Error != nil {
		log.Printf("Internal error: %s", tx.Error)
		return
	}
	// Delete source list to be delete we get from above
	for _, sourcePathToDelete := range sourcePathsToDelete {
		err := tx.Delete(&sourcePathToDelete).Error
		if err != nil {
			tx.Rollback()
			log.Printf("Internal error: %s", err)
			return
		}
	}
	// Insert source list to db
	for _, sourcePathToInsert := range sourcePathsToInsert {
		err := database.Debug().First(&sourcePathToInsert).Error
		if err != nil {
			// insert only the ones not in db
			if errors.Is(err, gorm.ErrRecordNotFound) {
				err = tx.Create(&sourcePathToInsert).Error
				if err != nil {
					tx.Rollback()
					log.Printf("Internal error: %s", err)
					return
				}
			}
		}
	}
	err := tx.Commit().Error
	if err != nil {
		log.Printf("Internal error: %s", err)
		return
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

// Get proper data to make source path from sources url
func getSourcePath(sourceUid, language string) (string, error) {
	resp, err := http.Get(fmt.Sprintf(KabbalahmediaSourcesUrl, language))
	if err != nil {
		log.Fatalf("Internal error: %s", err)
	}
	var data map[string][]interface{}
	err = json.NewDecoder(resp.Body).Decode(&data)
	if err != nil {
		log.Println("Error:", err)
		return "", err
	}
	resp.Body.Close()
	for _, source := range data["sources"] {
		if source.(map[string]interface{})["children"] != nil {
			for _, child1 := range source.(map[string]interface{})["children"].([]interface{}) {
				if child1.(map[string]interface{})["children"] != nil {
					for _, child2 := range child1.(map[string]interface{})["children"].([]interface{}) {
						child2Data := child2.(map[string]interface{})
						if child2Data["id"].(string) == sourceUid {
							sourceData := source.(map[string]interface{})
							return sourceData["full_name"].(string) + "(" + sourceData["name"].(string) + ") / " + child2Data["type"].(string) + " / " + child2Data["name"].(string), nil
						}
					}
				}
			}
		}
	}
	return "", fmt.Errorf("no source path data")
}
