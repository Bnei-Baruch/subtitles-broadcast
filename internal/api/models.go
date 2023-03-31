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
	Id             int       `json:"id"`
	BookId         int       `json:"book_id"`
	Content        string    `json:"content"`
	Type           string    `json:"type"`
	ParagraphOrder int       `json:"paragraph_order"`
	Page           int       `json:"page"`
	CreatedAt      time.Time `json:"created_at"`
	UpdatedAt      time.Time `json:"updated_at"`
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
	Text   string `gorm:"column:text" json:"text"`
	Author string `gorm:"column:author" json:"author"`
	Type   string `gorm:"column:type" json:"type"`
	Title  string `gorm:"column:title" json:"title"`
}
