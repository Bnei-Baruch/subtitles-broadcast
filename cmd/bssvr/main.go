package main

import (
	"log"

	"gitlab.com/gitlab.bbdev.team/vh/broadcast-subtitles/internal/api"
)

func main() {
	svr := api.NewApp()
	err := svr.ListenAndServe()
	if err != nil {
		log.Fatalln(err)
	}
}
