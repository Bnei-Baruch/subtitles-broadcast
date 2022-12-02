package config

import (
	"fmt"

	"github.com/fsnotify/fsnotify"
	log "github.com/sirupsen/logrus"
	"github.com/spf13/viper"
)

var configuration = Config{}

type Config struct {
	Port     int       `yaml:"port"`
	LogLevel string    `yaml:"log_level"`
	Postgres *Postgres `yaml:"postgres"`
}

type Postgres struct {
	Url string `yaml:"url"`
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

	err = viper.Unmarshal(&configuration)
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
		err = viper.Unmarshal(&configuration)
		if err != nil {
			log.Error(err)
			return
		}

	})
	viper.WatchConfig()
	return nil
}

func GetConfig() *Config {
	return &configuration
}
