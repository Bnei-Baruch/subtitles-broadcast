package database

import (
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

func New(url string) (*gorm.DB, error) {
	db, err := gorm.Open(postgres.Open(url), cfg)
	if err != nil {
		return nil, fmt.Errorf("failed to open postgres conn: %w", err)
	}
	return db, nil
}
