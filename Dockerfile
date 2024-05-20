FROM golang:1.21 AS base

# RUN apt-get update && apt-get upgrade -y

RUN mkdir /app
ADD . /app
WORKDIR /app

RUN CGO_ENABLED=0 go build -o bssvr cmd/bssvr/main.go

FROM alpine:latest

RUN mkdir /appication 
WORKDIR /appication

COPY --from=base /app/bssvr .
COPY --from=base /app/.env .
COPY --from=base /app/script /appication/script

#COPY ./.env /

EXPOSE 8080

CMD ["./bssvr"]

