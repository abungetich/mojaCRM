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

// BranchHandler manages branches of a partner (bank/SACCO), ported from propsense.
type BranchHandler struct{ Deps }

func NewBranchHandler(d Deps) *BranchHandler { return &BranchHandler{d} }

type branchBody struct {
	Name  string `json:"name"`
	Town  string `json:"town"`
	Phone string `json:"phone"`
	Email string `json:"email"`
}

// ListByPartner lists a partner's branches (partners:read).
func (h *BranchHandler) ListByPartner(w http.ResponseWriter, r *http.Request) {
	tenantID, _ := appctx.TenantID(r.Context())
	partnerID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "invalid partner id")
		return
	}
	rows, err := h.Store.Queries.ListBranchesByPartner(r.Context(), db.ListBranchesByPartnerParams{
		PartnerID: partnerID, TenantID: tenantID,
	})
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "could not list branches")
		return
	}
	out := make([]BranchView, 0, len(rows))
	for _, b := range rows {
		out = append(out, branchView(b))
	}
	httpx.JSON(w, http.StatusOK, out)
}

// Create adds a branch to a partner (partners:write).
func (h *BranchHandler) Create(w http.ResponseWriter, r *http.Request) {
	tenantID, _ := appctx.TenantID(r.Context())
	partnerID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "invalid partner id")
		return
	}
	var body branchBody
	if err := httpx.Decode(r, &body); err != nil || strings.TrimSpace(body.Name) == "" {
		httpx.Error(w, http.StatusBadRequest, "name is required")
		return
	}
	br, err := h.Store.Queries.CreateBranch(r.Context(), db.CreateBranchParams{
		TenantID:      tenantID,
		PartnerID:     partnerID,
		Name:          body.Name,
		Town:          body.Town,
		Phone:         body.Phone,
		Email:         body.Email,
		CreatedByName: actorName(r.Context(), h.Store),
	})
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "could not create branch")
		return
	}
	httpx.JSON(w, http.StatusCreated, branchView(br))
}

// Update edits a branch (partners:write).
func (h *BranchHandler) Update(w http.ResponseWriter, r *http.Request) {
	tenantID, _ := appctx.TenantID(r.Context())
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "invalid branch id")
		return
	}
	var body branchBody
	if err := httpx.Decode(r, &body); err != nil || strings.TrimSpace(body.Name) == "" {
		httpx.Error(w, http.StatusBadRequest, "name is required")
		return
	}
	br, err := h.Store.Queries.UpdateBranch(r.Context(), db.UpdateBranchParams{
		ID: id, TenantID: tenantID, Name: body.Name, Town: body.Town, Phone: body.Phone, Email: body.Email,
	})
	if err != nil {
		httpx.Error(w, http.StatusNotFound, "branch not found")
		return
	}
	httpx.JSON(w, http.StatusOK, branchView(br))
}

// Delete soft-deletes a branch (partners:delete).
func (h *BranchHandler) Delete(w http.ResponseWriter, r *http.Request) {
	tenantID, _ := appctx.TenantID(r.Context())
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "invalid branch id")
		return
	}
	if err := h.Store.Queries.DeleteBranch(r.Context(), db.DeleteBranchParams{
		ID: id, TenantID: tenantID, DeletedByName: actorName(r.Context(), h.Store), DeleteReason: deleteReason(r),
	}); err != nil {
		httpx.Error(w, http.StatusInternalServerError, "could not delete branch")
		return
	}
	httpx.JSON(w, http.StatusOK, map[string]bool{"ok": true})
}
