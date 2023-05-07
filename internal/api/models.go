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
	Text   string  `gorm:"column:text" json:"text"`
	Author string  `gorm:"column:author" json:"author"`
	Type   *string `gorm:"column:type" json:"type"`
	Title  string  `gorm:"column:title" json:"title"`
}
