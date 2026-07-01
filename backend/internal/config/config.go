package config

import (
	"os"
)

type Config struct {
	Port         string
	DatabaseURL  string
	RedisAddr    string
	JWTSecret    string
	CookieDomain string
	CookieSecure bool
	AllowOrigin  string
	SentryDSN    string
}

func Load() Config {
	return Config{
		Port:         getenv("PORT", "8080"),
		DatabaseURL:  getenv("DATABASE_URL", "postgres://mojacrm:mojacrm@localhost:5432/mojacrm?sslmode=disable"),
		RedisAddr:    getenv("REDIS_ADDR", "localhost:6379"),
		JWTSecret:    getenv("JWT_SECRET", "dev-secret-change-me"),
		CookieDomain: getenv("COOKIE_DOMAIN", ""),
		CookieSecure: getenv("COOKIE_SECURE", "false") == "true",
		AllowOrigin:  getenv("ALLOW_ORIGIN", "http://localhost:5173"),
		SentryDSN:    getenv("SENTRY_DSN", ""),
	}
}

func getenv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
