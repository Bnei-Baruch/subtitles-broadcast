package api

import (
	"time"
)

type Book struct {
	Id        int       `json:"id"`
	Author    string    `json:"author"`
	Title     string    `json:"title"`
	Content   string    `json:"content"`
	Slides    string    `json:"slides"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

type Bookmark struct {
	Id        int       `json:"id"`
	Author    string    `json:"author"`
	Book      string    `json:"book"`
	Page      int       `json:"page"`
	Letter    string    `json:"letter"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
	BookName  string    `json:"book_name"`
}
