package config

import (
	"fmt"
	"os"

	"github.com/fsnotify/fsnotify"
	log "github.com/sirupsen/logrus"
	"github.com/spf13/viper"
)

var (
	Configuration = &Config{}

	Version = "Dev"
	Build   = "Dev"
	Date    = "Dev"
)

type Config struct {
	Port     int       `yaml:"port"`
	LogLevel string    `yaml:"log_level"`
	Postgres *Postgres `yaml:"postgres"`
	KeyCloak *Keycloak `yaml:"keycloak"`
}

type Postgres struct {
	Url string `yaml:"url"`
}

type Keycloak struct {
	Url string `yaml:"url"`
}

func init() {
	fmt.Printf("Build Date: %s\nBuild Version: %s\nBuild: %s\n\n", Date, Version, Build)
	err := SetConfig(fmt.Sprintf("config_%s", os.Getenv("BSSVR_PROFILE")))
	if err != nil {
		log.Fatal("No BSSVR_PROFILE value. Cannot start the server application")
	}
	Configuration = GetConfig()
	ll, err := log.ParseLevel(Configuration.LogLevel)
	if err != nil {
		ll = log.DebugLevel
	}
	log.SetLevel(ll)
	log.SetFormatter(&log.JSONFormatter{})
}

func SetConfig(profile string) error {
	viper.AddConfigPath(".")
	viper.SetConfigName(profile)
	viper.SetConfigType("yaml")
	err := viper.ReadInConfig()
	if err != nil {
		log.Error(err)
		return err
	}

	err = viper.Unmarshal(Configuration)
	if err != err {
		return err
	}
	viper.OnConfigChange(func(e fsnotify.Event) {
		log.Info(fmt.Sprintf("Config file changed: %s", e.Name))
		err := viper.ReadInConfig()
		if err != nil {
			log.Error(err)
			return
		}
		err = viper.Unmarshal(Configuration)
		if err != nil {
			log.Error(err)
			return
		}

	})
	viper.WatchConfig()
	log.Info("Configuration loaded successfully.")
	return nil
}

func GetConfig() *Config {
	return Configuration
}
