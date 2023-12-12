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
	ID          uint      `gorm:"primarykey"`
	FileUid     string    `json:"file_uid"`
	Slide       string    `json:"slide"`
	OrderNumber int       `json:"order_number"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

type SlideDetail struct {
	Slide
	SlideSourcePath string `json:"slide_source_path" gorm:"->"` // author/type/title/slide_id
	Bookmarked      bool   `json:"bookmarked" gorm:"->"`
	SourceUid       string `json:"source_uid" gorm:"->"`
}

type SourcePath struct {
	ID        uint   `json:"id"`
	Language  string `json:"language"`
	SourceUid string `json:"source_uid"`
	Path      string `json:"path"`
}

// archive model

type ArchiveSources struct {
	Sources    []*Source    `json:"sources"`
	Tags       []*Tag       `json:"tags"`
	Publishers []*Publisher `json:"publishers"`
	Persons    []*Person    `json:"persons"`
}

type Source struct {
	ID       string         `json:"id"`
	Name     string         `json:"name"`
	FullName string         `json:"full_name"`
	Children []*SourceChild `json:"children,omitempty"`
}

type SourceChild struct {
	ID       string         `json:"id"`
	ParentId string         `json:"parent_id"`
	Type     string         `json:"type"`
	Name     string         `json:"name"`
	Children []*SourceChild `json:"children,omitempty"`
}

type Tag struct {
	ID       string `json:"id"`
	ParentId string `json:"parent_id"`
	Label    string `json:"label"`
	Children []*Tag `json:"children,omitempty"`
}

type Publisher struct {
	ID          string  `json:"id"`
	Name        string  `json:"name"`
	Description *string `json:"description"`
}

type Person struct {
	ID   string `json:"id"`
	Name string `json:"name"`
}

type ArchiveFiles struct {
	Total        int            `json:"total"`
	ContentUnits []*ContentUnit `json:"content_units"`
}

type ContentUnit struct {
	ID          string      `json:"id"`
	ContentType string      `json:"content_type"`
	FilmType    string      `json:"film_type"`
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
