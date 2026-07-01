package handlers

import (
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	"mojacrm/backend/internal/database/db"
	"mojacrm/backend/internal/httpx"
)

type TenantHandler struct{ Deps }

func NewTenantHandler(d Deps) *TenantHandler { return &TenantHandler{d} }

func (h *TenantHandler) List(w http.ResponseWriter, r *http.Request) {
	tenants, err := h.Store.Queries.ListTenants(r.Context())
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "could not list tenants")
		return
	}
	out := make([]TenantView, 0, len(tenants))
	for _, t := range tenants {
		out = append(out, tenantView(t))
	}
	httpx.JSON(w, http.StatusOK, out)
}

func (h *TenantHandler) Create(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Name string `json:"name"`
		Slug string `json:"slug"`
	}
	if err := httpx.Decode(r, &body); err != nil || body.Name == "" || body.Slug == "" {
		httpx.Error(w, http.StatusBadRequest, "invalid body")
		return
	}
	tenant, err := h.Store.Queries.CreateTenant(r.Context(), db.CreateTenantParams{Name: body.Name, Slug: body.Slug, Plan: "free"})
	if err != nil {
		httpx.Error(w, http.StatusConflict, "slug already in use")
		return
	}
	httpx.JSON(w, http.StatusCreated, tenantView(tenant))
}

func (h *TenantHandler) setStatus(w http.ResponseWriter, r *http.Request, status string) {
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "invalid id")
		return
	}
	tenant, err := h.Store.Queries.SetTenantStatus(r.Context(), db.SetTenantStatusParams{ID: id, Status: status})
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "could not update tenant")
		return
	}
	httpx.JSON(w, http.StatusOK, tenantView(tenant))
}

func (h *TenantHandler) Suspend(w http.ResponseWriter, r *http.Request) {
	h.setStatus(w, r, "suspended")
}
func (h *TenantHandler) Activate(w http.ResponseWriter, r *http.Request) { h.setStatus(w, r, "active") }
