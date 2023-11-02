FROM golang:1.20 AS base

# RUN apt-get update && apt-get upgrade -y

RUN mkdir /app

ADD . /app

WORKDIR /app

RUN CGO_ENABLED=0 go build -o bssvr cmd/bssvr/main.go

FROM alpine:latest

COPY --from=base /app/bssvr /

COPY . /

#COPY ./.env /

ENV BSSVR_PROFILE=test

EXPOSE 8080

CMD ["./bssvr"]

