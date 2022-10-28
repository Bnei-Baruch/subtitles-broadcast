package config

type Config struct {
	Port     int       `yaml:"port"`
	Postgres *Postgres `yaml:"postgres"`
}

type Postgres struct {
	Url string `yaml:"url"`
}
