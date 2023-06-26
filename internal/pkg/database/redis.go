package database

import (
	"fmt"

	"github.com/redis/go-redis/v9"
	log "github.com/sirupsen/logrus"
)

func NewRedis(url string) (*redis.Client, error) {
	opt, err := redis.ParseURL(url)
	if err != nil {
		log.Error(err)
		return nil, fmt.Errorf("failed to open redis conn: %w", err)
	}

	return redis.NewClient(opt), nil
}
