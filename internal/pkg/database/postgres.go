package database

import (
	"fmt"

	log "github.com/sirupsen/logrus"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

const (
	maxIdleconns = 10
	maxOpenConns = 100
)

func NewPostgres(url string) (*gorm.DB, error) {
	client, err := gorm.Open(postgres.Open(url), &gorm.Config{})
	if err != nil {
		log.Error(err)
		return nil, fmt.Errorf("failed to open postgres conn: %w", err)
	}
	// Set the maximum number of idle connections in the pool
	sqlDB, err := client.DB()
	if err != nil {
		log.Fatal(err)
	}
	sqlDB.SetMaxIdleConns(maxIdleconns)

	// Set the maximum number of open connections in the pool
	sqlDB.SetMaxOpenConns(maxOpenConns)

	return client, nil
}
