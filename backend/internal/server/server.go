package server

import (
	"net/http"
	"os"
	"path/filepath"

	"github.com/go-chi/chi/v5"
	chimw "github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
	"github.com/hibiken/asynq"
	"github.com/prometheus/client_golang/prometheus/promhttp"

	"mojacrm/backend/docs"
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
	clientsH := handlers.NewClientHandler(deps)
	partnersH := handlers.NewPartnerHandler(deps)
	branchesH := handlers.NewBranchHandler(deps)
	partnerContactsH := handlers.NewPartnerContactHandler(deps)
	requirementsH := handlers.NewPartnerRequirementHandler(deps)
	appendixTplH := handlers.NewAppendixTemplateHandler(deps)
	documentsH := handlers.NewDocumentHandler(deps)
	tendersH := handlers.NewTenderHandler(deps)
	workspaceH := handlers.NewWorkspaceHandler(deps)
	departmentsH := handlers.NewDepartmentHandler(deps)
	officesH := handlers.NewOfficeHandler(deps)
	referenceDataH := handlers.NewReferenceDataHandler(deps)
	archiveH := handlers.NewArchiveHandler(deps)
	comparablesH := handlers.NewComparableHandler(deps)
	inspectionsH := handlers.NewInspectionHandler(deps)

	r.Get("/healthz", func(w http.ResponseWriter, r *http.Request) {
		w.Write([]byte("ok"))
	})
	r.Handle("/metrics", promhttp.Handler())

	r.Get("/api/docs", swaggerUIHandler)
	r.Get("/api/docs/openapi.yaml", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/yaml")
		w.Write(docs.OpenAPISpec)
	})

	r.Route("/api/v1", func(r chi.Router) {
		r.Post("/auth/signup", authH.Signup)
		r.Post("/auth/verify-email", authH.VerifyEmail)
		r.Post("/auth/login", authH.Login)
		r.Post("/auth/logout", authH.Logout)
		r.Get("/auth/me", authH.Me)
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

			r.With(mw.RequirePermission("clients:read")).Get("/clients", clientsH.List)
			r.With(mw.RequirePermission("clients:read")).Get("/clients/{id}", clientsH.Get)
			r.With(mw.RequirePermission("clients:write")).Post("/clients", clientsH.Create)
			r.With(mw.RequirePermission("clients:write")).Patch("/clients/{id}", clientsH.Update)
			r.With(mw.RequirePermission("clients:delete")).Delete("/clients/{id}", clientsH.Delete)

			r.With(mw.RequirePermission("partners:read")).Get("/partners", partnersH.List)
			r.With(mw.RequirePermission("partners:read")).Get("/partners/{id}", partnersH.Get)
			r.With(mw.RequirePermission("partners:write")).Post("/partners", partnersH.Create)
			r.With(mw.RequirePermission("partners:write")).Patch("/partners/{id}", partnersH.Update)
			r.With(mw.RequirePermission("partners:write")).Patch("/partners/{id}/comparable-rules", partnersH.SetComparableRules)
			r.With(mw.RequirePermission("partners:delete")).Delete("/partners/{id}", partnersH.Delete)

			r.With(mw.RequirePermission("partners:read")).Get("/partners/{id}/branches", branchesH.ListByPartner)
			r.With(mw.RequirePermission("partners:write")).Post("/partners/{id}/branches", branchesH.Create)
			r.With(mw.RequirePermission("partners:write")).Patch("/branches/{id}", branchesH.Update)
			r.With(mw.RequirePermission("partners:delete")).Delete("/branches/{id}", branchesH.Delete)

			r.With(mw.RequirePermission("partners:read")).Get("/partners/{id}/contacts", partnerContactsH.ListByPartner)
			r.With(mw.RequirePermission("partners:write")).Post("/partners/{id}/contacts", partnerContactsH.Create)
			r.With(mw.RequirePermission("partners:write")).Patch("/partner-contacts/{id}", partnerContactsH.Update)
			r.With(mw.RequirePermission("partners:delete")).Delete("/partner-contacts/{id}", partnerContactsH.Delete)

			r.With(mw.RequirePermission("partners:read")).Get("/partners/{id}/requirements", requirementsH.ListForPartner)
			r.With(mw.RequirePermission("partners:write")).Post("/partners/{id}/requirements", requirementsH.Create)
			r.With(mw.RequirePermission("partners:write")).Patch("/partner-requirements/{rid}", requirementsH.Update)
			r.With(mw.RequirePermission("partners:write")).Delete("/partner-requirements/{rid}", requirementsH.Delete)

			r.With(mw.RequirePermission("partners:read")).Get("/partners/{id}/appendix-templates", appendixTplH.ListForPartner)
			r.With(mw.RequirePermission("partners:write")).Post("/partners/{id}/appendix-templates", appendixTplH.Create)
			r.With(mw.RequirePermission("partners:write")).Patch("/appendix-templates/{templateId}", appendixTplH.Update)
			r.With(mw.RequirePermission("partners:write")).Delete("/appendix-templates/{templateId}", appendixTplH.Delete)

			r.With(mw.RequirePermission("documents:read")).Get("/documents", documentsH.List)
			r.With(mw.RequirePermission("documents:read")).Get("/documents/{id}", documentsH.Get)
			r.With(mw.RequirePermission("documents:write")).Post("/documents", documentsH.Create)
			r.With(mw.RequirePermission("documents:write")).Patch("/documents/{id}", documentsH.Update)
			r.With(mw.RequirePermission("documents:delete")).Delete("/documents/{id}", documentsH.Delete)
			r.With(mw.RequirePermission("documents:read")).Get("/documents/{id}/versions", documentsH.ListVersions)
			r.With(mw.RequirePermission("documents:write")).Post("/documents/{id}/versions", documentsH.AddVersion)

			r.With(mw.RequirePermission("tenders:read")).Get("/tenders", tendersH.List)
			r.With(mw.RequirePermission("tenders:read")).Get("/tenders/{id}", tendersH.Get)
			r.With(mw.RequirePermission("tenders:write")).Post("/tenders", tendersH.Create)
			r.With(mw.RequirePermission("tenders:write")).Patch("/tenders/{id}", tendersH.Update)
			r.With(mw.RequirePermission("tenders:write")).Delete("/tenders/{id}", tendersH.Delete)
			r.With(mw.RequirePermission("tenders:write")).Post("/tenders/{id}/stage", tendersH.SetStage)
			r.With(mw.RequirePermission("tenders:write")).Post("/tenders/{id}/assign", tendersH.Assign)
			r.With(mw.RequirePermission("tenders:write")).Post("/tenders/{id}/submit", tendersH.Submit)
			r.With(mw.RequirePermission("tenders:read")).Get("/tenders/{id}/documents", tendersH.ListDocuments)
			r.With(mw.RequirePermission("tenders:write")).Post("/tenders/{id}/documents", tendersH.AddDocument)
			r.With(mw.RequirePermission("tenders:read")).Get("/tender-documents/{docId}", tendersH.GetDocument)
			r.With(mw.RequirePermission("tenders:write")).Delete("/tender-documents/{docId}", tendersH.DeleteDocument)
			r.With(mw.RequirePermission("tenders:write")).Post("/tenders/{id}/email", tendersH.Email)
			r.With(mw.RequirePermission("tenders:read")).Get("/tender-letters", tendersH.ListLetters)
			r.With(mw.RequirePermission("tenders:write")).Post("/tender-letters", tendersH.CreateLetter)
			r.With(mw.RequirePermission("tenders:write")).Patch("/tender-letters/{id}", tendersH.UpdateLetter)
			r.With(mw.RequirePermission("tenders:write")).Delete("/tender-letters/{id}", tendersH.DeleteLetter)

			r.With(mw.RequirePermission("settings:read")).Get("/tenant", workspaceH.Get)
			r.With(mw.RequirePermission("settings:write")).Patch("/tenant/profile", workspaceH.UpdateProfile)
			r.With(mw.RequirePermission("settings:write")).Patch("/tenant/email", workspaceH.UpdateEmailSettings)
			r.With(mw.RequirePermission("settings:read")).Get("/billing", workspaceH.Billing)

			r.With(mw.RequirePermission("departments:read")).Get("/departments", departmentsH.List)
			r.With(mw.RequirePermission("departments:read")).Get("/departments/{id}", departmentsH.Get)
			r.With(mw.RequirePermission("departments:write")).Post("/departments", departmentsH.Create)
			r.With(mw.RequirePermission("departments:write")).Patch("/departments/{id}", departmentsH.Update)
			r.With(mw.RequirePermission("departments:write")).Delete("/departments/{id}", departmentsH.Delete)
			r.With(mw.RequirePermission("departments:read")).Get("/departments/{id}/members", departmentsH.ListMembers)
			r.With(mw.RequirePermission("departments:write")).Post("/departments/{id}/members", departmentsH.AddMember)
			r.With(mw.RequirePermission("departments:write")).Delete("/departments/{id}/members/{userId}", departmentsH.RemoveMember)

			r.With(mw.RequirePermission("settings:read")).Get("/offices", officesH.List)
			r.With(mw.RequirePermission("settings:write")).Post("/offices", officesH.Create)
			r.With(mw.RequirePermission("settings:write")).Patch("/offices/{id}", officesH.Update)
			r.With(mw.RequirePermission("settings:write")).Delete("/offices/{id}", officesH.Delete)

			r.Get("/reference-data", referenceDataH.List)
			r.Post("/reference-data", referenceDataH.Create)
			r.Delete("/reference-data/{id}", referenceDataH.Delete)

			r.With(mw.RequirePermission("archive:read")).Get("/archive", archiveH.List)
			r.With(mw.RequirePermission("archive:write")).Post("/archive/restore", archiveH.Restore)
			r.With(mw.RequirePermission("archive:write")).Post("/archive/purge", archiveH.Purge)

			r.With(mw.RequirePermission("comparables:read")).Get("/comparables", comparablesH.List)
			r.With(mw.RequirePermission("comparables:read")).Get("/comparables/photo-counts", comparablesH.PhotoCounts)
			r.With(mw.RequirePermission("comparables:read")).Get("/comparables/{id}", comparablesH.Get)
			r.With(mw.RequirePermission("comparables:write")).Post("/comparables", comparablesH.Create)
			r.With(mw.RequirePermission("comparables:write")).Patch("/comparables/{id}", comparablesH.Update)
			r.With(mw.RequirePermission("comparables:write")).Delete("/comparables/{id}", comparablesH.Delete)
			r.With(mw.RequirePermission("comparables:read")).Get("/comparables/{id}/photos", comparablesH.ListPhotos)
			r.With(mw.RequirePermission("comparables:write")).Post("/comparables/{id}/photos", comparablesH.AddPhoto)
			r.With(mw.RequirePermission("comparables:write")).Delete("/comparable-photos/{photoId}", comparablesH.DeletePhoto)

			r.With(mw.RequirePermission("inspections:read")).Get("/clients/{id}/inspections", inspectionsH.ListByClient)
			r.With(mw.RequirePermission("inspections:write")).Post("/clients/{id}/inspections", inspectionsH.Schedule)
			r.With(mw.RequirePermission("inspections:read")).Get("/inspections", inspectionsH.ListAll)
			r.With(mw.RequirePermission("inspections:read")).Get("/inspections/{id}", inspectionsH.Get)
			r.With(mw.RequirePermission("inspections:write")).Patch("/inspections/{id}", inspectionsH.Update)
			r.With(mw.RequirePermission("inspections:write")).Delete("/inspections/{id}", inspectionsH.Delete)
			r.With(mw.RequirePermission("inspections:write")).Post("/inspections/{id}/arrive", inspectionsH.Arrive)
			r.With(mw.RequirePermission("inspections:write")).Post("/inspections/{id}/depart", inspectionsH.Depart)
			r.With(mw.RequirePermission("inspections:write")).Post("/inspections/{id}/cancel", inspectionsH.Cancel)
			r.With(mw.RequirePermission("inspections:read")).Get("/inspections/{id}/photos", inspectionsH.ListPhotos)
			r.With(mw.RequirePermission("inspections:write")).Post("/inspections/{id}/photos", inspectionsH.AddPhoto)
			r.With(mw.RequirePermission("inspections:write")).Patch("/inspection-photos/{id}", inspectionsH.UpdatePhotoCaption)
			r.With(mw.RequirePermission("inspections:write")).Delete("/inspection-photos/{id}", inspectionsH.DeletePhoto)
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

	if cfg.StaticDir != "" {
		r.Get("/*", spaHandler(cfg.StaticDir))
	}

	return r
}

// swaggerUIHandler renders Swagger UI (loaded from a CDN) pointed at our
// embedded OpenAPI spec. In production this route sits behind HTTP Basic
// Auth at the Caddy layer (see deploy/Caddyfile.snippet) — it's not public.
func swaggerUIHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	w.Write([]byte(`<!doctype html>
<html>
<head>
  <title>MojaCRM API Docs</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui.css">
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
  <script>
    window.onload = () => SwaggerUIBundle({
      url: "/api/docs/openapi.yaml",
      dom_id: "#swagger-ui",
    });
  </script>
</body>
</html>`))
}

// spaHandler serves the built frontend: real files (JS/CSS/images) as-is,
// and index.html for anything else so client-side routing works on refresh.
func spaHandler(dir string) http.HandlerFunc {
	fileServer := http.FileServer(http.Dir(dir))
	return func(w http.ResponseWriter, r *http.Request) {
		full := filepath.Join(dir, filepath.Clean(r.URL.Path))
		if info, err := os.Stat(full); err == nil && !info.IsDir() {
			fileServer.ServeHTTP(w, r)
			return
		}
		http.ServeFile(w, r, filepath.Join(dir, "index.html"))
	}
}
