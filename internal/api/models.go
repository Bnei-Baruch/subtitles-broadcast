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
	Id        int       `json:"id"`
	BookId    int       `json:"book_id"`
	Content   string    `json:"content"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

type Bookmark struct {
	Id        int       `json:"id"`
	BookId    int       `json:"book_id"`
	ContentId int       `json:"content_id"`
	Path      string    `json:"path"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}
