package database

import (
	"fmt"

	log "github.com/sirupsen/logrus"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

func NewPostgres(url string) (*gorm.DB, error) {
	client, err := gorm.Open(postgres.Open(url), &gorm.Config{})
	if err != nil {
		log.Error(err)
		return nil, fmt.Errorf("failed to open postgres conn: %w", err)
	}
	return client, nil
}
