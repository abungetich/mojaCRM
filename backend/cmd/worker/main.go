// Command worker runs the Asynq background job processor.
package main

import (
	"log"

	"github.com/hibiken/asynq"

	"mojacrm/backend/internal/config"
	"mojacrm/backend/internal/jobs"
)

func main() {
	cfg := config.Load()

	srv := asynq.NewServer(
		asynq.RedisClientOpt{Addr: cfg.RedisAddr},
		asynq.Config{Concurrency: 5},
	)

	log.Printf("mojacrm worker listening on redis %s", cfg.RedisAddr)
	if err := srv.Run(jobs.NewMux()); err != nil {
		log.Fatalf("worker stopped: %v", err)
	}
}
