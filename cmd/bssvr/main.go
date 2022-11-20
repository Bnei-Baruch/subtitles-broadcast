package main

import (
	"gitlab.com/gitlab.bbdev.team/vh/broadcast-subtitles/internal/api"
)

func main() {
	svr := api.NewApp()
	svr.ListenAndServe()
}
