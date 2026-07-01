package handlers

import (
	"encoding/json"
	"net/http"
	"strings"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	"mojacrm/backend/internal/appctx"
	"mojacrm/backend/internal/database/db"
	"mojacrm/backend/internal/httpx"
)

// AppendixTemplateHandler manages per-partner report appendix templates
// (fillable forms a bank requires, e.g. an Environmental & Social
// appendix), ported from propsense. propsense also stamps a filled snapshot
// of these onto its `reports` table; reports don't exist in MojaCRM yet, so
// that part is not ported in this phase.
type AppendixTemplateHandler struct{ Deps }

func NewAppendixTemplateHandler(d Deps) *AppendixTemplateHandler { return &AppendixTemplateHandler{d} }

type appendixTemplateBody struct {
	Name        string          `json:"name"`
	Description string          `json:"description"`
	Fields      []AppendixField `json:"fields"`
	SortOrder   int32           `json:"sort_order"`
}

func normFieldType(s string) string {
	switch strings.TrimSpace(s) {
	case "textarea":
		return "textarea"
	case "checkbox":
		return "checkbox"
	default:
		return "text"
	}
}

func cleanFields(in []AppendixField) []byte {
	out := make([]AppendixField, 0, len(in))
	for _, f := range in {
		if strings.TrimSpace(f.Label) == "" {
			continue
		}
		out = append(out, AppendixField{Label: strings.TrimSpace(f.Label), Type: normFieldType(f.Type)})
	}
	b, _ := json.Marshal(out)
	return b
}

// ListForPartner returns a partner's appendix templates (partners:read).
func (h *AppendixTemplateHandler) ListForPartner(w http.ResponseWriter, r *http.Request) {
	tenantID, _ := appctx.TenantID(r.Context())
	partnerID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "invalid partner id")
		return
	}
	rows, err := h.Store.Queries.ListAppendixTemplatesForPartner(r.Context(), db.ListAppendixTemplatesForPartnerParams{
		PartnerID: partnerID, TenantID: tenantID,
	})
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "could not list appendix templates")
		return
	}
	out := make([]AppendixTemplateView, 0, len(rows))
	for _, x := range rows {
		out = append(out, appendixTemplateView(x))
	}
	httpx.JSON(w, http.StatusOK, out)
}

// Create adds an appendix template to a partner (partners:write).
func (h *AppendixTemplateHandler) Create(w http.ResponseWriter, r *http.Request) {
	tenantID, _ := appctx.TenantID(r.Context())
	partnerID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "invalid partner id")
		return
	}
	var b appendixTemplateBody
	if err := httpx.Decode(r, &b); err != nil || strings.TrimSpace(b.Name) == "" {
		httpx.Error(w, http.StatusBadRequest, "a template name is required")
		return
	}
	row, err := h.Store.Queries.CreateAppendixTemplate(r.Context(), db.CreateAppendixTemplateParams{
		TenantID: tenantID, PartnerID: partnerID, Name: strings.TrimSpace(b.Name), Description: strings.TrimSpace(b.Description),
		Fields: cleanFields(b.Fields), SortOrder: b.SortOrder, CreatedByName: actorName(r.Context(), h.Store),
	})
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "could not create appendix template")
		return
	}
	httpx.JSON(w, http.StatusCreated, appendixTemplateView(row))
}

// Update edits an appendix template (partners:write).
func (h *AppendixTemplateHandler) Update(w http.ResponseWriter, r *http.Request) {
	tenantID, _ := appctx.TenantID(r.Context())
	id, err := uuid.Parse(chi.URLParam(r, "templateId"))
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "invalid template id")
		return
	}
	var b appendixTemplateBody
	if err := httpx.Decode(r, &b); err != nil || strings.TrimSpace(b.Name) == "" {
		httpx.Error(w, http.StatusBadRequest, "a template name is required")
		return
	}
	row, err := h.Store.Queries.UpdateAppendixTemplate(r.Context(), db.UpdateAppendixTemplateParams{
		ID: id, TenantID: tenantID, Name: strings.TrimSpace(b.Name), Description: strings.TrimSpace(b.Description),
		Fields: cleanFields(b.Fields), SortOrder: b.SortOrder,
	})
	if err != nil {
		httpx.Error(w, http.StatusNotFound, "appendix template not found")
		return
	}
	httpx.JSON(w, http.StatusOK, appendixTemplateView(row))
}

// Delete deactivates an appendix template (partners:write).
func (h *AppendixTemplateHandler) Delete(w http.ResponseWriter, r *http.Request) {
	tenantID, _ := appctx.TenantID(r.Context())
	id, err := uuid.Parse(chi.URLParam(r, "templateId"))
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "invalid template id")
		return
	}
	if err := h.Store.Queries.DeleteAppendixTemplate(r.Context(), db.DeleteAppendixTemplateParams{
		ID: id, TenantID: tenantID,
	}); err != nil {
		httpx.Error(w, http.StatusInternalServerError, "could not delete appendix template")
		return
	}
	httpx.JSON(w, http.StatusOK, map[string]bool{"ok": true})
}
