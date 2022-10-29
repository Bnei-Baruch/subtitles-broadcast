package config

import (
	"github.com/spf13/viper"
	"log"
)

var configuration = Config{}

type Config struct {
	Port     int       `yaml:"port"`
	Postgres *Postgres `yaml:"postgres"`
}

type Postgres struct {
	Url string `yaml:"url"`
}

func SetConfig(profile string) error {
	viper.AddConfigPath("../..")
	viper.SetConfigName(profile)
	viper.SetConfigType("yaml")
	err := viper.ReadInConfig()
	if err != nil {
		return err
	}
	err = viper.Unmarshal(&Configuration)
	if err != err {
		return err
	}
	viper.OnConfigChange(func(e fsnotify.Event) {
		log.Println("Config file changed:", e.Name)
		err := viper.ReadConfig()
		if err != nil {
			log.Println(err)
			return
		}
		err = viper.Unmarshal(&configuration)
		if err != nil {
			log.Println(err)
			return
		}

	})
	viper.WatchConfig()
}

func GetConfig() *Config {
	return &configuration
}
