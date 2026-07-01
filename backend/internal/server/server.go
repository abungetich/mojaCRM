package server

import (
	"net/http"

	"github.com/go-chi/chi/v5"
	chimw "github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
	"github.com/hibiken/asynq"
	"github.com/prometheus/client_golang/prometheus/promhttp"

	"mojacrm/backend/internal/config"
	"mojacrm/backend/internal/database"
	"mojacrm/backend/internal/handlers"
	appmw "mojacrm/backend/internal/middleware"
)

func New(cfg config.Config, store *database.Store, jobsClient *asynq.Client) http.Handler {
	r := chi.NewRouter()
	r.Use(chimw.RequestID)
	r.Use(chimw.RealIP)
	r.Use(chimw.Logger)
	r.Use(chimw.Recoverer)
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   []string{cfg.AllowOrigin},
		AllowedMethods:   []string{"GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Content-Type"},
		AllowCredentials: true,
	}))

	mw := appmw.New(store, cfg.JWTSecret)
	deps := handlers.Deps{Store: store, JWTSecret: cfg.JWTSecret, CookieDomain: cfg.CookieDomain, CookieSecure: cfg.CookieSecure, Jobs: jobsClient, FrontendURL: cfg.AllowOrigin}

	authH := handlers.NewAuthHandler(deps)
	usersH := handlers.NewUserHandler(deps)
	rolesH := handlers.NewRoleHandler(deps)
	tenantsH := handlers.NewTenantHandler(deps)
	teamH := handlers.NewTeamHandler(deps)
	customersH := handlers.NewCustomerHandler(deps)
	contactsH := handlers.NewContactHandler(deps)
	commsH := handlers.NewCommunicationHandler(deps)
	brandingH := handlers.NewBrandingHandler(deps)

	r.Get("/healthz", func(w http.ResponseWriter, r *http.Request) {
		w.Write([]byte("ok"))
	})
	r.Handle("/metrics", promhttp.Handler())

	r.Route("/api/v1", func(r chi.Router) {
		r.Post("/auth/signup", authH.Signup)
		r.Post("/auth/verify-email", authH.VerifyEmail)
		r.Post("/auth/login", authH.Login)
		r.Post("/auth/logout", authH.Logout)
		r.Get("/auth/me", authH.Me)
		r.Post("/admin/auth/login", authH.PlatformLogin)
		r.Get("/branding", brandingH.Get)

		r.Group(func(r chi.Router) {
			r.Use(mw.RequireAuth)

			r.With(mw.RequirePermission("users:read")).Get("/users", usersH.List)
			r.With(mw.RequirePermission("users:write")).Post("/users", usersH.Create)
			r.With(mw.RequirePermission("users:write")).Patch("/users/{id}", usersH.Update)
			r.With(mw.RequirePermission("users:write")).Delete("/users/{id}", usersH.Delete)

			r.With(mw.RequirePermission("roles:read")).Get("/roles", rolesH.List)
			r.With(mw.RequirePermission("roles:read")).Get("/permissions", rolesH.ListPermissions)
			r.With(mw.RequirePermission("roles:write")).Post("/roles", rolesH.Create)
			r.With(mw.RequirePermission("roles:write")).Patch("/roles/{id}", rolesH.Update)

			r.With(mw.RequirePermission("customers:read")).Get("/customers", customersH.List)
			r.With(mw.RequirePermission("customers:read")).Get("/customers/tags", customersH.ListTags)
			r.With(mw.RequirePermission("customers:write")).Post("/customers", customersH.Create)
			r.With(mw.RequirePermission("customers:read")).Get("/customers/{id}", customersH.Get)
			r.With(mw.RequirePermission("customers:write")).Patch("/customers/{id}", customersH.Update)
			r.With(mw.RequirePermission("customers:delete")).Delete("/customers/{id}", customersH.Delete)
			r.With(mw.RequirePermission("customers:delete")).Post("/customers/{id}/archive", customersH.Archive)
			r.With(mw.RequirePermission("customers:write")).Post("/customers/{id}/restore", customersH.Restore)
			r.With(mw.RequirePermission("customers:write")).Post("/customers/{id}/status", customersH.SetStatus)
			r.With(mw.RequirePermission("customers:write")).Post("/customers/{id}/owner", customersH.AssignOwner)

			r.With(mw.RequirePermission("customers:read")).Get("/customers/{id}/tags", customersH.ListCustomerTags)
			r.With(mw.RequirePermission("customers:write")).Post("/customers/{id}/tags", customersH.AddTag)
			r.With(mw.RequirePermission("customers:write")).Delete("/customers/{id}/tags/{tagId}", customersH.RemoveTag)

			r.With(mw.RequirePermission("customers:read")).Get("/customers/{id}/notes", customersH.ListNotes)
			r.With(mw.RequirePermission("customers:write")).Post("/customers/{id}/notes", customersH.CreateNote)

			r.With(mw.RequirePermission("customers:read")).Get("/customers/{id}/contacts", contactsH.List)
			r.With(mw.RequirePermission("customers:write")).Post("/customers/{id}/contacts", contactsH.Create)
			r.With(mw.RequirePermission("customers:write")).Patch("/customers/{id}/contacts/{contactId}", contactsH.Update)
			r.With(mw.RequirePermission("customers:write")).Delete("/customers/{id}/contacts/{contactId}", contactsH.Delete)
			r.With(mw.RequirePermission("customers:write")).Post("/customers/{id}/contacts/{contactId}/primary", contactsH.SetPrimary)
			r.With(mw.RequirePermission("customers:write")).Post("/customers/{id}/contacts/{contactId}/status", contactsH.SetStatus)

			r.With(mw.RequirePermission("communications:read")).Get("/customers/{id}/communications", commsH.ListByCustomer)
			r.With(mw.RequirePermission("communications:write")).Post("/customers/{id}/communications", commsH.Create)

			r.With(mw.RequirePermission("communications:read")).Get("/communications", commsH.List)
			r.With(mw.RequirePermission("communications:read")).Get("/communications/follow-ups", commsH.FollowUps)
			r.With(mw.RequirePermission("communications:write")).Post("/communications/{commId}/status", commsH.UpdateStatus)
			r.With(mw.RequirePermission("communications:write")).Post("/communications/{commId}/complete", commsH.CompleteFollowUp)
			r.With(mw.RequirePermission("communications:write")).Delete("/communications/{commId}", commsH.Delete)
		})

		r.Group(func(r chi.Router) {
			r.Use(mw.RequirePlatformAuth)

			r.Get("/admin/tenants", tenantsH.List)
			r.Post("/admin/tenants", tenantsH.Create)
			r.Post("/admin/tenants/{id}/suspend", tenantsH.Suspend)
			r.Post("/admin/tenants/{id}/activate", tenantsH.Activate)

			r.Get("/admin/team", teamH.List)
			r.Post("/admin/team", teamH.Create)

			r.Patch("/admin/settings", brandingH.Update)
		})
	})

	return r
}
