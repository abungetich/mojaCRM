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

// PartnerRequirementHandler manages per-partner requirement packs, ported
// from propsense. propsense also tracks per-job completion of each
// requirement (instruction_requirement_status) and exposes
// ListForInstruction/SetStatus endpoints for that; those depend on
// propsense's `instructions` job register, which does not exist in MojaCRM
// yet, so only the partner-scoped requirement pack CRUD is ported here.
type PartnerRequirementHandler struct{ Deps }

func NewPartnerRequirementHandler(d Deps) *PartnerRequirementHandler {
	return &PartnerRequirementHandler{d}
}

func normReqKind(s string) string {
	if strings.TrimSpace(s) == "appendix" {
		return "appendix"
	}
	return "check"
}

// ListForPartner returns a partner's requirement pack (partners:read).
func (h *PartnerRequirementHandler) ListForPartner(w http.ResponseWriter, r *http.Request) {
	tenantID, _ := appctx.TenantID(r.Context())
	partnerID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "invalid partner id")
		return
	}
	rows, err := h.Store.Queries.ListPartnerRequirements(r.Context(), db.ListPartnerRequirementsParams{
		PartnerID: partnerID, TenantID: tenantID,
	})
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "could not list requirements")
		return
	}
	out := make([]PartnerRequirementView, 0, len(rows))
	for _, x := range rows {
		out = append(out, requirementView(x))
	}
	httpx.JSON(w, http.StatusOK, out)
}

// Create adds a requirement to a partner's pack (partners:write).
func (h *PartnerRequirementHandler) Create(w http.ResponseWriter, r *http.Request) {
	tenantID, _ := appctx.TenantID(r.Context())
	partnerID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "invalid partner id")
		return
	}
	var b struct {
		Label     string `json:"label"`
		Detail    string `json:"detail"`
		Kind      string `json:"kind"`
		SortOrder int32  `json:"sort_order"`
	}
	if err := httpx.Decode(r, &b); err != nil || strings.TrimSpace(b.Label) == "" {
		httpx.Error(w, http.StatusBadRequest, "a label is required")
		return
	}
	row, err := h.Store.Queries.CreatePartnerRequirement(r.Context(), db.CreatePartnerRequirementParams{
		TenantID: tenantID, PartnerID: partnerID, Label: strings.TrimSpace(b.Label), Detail: strings.TrimSpace(b.Detail),
		Kind: normReqKind(b.Kind), SortOrder: b.SortOrder, CreatedByName: actorName(r.Context(), h.Store),
	})
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "could not add requirement")
		return
	}
	httpx.JSON(w, http.StatusCreated, requirementView(row))
}

// Update edits a requirement (partners:write).
func (h *PartnerRequirementHandler) Update(w http.ResponseWriter, r *http.Request) {
	tenantID, _ := appctx.TenantID(r.Context())
	id, err := uuid.Parse(chi.URLParam(r, "rid"))
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "invalid id")
		return
	}
	var b struct {
		Label     string `json:"label"`
		Detail    string `json:"detail"`
		Kind      string `json:"kind"`
		SortOrder int32  `json:"sort_order"`
	}
	if err := httpx.Decode(r, &b); err != nil || strings.TrimSpace(b.Label) == "" {
		httpx.Error(w, http.StatusBadRequest, "a label is required")
		return
	}
	if err := h.Store.Queries.UpdatePartnerRequirement(r.Context(), db.UpdatePartnerRequirementParams{
		ID: id, TenantID: tenantID, Label: strings.TrimSpace(b.Label), Detail: strings.TrimSpace(b.Detail),
		Kind: normReqKind(b.Kind), SortOrder: b.SortOrder,
	}); err != nil {
		httpx.Error(w, http.StatusInternalServerError, "could not update requirement")
		return
	}
	httpx.JSON(w, http.StatusOK, map[string]bool{"ok": true})
}

// Delete removes (deactivates) a requirement (partners:write).
func (h *PartnerRequirementHandler) Delete(w http.ResponseWriter, r *http.Request) {
	tenantID, _ := appctx.TenantID(r.Context())
	id, err := uuid.Parse(chi.URLParam(r, "rid"))
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "invalid id")
		return
	}
	if err := h.Store.Queries.DeletePartnerRequirement(r.Context(), db.DeletePartnerRequirementParams{
		ID: id, TenantID: tenantID,
	}); err != nil {
		httpx.Error(w, http.StatusInternalServerError, "could not delete requirement")
		return
	}
	httpx.JSON(w, http.StatusOK, map[string]bool{"ok": true})
}
