package main

import (
	"context"
	"log"
	"net/http"
	"time"

	"github.com/getsentry/sentry-go"
	"github.com/hibiken/asynq"

	"mojacrm/backend/internal/config"
	"mojacrm/backend/internal/database"
	"mojacrm/backend/internal/server"
)

func main() {
	cfg := config.Load()

	if cfg.SentryDSN != "" {
		if err := sentry.Init(sentry.ClientOptions{Dsn: cfg.SentryDSN}); err != nil {
			log.Printf("sentry init failed: %v", err)
		} else {
			defer sentry.Flush(2 * time.Second)
		}
	}

	ctx := context.Background()
	store, err := connectWithRetry(ctx, cfg.DatabaseURL, 10, 2*time.Second)
	if err != nil {
		log.Fatalf("could not connect to database: %v", err)
	}
	defer store.Close()

	if err := store.Migrate(ctx); err != nil {
		log.Fatalf("could not run migrations: %v", err)
	}

	jobsClient := asynq.NewClient(asynq.RedisClientOpt{Addr: cfg.RedisAddr})
	defer jobsClient.Close()

	handler := server.New(cfg, store, jobsClient)

	log.Printf("mojacrm api listening on :%s", cfg.Port)
	if err := http.ListenAndServe(":"+cfg.Port, handler); err != nil {
		log.Fatal(err)
	}
}

func connectWithRetry(ctx context.Context, databaseURL string, attempts int, delay time.Duration) (*database.Store, error) {
	var lastErr error
	for i := 0; i < attempts; i++ {
		store, err := database.New(ctx, databaseURL)
		if err == nil {
			return store, nil
		}
		lastErr = err
		log.Printf("database not ready (attempt %d/%d): %v", i+1, attempts, err)
		time.Sleep(delay)
	}
	return nil, lastErr
}
