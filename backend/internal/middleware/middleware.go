package middleware

import (
	"net/http"

	"mojacrm/backend/internal/appctx"
	authpkg "mojacrm/backend/internal/auth"
	"mojacrm/backend/internal/database"
	"mojacrm/backend/internal/httpx"
)

type Middleware struct {
	store     *database.Store
	jwtSecret string
}

func New(store *database.Store, jwtSecret string) *Middleware {
	return &Middleware{store: store, jwtSecret: jwtSecret}
}

// RequireAuth authenticates a tenant user from the session cookie.
func (m *Middleware) RequireAuth(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		raw, ok := authpkg.ReadSessionCookie(r)
		if !ok {
			httpx.Error(w, http.StatusUnauthorized, "unauthenticated")
			return
		}
		claims, err := authpkg.ParseToken(m.jwtSecret, raw)
		if err != nil || claims.IsPlatform {
			httpx.Error(w, http.StatusUnauthorized, "unauthenticated")
			return
		}
		ctx := appctx.WithUser(r.Context(), claims.UserID)
		ctx = appctx.WithTenant(ctx, claims.TenantID)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

// RequirePlatformAuth authenticates a platform admin from the session cookie.
func (m *Middleware) RequirePlatformAuth(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		raw, ok := authpkg.ReadSessionCookie(r)
		if !ok {
			httpx.Error(w, http.StatusUnauthorized, "unauthenticated")
			return
		}
		claims, err := authpkg.ParseToken(m.jwtSecret, raw)
		if err != nil || !claims.IsPlatform {
			httpx.Error(w, http.StatusUnauthorized, "unauthenticated")
			return
		}
		ctx := appctx.WithPlatformAdmin(r.Context(), claims.UserID)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

// RequirePermission checks that the authenticated tenant user's role grants
// the given permission key. Must run after RequireAuth.
func (m *Middleware) RequirePermission(key string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			userID, ok := appctx.UserID(r.Context())
			if !ok {
				httpx.Error(w, http.StatusUnauthorized, "unauthenticated")
				return
			}
			keys, err := m.store.Queries.GetUserPermissionKeys(r.Context(), userID)
			if err != nil {
				httpx.Error(w, http.StatusInternalServerError, "permission lookup failed")
				return
			}
			for _, k := range keys {
				if k == key {
					next.ServeHTTP(w, r)
					return
				}
			}
			httpx.Error(w, http.StatusForbidden, "missing permission: "+key)
		})
	}
}
