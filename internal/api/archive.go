package api

import (
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"sync"
	"time"

	"net/http"

	"code.sajari.com/docconv"
	log "github.com/sirupsen/logrus"
	"gorm.io/gorm"
)

var (
	errs = []string{}
)

const (
	KabbalahmediaSourcesUrl = "https://kabbalahmedia.info/backend/sqdata?language=%s"
	KabbalahmediaFilesUrl   = "https://kabbalahmedia.info/backend/content_units?id=%s&with_files=true"
	KabbalahmediaCdnUrl     = "https://cdn.kabbalahmedia.info/%s"

	KabbalahmediaFileSourceType = "archive"
	UploadFileSourceType        = "upload"

	DocType  = "application/msword"
	DocxType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
	DocxPdf  = "application/pdf"
)

// Get source data by language and insert downloaded data to slide table
// (slide data initialization)
func archiveDataCopy(database *gorm.DB, sourcePaths []*SourcePath) {
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
	//getFileContent("Nw0ew8p4", "he")

	var wg sync.WaitGroup
	contents := make([]*AchiveTempData, len(sourcePaths))
	log.Printf("Importing %d sources is started", len(sourcePaths))
	for idx, sourcePath := range sourcePaths {
		wg.Add(1)
		go func(idx int, sourcePath *SourcePath) {
			defer wg.Done()
			texts, fileUid, err := getFileContent(sourcePath.SourceUid, sourcePath.Language)
			if err != nil {
				log.Fatalf("Internal error: %s, sourceUid: %s, language: %s", err, sourcePath.SourceUid, sourcePath.Language)
			}
			log.Printf("%d Finished loading file content. sourceUid: %s, fileUid: %s", idx, sourcePath.SourceUid, fileUid)
			if len(texts) > 0 {
				contents[idx] = &AchiveTempData{
					Texts: texts,
					File: &File{
						Type:      KabbalahmediaFileSourceType,
						Language:  sourcePath.Language,
						SourceUid: sourcePath.SourceUid,
						FileUid:   fileUid,
					},
				}
			}
		}(idx, sourcePath)
		time.Sleep(time.Second / 30)
	}
	wg.Wait()

	for _, content := range contents {
		if content != nil {
			tx := database.Debug().Begin()
			if tx.Error != nil {
				log.Fatalf("Internal error: %s, sourceUid: %s, language: %s", tx.Error, content.File.SourceUid, content.File.Language)
			}
			newFile := content.File
			if err := tx.Create(newFile).Error; err != nil {
				tx.Rollback()
				log.Fatalf("Internal error: %s, file: %+v", err, newFile)
			}
			for idx, text := range content.Texts {
				if len(text) > 0 {
					slide := Slide{
						FileId:      newFile.ID,
						Slide:       text,
						OrderNumber: idx,
					}
					if err := tx.Create(&slide).Error; err != nil {
						tx.Rollback()
						log.Fatalf("Internal error: %s, slide: %+v", err, slide)
					}
				}
			}
			if err := tx.Commit().Error; err != nil {
				log.Fatalf("Internal error: %s, sourceUid: %s, language: %s", err, content.File.SourceUid, content.File.Language)
			}
		}
	}

	// for _, sourcePath := range sourcePaths {
	// 	contents, fileUid, err := getFileContent(sourcePath.SourceUid, sourcePath.Language)
	// 	if err != nil {
	// 		log.Fatalf("Internal error: %s, sourceUid: %s, language: %s", err, sourcePath.SourceUid, sourcePath.Language)
	// 	}
	// 	if len(contents) == 0 {
	// 		continue
	// 	}
	// 	tx := database.Debug().Begin()
	// 	if tx.Error != nil {
	// 		log.Fatalf("Internal error: %s, sourceUid: %s, language: %s", tx.Error, sourcePath.SourceUid, sourcePath.Language)
	// 	}
	// 	newFile := File{
	// 		Type:      KabbalahmediaFileSourceType,
	// 		Language:  sourcePath.Language,
	// 		SourceUid: sourcePath.SourceUid,
	// 		FileUid:   fileUid,
	// 	}
	// 	if err := tx.Create(&newFile).Error; err != nil {
	// 		tx.Rollback()
	// 		log.Fatalf("Internal error: %s, file: %+v", err, newFile)
	// 	}
	// 	for idx, content := range contents {
	// 		if len(content) > 0 {
	// 			slide := Slide{
	// 				FileId:      newFile.ID,
	// 				Slide:       content,
	// 				OrderNumber: idx,
	// 			}
	// 			if err := tx.Create(&slide).Error; err != nil {
	// 				tx.Rollback()
	// 				log.Fatalf("Internal error: %s, slide: %+v", err, slide)
	// 			}
	// 		}
	// 	}
	// 	if err := tx.Commit().Error; err != nil {
	// 		log.Fatalf("Internal error: %s, sourceUid: %s, language: %s", err, sourcePath.SourceUid, sourcePath.Language)
	// 	}
	// }
}

