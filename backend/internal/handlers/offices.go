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

// OfficeHandler manages the firm's own branches, ported from propsense.
// Gated behind settings:read/write — offices are workspace configuration,
// not a dedicated permission domain like Clients/Partners.
type OfficeHandler struct{ Deps }

func NewOfficeHandler(d Deps) *OfficeHandler { return &OfficeHandler{d} }

type officeBody struct {
	Name    string `json:"name"`
	Code    string `json:"code"`
	IsMain  bool   `json:"is_main"`
	Address string `json:"address"`
	Town    string `json:"town"`
	Phone   string `json:"phone"`
	Email   string `json:"email"`
}

func (h *OfficeHandler) List(w http.ResponseWriter, r *http.Request) {
	tenantID, _ := appctx.TenantID(r.Context())
	rows, err := h.Store.Queries.ListOffices(r.Context(), tenantID)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "could not list offices")
		return
	}
	httpx.JSON(w, http.StatusOK, rows)
}

func (h *OfficeHandler) Create(w http.ResponseWriter, r *http.Request) {
	tenantID, _ := appctx.TenantID(r.Context())
	var body officeBody
	if err := httpx.Decode(r, &body); err != nil || strings.TrimSpace(body.Name) == "" {
		httpx.Error(w, http.StatusBadRequest, "name is required")
		return
	}
	o, err := h.Store.Queries.CreateOffice(r.Context(), db.CreateOfficeParams{
		TenantID: tenantID, Name: body.Name, Code: body.Code, IsMain: body.IsMain,
		Address: body.Address, Town: body.Town, Phone: body.Phone, Email: body.Email,
		CreatedByName: actorName(r.Context(), h.Store),
	})
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "could not create office")
		return
	}
	httpx.JSON(w, http.StatusCreated, o)
}

func (h *OfficeHandler) Update(w http.ResponseWriter, r *http.Request) {
	tenantID, _ := appctx.TenantID(r.Context())
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "invalid id")
		return
	}
	var body officeBody
	if err := httpx.Decode(r, &body); err != nil || strings.TrimSpace(body.Name) == "" {
		httpx.Error(w, http.StatusBadRequest, "name is required")
		return
	}
	o, err := h.Store.Queries.UpdateOffice(r.Context(), db.UpdateOfficeParams{
		ID: id, TenantID: tenantID, Name: body.Name, Code: body.Code, IsMain: body.IsMain,
		Address: body.Address, Town: body.Town, Phone: body.Phone, Email: body.Email,
	})
	if err != nil {
		httpx.Error(w, http.StatusNotFound, "office not found")
		return
	}
	httpx.JSON(w, http.StatusOK, o)
}

func (h *OfficeHandler) Delete(w http.ResponseWriter, r *http.Request) {
	tenantID, _ := appctx.TenantID(r.Context())
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "invalid id")
		return
	}
	if err := h.Store.Queries.DeleteOffice(r.Context(), db.DeleteOfficeParams{
		ID: id, TenantID: tenantID, DeletedByName: actorName(r.Context(), h.Store), DeleteReason: deleteReason(r),
	}); err != nil {
		httpx.Error(w, http.StatusInternalServerError, "could not delete office")
		return
	}
	httpx.JSON(w, http.StatusOK, map[string]bool{"ok": true})
}
