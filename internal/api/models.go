package api

import (
	"time"
)

// pagination model

type Pagination struct {
	Limit      int   `json:"limit"`
	Page       int   `json:"page"`
	TotalRows  int64 `json:"total_rows"`
	TotalPages int   `json:"total_pages"`
}

// api model

type File struct {
	ID        uint   `json:"id"`
	Type      string `json:"type"`
	Language  string `json:"language"`
	Filename  string `json:"filename"`
	Content   []byte `json:"content"`
	SourceUid string `json:"source_uid"`
	FileUid   string `json:"file_uid"`
}

type Bookmark struct {
	ID      uint   `json:"id"`
	SlideId int    `json:"slide_id"`
	UserId  string `json:"user_id"`
}

type Slide struct {
	ID              uint      `gorm:"primarykey"`
	FileId          uint      `json:"file_id"`
	SlideSourcePath string    `json:"slide_source_path,omitempty" gorm:"->"` // author/type/title/slide_id
	Bookmarked      bool      `json:"bookmarked" gorm:"->"`
	SourceUid       string    `json:"source_uid" gorm:"->"`
	Slide           string    `json:"slide"`
	OrderNumber     int       `json:"order_number"`
	CreatedAt       time.Time `json:"created_at"`
	UpdatedAt       time.Time `json:"updated_at"`
}

type SourcePath struct {
	ID        uint   `json:"id"`
	Language  string `json:"language"`
	SourceUid string `json:"source_uid"`
	Path      string `json:"path"`
}

// archive model

type ArchiveSources struct {
	Sources []*Source `json:"sources"`
}

type Source struct {
	ID       string    `json:"id"`
	Name     string    `json:"name"`
	Children []*Source `json:"children,omitempty"`
}

type ArchiveFiles struct {
	Total        int            `json:"total"`
	ContentUnits []*ContentUnit `json:"content_units"`
}

type ContentUnit struct {
	ID          string      `json:"id"`
	ContentType string      `json:"content_type"`
	FilmType    string      `json:"film_type,"`
	Files       []*FileData `json:"files"`
}

type FileData struct {
	ID             string  `json:"id"`
	Name           string  `json:"name"`
	Size           int     `json:"size"`
	Language       string  `json:"language"`
	MimeType       string  `json:"mimetype"`
	Type           string  `json:"type"`
	InsertType     string  `json:"insert_type"`
	IsHls          bool    `json:"is_hls"`
	VideoQualities *string `json:"video_qualities"`
}

type AchiveTempData struct {
	Texts []string
	File  *File
}
