package config

import (
	"fmt"
	"os"

	"github.com/joho/godotenv"
	log "github.com/sirupsen/logrus"
)

var (
	Version = "Dev"
	Build   = "Dev"
	Date    = "Dev"
)

const (
	EnvBssvrPort        = "SUBTITLES_BACKEND_PORT"
	EnvBssvrLogLevel    = "SUBTITLES_LOG_LEVEL"
	EnvBssvrPostgresUri = "SUBTITLES_POSTGRES_URI"
	EnvBssvrKeycloakUri = "SUBTITLES_KEYCLOAK_URI"
)

func init() {
	fmt.Printf("Build Date: %s\nBuild Version: %s\nBuild: %s\n\n", Date, Version, Build)
	err := godotenv.Load()
	if err != nil {
		log.Fatalf("Error loading .env file: %v", err)
	}
	logLevel, err := log.ParseLevel(os.Getenv(EnvBssvrLogLevel))
	if err != nil {
		logLevel = log.DebugLevel
	}
	log.SetLevel(logLevel)
	log.SetFormatter(&log.JSONFormatter{})
}
