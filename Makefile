#! /usr/bin/make -f

# Project variables.
PROJECT_NAME := $(shell basename "$(PWD)")
PACKAGE := gitlab.com/gitlab.bbdev.team/vh/$(PROJECT_NAME)
VERSION := $(shell git describe --tags 2>/dev/null || git describe --all)
BUILD := $(shell git rev-parse --short HEAD)
DATETIME := $(shell date +"%Y.%m.%d-%H:%M:%S")
POSTGRES_CONTAINER_ID := $(shell docker ps -aqf "name=testDb")

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

.PHONY: migrate
migrate:
	docker exec -it $(POSTGRES_CONTAINER_ID) psql -U postgres -d postgres -c "DROP TABLE IF EXISTS schema_migrations;"
ifeq ("$(wildcard /usr/local/bin/migrate)","")
	@echo "# Installing migrate"
	curl https://packages.cloud.google.com/apt/doc/apt-key.gpg | sudo apt-key --keyring /usr/share/keyrings/cloud.google.gpg add -
	curl -s https://packagecloud.io/install/repositories/golang-migrate/migrate/script.deb.sh | sudo bash
	sudo apt-get update
	sudo apt-get install -y migrate
endif
	@echo "# Data Migrating"
	migrate -source file://./script/database/migration/ -database "postgresql://postgres:1q2w3e4r@localhost:5432/postgres?sslmode=disable" -verbose up

lint-install:
ifeq ("$(wildcard /usr/local/bin/golangci-lint)","")
	@echo "# Installing golint"
	curl -sSfL https://raw.githubusercontent.com/golangci/golangci-lint/master/install.sh | sh -s
endif

lint: lint-install
	@echo "# Running golint"
	golangci-lint run --timeout=5s
