#! /usr/bin/make -f

# Project variables.
PROJECT_NAME := $(shell basename "$(PWD)")
PACKAGE := gitlab.com/gitlab.bbdev.team/vh/$(PROJECT_NAME)
VERSION := $(shell git describe --tags 2>/dev/null || git describe --all)
BUILD := $(shell git rev-parse --short HEAD)
DATETIME := $(shell date +"%Y.%m.%d-%H:%M:%S")

# Use linker flags to provide version/build settings.
LDFLAGS=-ldflags "-X=$(PACKAGE)/internal/api.Version=$(VERSION) -X=$(PACKAGE)/internal/api.Build=$(BUILD) -X=$(PACKAGE)/internal/api.Date=$(DATETIME)"

# Project related variables.
PROJECT_BASE := $(shell pwd)
PROJECT_BIN := $(PROJECT_BASE)/bin/bssvr
MAIN_MODULE := ./cmd/bssvr

# Build
.PHONY: build
build: clean compile

.PHONY: compile
compile:
	@echo "# Building binary"
	go build ${LDFLAGS} -o ${PROJECT_BIN} ${MAIN_MODULE}

.PHONY: clean
clean:
	@echo "# Cleaning"
	-rm ${PROJECT_BIN}

lint-install:
ifeq ("$(wildcard /usr/local/bin/golangci-lint)","")
	@echo "# Installing golint"
	curl -sSfL https://raw.githubusercontent.com/golangci/golangci-lint/master/install.sh | sh -s
endif

lint: lint-install
	@echo "# Running golint"
	golangci-lint run --timeout=5s
