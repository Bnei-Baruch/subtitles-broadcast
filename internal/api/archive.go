package api

import (
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"sync"

	"net/http"

	"code.sajari.com/docconv"
	log "github.com/sirupsen/logrus"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

var (
	archiveDataCopyErrors = []error{}
	// for testing only. 16 files for 4 languages
	sourceUidList = map[string]struct{}{
		"tswzgnWk": {},
		"1vCj4qN9": {},
		"ALlyoveA": {},
		"h3FdlLJY": {},
	}
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

	DBTableFiles       = "files"
	DBTableSourcePaths = "source_paths"

	ConcurrencyLimit = 250
)

// Get source data by language and insert downloaded data to slide table
// (slide data initialization)
func archiveDataCopy(database *gorm.DB, sourcePaths []*SourcePath) {
	// Checking if file table has data (avoid to add duplicated file data from source)
	var uniqueFiles []File
	if err := database.Table(DBTableFiles).Table("files").Distinct("source_uid").
		Find(&uniqueFiles).Error; err != nil {
		log.Fatalf("Internal error: %s", err)
	}
	// Remove keys(source uid in file table) from source uid list to import
	// The source uid in file table means all files related to source uid has imported
	// No need import again
	for _, uniqueFile := range uniqueFiles {
		delete(sourceUidList, uniqueFile.SourceUid)
	}
	// And there is no new file to import then no need to do the rest of import process
	// Just skip
	if len(sourceUidList) == 0 {
		log.Println("Importing archive data has already done before")
		return
	}

	// Download file contents from source and file apis.
	// Downloading contents from urls is quite a lot of work and made process slow.
	// So get all file contents first. But contents order is important.
	// The contents will be inserted into DB by order so go routines are applied to only here.
	var wg sync.WaitGroup
	sem := make(chan struct{}, ConcurrencyLimit)
	contents := make([]*AchiveTempData, len(sourcePaths))
	log.Printf("Importing %d sources is started", len(sourcePaths))
	for idx, sourcePath := range sourcePaths {
		// for testing only. 16 files for 4 languages
		if _, ok := sourceUidList[sourcePath.SourceUid]; ok {
			wg.Add(1)
			sem <- struct{}{}
			go func(idx int, sourcePath *SourcePath) {
				defer func() {
					<-sem
					wg.Done()
				}()
				texts, fileUid := getFileContent(sourcePath.SourceUid, sourcePath.Language)
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
		}
	}
	wg.Wait()
	// Insert all slide data(including slide) into tables
	tx := database.Debug().Begin()
	if tx.Error != nil {
		log.Fatalf("Internal error: %s", tx.Error)
	}
	for _, content := range contents {
		if content != nil {
			newFile := content.File
			if err := tx.Create(newFile).Error; err != nil {
				tx.Rollback()
				log.Fatalf("Internal error: %s, file: %+v", err, newFile)
			}
			for idx, text := range content.Texts {
				if len(text) > 0 {
					slide := Slide{
						FileUid:     newFile.FileUid,
						Slide:       text,
						OrderNumber: idx,
					}
					if err := tx.Create(&slide).Error; err != nil {
						tx.Rollback()
						log.Fatalf("Internal error: %s, slide: %+v", err, slide)
					}
				}
			}
		}
	}
	if err := tx.Commit().Error; err != nil {
		log.Fatalf("Internal error: %s", err)
	}

	// All file url are not what we want
	// like non text type file or non valid url or wrong file content
	// Get all error and list it at the end.
	for _, error := range archiveDataCopyErrors {
		log.Println(error)
	}
}

// Update source_paths table(to sync source data regularly)
func updateSourcePath(database *gorm.DB, newSourcePaths []*SourcePath) {
	currentSourcePaths := []*SourcePath{}
	err := database.Debug().Table("source_paths").Scan(&currentSourcePaths).Error
	if err != nil {
		if !errors.Is(err, gorm.ErrRecordNotFound) {
			log.Printf("Internal error: %s", err)
			return
		}
	}
	sourcePathsToDelete := map[string]*SourcePath{}
	for _, currentSourcePath := range currentSourcePaths {
		sourcePathsToDelete[currentSourcePath.SourceUid] = currentSourcePath
	}
	sourcePathsToInsert := []*SourcePath{}
	for _, newSourcePath := range newSourcePaths {
		sourcePathsToInsert = append(sourcePathsToInsert, newSourcePath)
		// Compare sources in db with source from archive
		// Remain source list to be deleted from db(means sources are no more existed in archive)
		delete(sourcePathsToDelete, newSourcePath.SourceUid)
	}
	tx := database.Debug().Begin()
	if tx.Error != nil {
		log.Printf("Internal error: %s", tx.Error)
		return
	}
	// Delete source list to be delete we get from above
	for _, sourcePathToDelete := range sourcePathsToDelete {
		err := tx.Where("id = ?", sourcePathToDelete.ID).Delete(sourcePathToDelete).Error
		if err != nil {
			tx.Rollback()
			log.Printf("Internal error: %s", err)
			return
		}
	}
	// Upsert source path by gorm way
	for _, sourcePathToInsert := range sourcePathsToInsert {
		err := database.Debug().Clauses(clause.OnConflict{
			Columns:   []clause.Column{{Name: "language"}, {Name: "source_uid"}},
			DoUpdates: clause.AssignmentColumns([]string{"path"}),
		}).Create(sourcePathToInsert).Error
		if err != nil {
			tx.Rollback()
			log.Printf("Internal error: %s", err.Error())
			return
		}
	}
	err = tx.Commit().Error
	if err != nil {
		log.Printf("Internal error: %s", err)
		return
	}
}

// Download the file, convert the file content to string and return it
func getFileContent(sourceUid, language string) ([]string, string) {
	files, err := getFiles(sourceUid)
	if err != nil {
		log.Printf("Internal error: %s, sourceUid: %s", err, sourceUid)
		return nil, ""
	}
	if files.Total == 0 {
		return []string{}, ""
	}
	var fileUid, fileType string
	// will be used for all files
	//for _, contentUnit := range files.ContentUnits {
	contentUnit := files.ContentUnits[0]
	for _, file := range contentUnit.Files {
		if file.Language == language {
			if file.MimeType != DocType &&
				file.MimeType != DocxType &&
				file.MimeType != DocxPdf {
				archiveDataCopyErrors = append(archiveDataCopyErrors, fmt.Errorf("language: %s, sourceUid: %s, fileUid: %s, fileType: %s. not text type", language, sourceUid, file.ID, file.MimeType))
				log.Printf("File type is not a text, %s. language: %s, sourceUid: %s, fileUid: %s", file.MimeType, language, sourceUid, file.ID)
				return []string{}, ""
			}
			fileUid = file.ID
			fileType = file.MimeType
			break
		}
	}
	//}
	if fileUid == "" {
		return []string{}, ""
	}
	contentResp, err := http.Get(fmt.Sprintf(KabbalahmediaCdnUrl, fileUid))
	if err != nil {
		log.Printf("Internal error: %s, sourceUid: %s, fileUid: %s", err, sourceUid, fileUid)
		return []string{}, ""
	}

	defer contentResp.Body.Close()
	// Check if the response status code is successful
	if contentResp.StatusCode != http.StatusOK {
		archiveDataCopyErrors = append(archiveDataCopyErrors, fmt.Errorf("language: %s, sourceUid: %s, fileUid: %s, file not found", language, sourceUid, fileUid))
		log.Printf("Internal error: %s, language: %s, sourceUid: %s, fileUid: %s", fmt.Errorf("received non-successful status code: %d", contentResp.StatusCode), language, sourceUid, fileUid)
		return []string{}, ""
	}

	res := ""
	if fileType == DocType {
		res, _, err = docconv.ConvertDoc(contentResp.Body)
	} else if fileType == DocxType {
		res, _, err = docconv.ConvertDocx(contentResp.Body)
	} else if fileType == DocxPdf {
		res, _, err = docconv.ConvertPDF(contentResp.Body)
	}
	if err != nil {
		archiveDataCopyErrors = append(archiveDataCopyErrors, fmt.Errorf("language: %s, sourceUid: %s, fileUid: %s, error: %s", language, sourceUid, fileUid, err))
		log.Printf("Internal error: %s, language: %s, sourceUid: %s, fileUid: %s", err, language, sourceUid, fileUid)
		return []string{}, ""
	}

	return strings.Split(strings.TrimSpace(res), "\n"), fileUid
}

func getFiles(sourceUid string) (*ArchiveFiles, error) {
	fileResp, err := http.Get(fmt.Sprintf(KabbalahmediaFilesUrl, sourceUid))
	if err != nil {
		return nil, err
	}
	var files ArchiveFiles
	err = json.NewDecoder(fileResp.Body).Decode(&files)
	if err != nil {
		return nil, err
	}
	fileResp.Body.Close()
	return &files, nil
}

func getSourcePathListByLanguages(languageCodes []string) ([]*SourcePath, error) {
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
	delimiter := " / "
	if path == "" {
		delimiter = ""
	}
	currentPath := path + delimiter + source.Name
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
	}
}
