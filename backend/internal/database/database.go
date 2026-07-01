package database

import (
	"context"

	"github.com/jackc/pgx/v5/pgxpool"

	"mojacrm/backend/internal/database/db"
)

type Store struct {
	Pool    *pgxpool.Pool
	Queries *db.Queries
}

func New(ctx context.Context, databaseURL string) (*Store, error) {
	pool, err := pgxpool.New(ctx, databaseURL)
	if err != nil {
		return nil, err
	}
	if err := pool.Ping(ctx); err != nil {
		return nil, err
	}
	return &Store{Pool: pool, Queries: db.New(pool)}, nil
}

func (s *Store) Close() {
	s.Pool.Close()
}