// Update source_paths table(to sync source data regularly)
func updateSourcePath(database *gorm.DB, sourcePaths []*SourcePath) {
	sourcePathsToCheck := [][]interface{}{}
	sourcePathsToInsert := []*SourcePath{}
	for _, path := range sourcePaths {
		sourcePathsToCheck = append(sourcePathsToCheck, []interface{}{path.Language, path.SourceUid, path.Path})
		sourcePathsToInsert = append(sourcePathsToInsert, path)
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
	fileResp, err := http.Get(fmt.Sprintf(KabbalahmediaFilesUrl, sourceUid))
	if err != nil {
		log.Printf("Internal error: %s, sourceUid: %s", err, sourceUid)
		return nil, "", err
	}
	var files ArchiveFiles
	err = json.NewDecoder(fileResp.Body).Decode(&files)
	if err != nil {
		log.Printf("Internal error: %s, sourceUid: %s", err, sourceUid)
		return nil, "", err
	}
	fileResp.Body.Close()
	if files.Total == 0 {
		return []string{}, "", nil
	}
	var fileUid, fileType string
	for _, contentUnit := range files.ContentUnits {
		for _, file := range contentUnit.Files {
			if file.Language == language {
				if file.MimeType != DocType &&
					file.MimeType != DocxType &&
					file.MimeType != DocxPdf {
					errs = append(errs, fmt.Sprintf("sourceUid: %s, fileUid: %s, fileType: %s. NOT TEXT", sourceUid, file.ID, file.MimeType))
					log.Printf("File type is not a text, %s. sourceUid: %s, fileUid: %s", file.MimeType, sourceUid, file.ID)
					return []string{}, "", nil
				}
				fileUid = file.ID
				fileType = file.MimeType
				break
			}
		}
	}
	if fileUid == "" {
		return []string{}, "", nil
	}
	contentResp, err := http.Get(fmt.Sprintf(KabbalahmediaCdnUrl, fileUid))
	if err != nil {
		log.Printf("Internal error: %s, sourceUid: %s, fileUid: %s", err, sourceUid, fileUid)
		return nil, "", err
	}

	defer contentResp.Body.Close()
	// Check if the response status code is successful
	if contentResp.StatusCode != http.StatusOK {
		errs = append(errs, fmt.Sprintf("sourceUid: %s, fileUid: %s, NOT FOUND", sourceUid, fileUid))
		err := fmt.Errorf("received non-successful status code: %d", contentResp.StatusCode)
		log.Printf("Internal error: %s, sourceUid: %s, fileUid: %s", err, sourceUid, fileUid)
		if contentResp.StatusCode == http.StatusNotFound {
			return []string{}, "", nil
		}
		return nil, "", err
	}

	res := ""
	if fileType == DocType {
		res, _, err = docconv.ConvertDoc(contentResp.Body)
		if err != nil {
			log.Printf("Internal error: %s, sourceUid: %s, fileUid: %s", err, sourceUid, fileUid)
			return nil, "", err
		}
	} else if fileType == DocxType {
		res, _, err = docconv.ConvertDocx(contentResp.Body)
		if err != nil {
			log.Printf("Internal error: %s, sourceUid: %s, fileUid: %s", err, sourceUid, fileUid)
			return nil, "", err
		}
	} else if fileType == DocxPdf {
		res, _, err = docconv.ConvertPDF(contentResp.Body)
		if err != nil {
			log.Printf("Internal error: %s, sourceUid: %s, fileUid: %s", err, sourceUid, fileUid)
			return nil, "", err
		}
	}

	return strings.Split(strings.TrimSpace(res), "\n"), fileUid, nil
}

func getSourcePathListByLanguage(languageCodes []string) ([]*SourcePath, error) {
	sourcePaths := []*SourcePath{}
	for _, languageCode := range languageCodes {
		resp, err := http.Get(fmt.Sprintf(KabbalahmediaSourcesUrl, languageCode))
		if err != nil {
			log.Printf("Internal error: %s", err)
			return nil, err
		}
		var sources ArchiveSources

		err = json.NewDecoder(resp.Body).Decode(&sources)
		if err != nil {
			log.Printf("Internal error: %s", err)
			return nil, err
		}
		resp.Body.Close()
		for _, source := range sources.Sources {
			getSourcePath(&sourcePaths, source, languageCode, "")
		}
	}
	return sourcePaths, nil
}

// Get proper data to make source path from sources url
func getSourcePath(sourcePaths *[]*SourcePath, source *Source, language, path string) {
	delimter := " / "
	if path == "" {
		delimter = ""
	}
	currentPath := path + delimter + source.Name
	sourcePath := SourcePath{
		SourceUid: source.ID,
		Language:  language,
		Path:      currentPath,
	}
	*sourcePaths = append(*sourcePaths, &sourcePath)
	if source.Children != nil {
		for _, child := range source.Children {
			getSourcePath(sourcePaths, child, language, currentPath)
		}
	} else {
		return
	}
}
