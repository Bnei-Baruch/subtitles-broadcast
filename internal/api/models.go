package api

import (
	"time"
)

type Book struct {
	Id        int       `json:"id"`
	Author    string    `json:"author"`
	Title     string    `json:"title"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

type Content struct {
	Id     int `json:"id"`
	BookId int `json:"book_id"`
	//Type           string    `json:"type"`
	Page      string    `json:"page"`
	Letter    string    `json:"letter"`
	Subletter string    `json:"subletter"`
	Revert    string    `json:"revert"`
	Content   string    `json:"content"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

type Bookmark struct {
	Id        int       `json:"id"`
	BookId    int       `json:"book_id"`
	ContentId int       `json:"content_id"`
	Path      string    `json:"path"`
	User      string    `json:"user"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

type Archive struct {
	Id     string  `gorm:"column:id" json:"id"`
	Text   string  `gorm:"column:text" json:"text"`
	Author string  `gorm:"column:author" json:"author"`
	Type   *string `gorm:"column:type" json:"type"`
	Title  string  `gorm:"column:title" json:"title"`
}

type Pagination struct {
	Limit      int   `json:"limit"`
	Page       int   `json:"page"`
	TotalRows  int64 `json:"total_rows"`
	TotalPages int   `json:"total_pages"`
}

type UsersSelectedContent struct {
	UserID    string
	ContentID int
	CreatedAt time.Time
	UpdatedAt time.Time
}

type UsersLastActivatedContent struct {
	UserID    string
	ContentID int
	CreatedAt time.Time
	UpdatedAt time.Time
}
