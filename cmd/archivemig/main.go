package main

import (
	"encoding/json"
	"fmt"
	"io"

	"net/http"

	log "github.com/sirupsen/logrus"

	"gitlab.com/gitlab.bbdev.team/vh/broadcast-subtitles/internal/archive"
)

func main() {
	resp, err := http.Get("https://kabbalahmedia.info/backend/sqdata?language=en")
	if err != nil {
		log.Fatalf("Internal error: %s", err)
	}
	var sources archive.ArchiveSources

	err = json.NewDecoder(resp.Body).Decode(&sources)
	if err != nil {
		log.Fatalf("Internal error: %s", err)
	}
	resp.Body.Close()

	resp, err = http.Get(fmt.Sprintf("https://kabbalahmedia.info/backend/content_units?id=%s&with_files=true", sources.Sources[0].Children[0].Children[0].Id))
	if err != nil {
		log.Fatalf("Internal error: %s", err)
	}
	var files archive.ArchiveFiles

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

	docContent, err := io.ReadAll(resp.Body)
	if err != nil {
		fmt.Println("Error reading response body:", err)
		return
	}

	// Now you can work with the docContent byte slice as needed
	fmt.Println("Retrieved document content:", string(docContent))
}
