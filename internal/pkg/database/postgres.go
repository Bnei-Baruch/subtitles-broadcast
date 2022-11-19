package database

import (
	"fmt"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

func New(url string) (*gorm.DB, error) {
	db, err := gorm.Open(postgres.Open(url), &gorm.Config{})
	if err != nil {
		return nil, fmt.Errorf("failed to open postgres conn: %w", err)
	}
	return db, nil
}
