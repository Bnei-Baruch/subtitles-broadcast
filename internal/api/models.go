package api

import (
	"gorm.io/gorm"
)

type File struct {
	Id      int    `json:"id"`
	Name    string `json:"name"`
	Content []byte `json:"content"`
}

type FileSource struct {
	Id   int    `json:"id"`
	Name string `json:"name"`
}

type Bookmark struct {
	Id         int    `json:"id"`
	SubtitleId string `json:"subtitle_id"`
}

type Subtitle struct {
	gorm.Model
	Id             int    `json:"id"`
	FileUid        string `json:"file_uid"`
	FileSourceType string `json:"file_source_type"`
	Subtitle       string `json:"subtitle"`
	OrderNumber    int    `json:"order_number"`
}
