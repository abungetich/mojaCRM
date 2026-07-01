.PHONY: run worker seed sqlc build test tidy

run:
	go run ./cmd/api

worker:
	go run ./cmd/worker

seed:
	go run ./cmd/seed

sqlc:
	sqlc generate

build:
	go build -o bin/api ./cmd/api
	go build -o bin/worker ./cmd/worker
	go build -o bin/seed ./cmd/seed

test:
	go test ./...

tidy:
	go mod tidy
