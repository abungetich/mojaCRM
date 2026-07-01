package handlers

import (
	"github.com/hibiken/asynq"

	"mojacrm/backend/internal/database"
)

type Deps struct {
	Store        *database.Store
	JWTSecret    string
	CookieDomain string
	CookieSecure bool
	Jobs         *asynq.Client
	FrontendURL  string
}
