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
	EnvBssvrPort        = "BSSVR_BACKEND_PORT"
	EnvBssvrLogLevel    = "BSSVR_LOG_LEVEL"
	EnvBssvrPostgresUri = "BSSVR_POSTGRES_URI"
	EnvBssvrKeycloakUri = "BSSVR_KEYCLOAK_URI"
	EnvFile             = ".env"
)

func init() {
	fmt.Printf("Build Date: %s\nBuild Version: %s\nBuild: %s\n\n", Date, Version, Build)
	envProfile := os.Getenv("BSSVR_PROFILE")
	if envProfile != "" {
		envProfile = fmt.Sprintf("_%s", envProfile)
	}
	fmt.Println("*************************", envProfile)
	err := godotenv.Load(EnvFile + envProfile)
	if err != nil {
		log.Fatalf("Error loading %s file: %v", EnvFile, err)
	}
	logLevel, err := log.ParseLevel(os.Getenv(EnvBssvrLogLevel))
	if err != nil {
		logLevel = log.DebugLevel
	}
	log.SetLevel(logLevel)
	log.SetFormatter(&log.JSONFormatter{})
}
