package archive

type ArchiveSources struct {
	Sources    []*Source    `json:"sources"`
	Tags       []*Tag       `json:"tags"`
	Publishers []*Publisher `json:"publishers"`
	Persons    []*Person    `json:"persons"`
}

type Source struct {
	Id       string         `json:"id"`
	Name     string         `json:"name"`
	FullName string         `json:"full_name"`
	Children []*SourceChild `json:"children,omitempty"`
}

type SourceChild struct {
	Id       string         `json:"id"`
	ParentId string         `json:"parent_id"`
	Type     string         `json:"type"`
	Name     string         `json:"name"`
	Children []*SourceChild `json:"children,omitempty"`
}

type Tag struct {
	Id       string `json:"id"`
	ParentId string `json:"parent_id"`
	Label    string `json:"label"`
	Children []*Tag `json:"children,omitempty"`
}

type Publisher struct {
	Id          string  `json:"id"`
	Name        string  `json:"name"`
	Description *string `json:"description"`
}

type Person struct {
	Id   string `json:"id"`
	Name string `json:"name"`
}

type ArchiveFiles struct {
	Total        int            `json:"total"`
	ContentUnits []*ContentUnit `json:"content_units"`
}

type ContentUnit struct {
	Id          string  `json:"id"`
	ContentType string  `json:"content_type"`
	FilmType    string  `json:"film_type"`
	Files       []*File `json:"files"`
}

type File struct {
	Id             string  `json:"id"`
	Name           string  `json:"name"`
	Size           int     `json:"size"`
	Language       string  `json:"language"`
	MimeType       string  `json:"mimetype"`
	Type           string  `json:"type"`
	InsertType     string  `json:"insert_type"`
	IsHls          bool    `json:"is_hls"`
	VideoQualities *string `json:"video_qualities"`
}
