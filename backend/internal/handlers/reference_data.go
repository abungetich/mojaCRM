package handlers

import (
	"net/http"
	"strings"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	"mojacrm/backend/internal/appctx"
	"mojacrm/backend/internal/database/db"
	"mojacrm/backend/internal/httpx"
)

// ReferenceDataHandler manages tenant-expandable picklists, ported from
// propsense. No permission gate — open to any authenticated tenant user,
// matching propsense's own routing (reference data is low-stakes config
// everyone benefits from being able to extend, e.g. adding a lead source).
type ReferenceDataHandler struct{ Deps }

func NewReferenceDataHandler(d Deps) *ReferenceDataHandler { return &ReferenceDataHandler{d} }

func (h *ReferenceDataHandler) List(w http.ResponseWriter, r *http.Request) {
	tenantID, _ := appctx.TenantID(r.Context())
	category := r.URL.Query().Get("category")

	if category != "" {
		rows, err := h.Store.Queries.ListReferenceDataByCategory(r.Context(), db.ListReferenceDataByCategoryParams{
			TenantID: tenantID, Category: category,
		})
		if err != nil {
			httpx.Error(w, http.StatusInternalServerError, "could not list reference data")
			return
		}
		httpx.JSON(w, http.StatusOK, rows)
		return
	}
	rows, err := h.Store.Queries.ListReferenceData(r.Context(), tenantID)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "could not list reference data")
		return
	}
	httpx.JSON(w, http.StatusOK, rows)
}

func (h *ReferenceDataHandler) Create(w http.ResponseWriter, r *http.Request) {
	tenantID, _ := appctx.TenantID(r.Context())
	var body struct {
		Category string `json:"category"`
		Value    string `json:"value"`
		Label    string `json:"label"`
	}
	if err := httpx.Decode(r, &body); err != nil || strings.TrimSpace(body.Category) == "" || strings.TrimSpace(body.Value) == "" {
		httpx.Error(w, http.StatusBadRequest, "category and value are required")
		return
	}
	if body.Label == "" {
		body.Label = body.Value
	}
	rd, err := h.Store.Queries.CreateReferenceData(r.Context(), db.CreateReferenceDataParams{
		TenantID: tenantID, Category: body.Category, Value: body.Value, Label: body.Label,
		SortOrder: 0, CreatedByName: actorName(r.Context(), h.Store),
	})
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "could not create reference data")
		return
	}
	httpx.JSON(w, http.StatusCreated, rd)
}

func (h *ReferenceDataHandler) Delete(w http.ResponseWriter, r *http.Request) {
	tenantID, _ := appctx.TenantID(r.Context())
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "invalid id")
		return
	}
	if err := h.Store.Queries.DeleteReferenceData(r.Context(), db.DeleteReferenceDataParams{ID: id, TenantID: tenantID}); err != nil {
		httpx.Error(w, http.StatusInternalServerError, "could not delete reference data")
		return
	}
	httpx.JSON(w, http.StatusOK, map[string]bool{"ok": true})
}
