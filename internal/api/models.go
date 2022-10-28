package api

import (
	"time"
)

type Subtitle struct {
	Id        int       `json:"id"`
	Author    string    `json:"author"`
	Title     string    `json:"title"`
	Content   string    `json:"content"`
	Slides    string    `json:"slides"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

type Bookmark struct {
	Id       int    `json:"id"`
	Book     string `json:"book"`
	BookName string `json:"book_name"`
	Page     int    `json:"page"`
	Letter   string `json:"letter"`
}
