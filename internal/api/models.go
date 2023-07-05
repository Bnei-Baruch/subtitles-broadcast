package api

import (
	"gorm.io/gorm"
)

type Book struct {
	gorm.Model
	Author string `json:"author"`
	Title  string `json:"title"`
}

type Content struct {
	gorm.Model
	BookId       int    `json:"book_id" gorm:"type:integer"`
	Page         string `json:"page"`
	Letter       string `json:"letter"`
	Subletter    string `json:"subletter"`
	Revert       string `json:"revert"`
	Content      string `json:"content"`
	PageInt      int    `json:"page_int" gorm:"type:integer"`
	LetterInt    int    `json:"letter_int" gorm:"type:integer"`
	SubLetterInt int    `json:"subletter_int" gorm:"type:integer"`
}

type Bookmark struct {
	gorm.Model
	BookId    int    `json:"book_id"`
	ContentId int    `json:"content_id"`
	Path      string `json:"path"`
	User      string `json:"user"`
}

type Archive struct {
	Id       string  `json:"id"`
	Text     string  `json:"text"`
	Author   string  `json:"author"`
	BookName *string `json:"book_name"`
	Title    string  `json:"title"`
}

type Pagination struct {
	Limit      int   `json:"limit"`
	Page       int   `json:"page"`
	TotalRows  int64 `json:"total_rows"`
	TotalPages int   `json:"total_pages"`
}

type BookContent struct {
	RowNum    int
	ContentID int
	Title     string
	Page      int
	Letter    string
	Subletter string
	Content   string
}

type UserBook struct {
	BookTitle     string   `json:"book_title"`
	LastActivated string   `json:"last_activated"`
	Contents      []string `json:"contents"`
}
