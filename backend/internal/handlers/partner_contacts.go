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

// PartnerContactHandler manages contact persons under a partner, ported from
// propsense. Named distinctly from MojaCRM's existing ContactHandler
// (contacts.go), which manages Directory contacts belonging to a customer —
// a different concept from propsense's partner-side contacts.
type PartnerContactHandler struct{ Deps }

func NewPartnerContactHandler(d Deps) *PartnerContactHandler { return &PartnerContactHandler{d} }

type partnerContactBody struct {
	FirstName        string `json:"first_name"`
	MiddleName       string `json:"middle_name"`
	LastName         string `json:"last_name"`
	Title            string `json:"title"`
	Email            string `json:"email"`
	Phone            string `json:"phone"`
	Whatsapp         string `json:"whatsapp"`
	PreferredChannel string `json:"preferred_channel"`
	IsActive         bool   `json:"is_active"`
	InactiveReason   string `json:"inactive_reason"`
}

func (b *partnerContactBody) normalize() bool {
	switch b.PreferredChannel {
	case "email", "phone", "whatsapp":
	default:
		b.PreferredChannel = "email"
	}
	if b.IsActive {
		b.InactiveReason = ""
	}
	return strings.TrimSpace(b.FirstName+b.LastName) != ""
}

// ListByPartner lists a partner's contacts (partners:read).
func (h *PartnerContactHandler) ListByPartner(w http.ResponseWriter, r *http.Request) {
	tenantID, _ := appctx.TenantID(r.Context())
	partnerID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "invalid partner id")
		return
	}
	rows, err := h.Store.Queries.ListContactsByPartner(r.Context(), db.ListContactsByPartnerParams{
		PartnerID: partnerID, TenantID: tenantID,
	})
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "could not list contacts")
		return
	}
	out := make([]PartnerContactView, 0, len(rows))
	for _, c := range rows {
		out = append(out, partnerContactFromListRow(c))
	}
	httpx.JSON(w, http.StatusOK, out)
}

// Create adds a contact to a partner (partners:write).
func (h *PartnerContactHandler) Create(w http.ResponseWriter, r *http.Request) {
	tenantID, _ := appctx.TenantID(r.Context())
	partnerID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "invalid partner id")
		return
	}
	var body partnerContactBody
	if err := httpx.Decode(r, &body); err != nil {
		httpx.Error(w, http.StatusBadRequest, "invalid request")
		return
	}
	if !body.normalize() {
		httpx.Error(w, http.StatusBadRequest, "a name is required")
		return
	}
	c, err := h.Store.Queries.CreatePartnerContact(r.Context(), db.CreatePartnerContactParams{
		TenantID: tenantID, PartnerID: partnerID,
		FirstName: body.FirstName, MiddleName: body.MiddleName, LastName: body.LastName, Title: body.Title,
		Email: body.Email, Phone: body.Phone, Whatsapp: body.Whatsapp, PreferredChannel: body.PreferredChannel,
		IsActive: body.IsActive, InactiveReason: body.InactiveReason,
		CreatedByName: actorName(r.Context(), h.Store),
	})
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "could not create contact")
		return
	}
	httpx.JSON(w, http.StatusCreated, partnerContactFromCreateRow(c))
}

// Update edits a contact (partners:write).
func (h *PartnerContactHandler) Update(w http.ResponseWriter, r *http.Request) {
	tenantID, _ := appctx.TenantID(r.Context())
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "invalid contact id")
		return
	}
	var body partnerContactBody
	if err := httpx.Decode(r, &body); err != nil {
		httpx.Error(w, http.StatusBadRequest, "invalid request")
		return
	}
	if !body.normalize() {
		httpx.Error(w, http.StatusBadRequest, "a name is required")
		return
	}
	c, err := h.Store.Queries.UpdatePartnerContact(r.Context(), db.UpdatePartnerContactParams{
		ID: id, TenantID: tenantID,
		FirstName: body.FirstName, MiddleName: body.MiddleName, LastName: body.LastName, Title: body.Title,
		Email: body.Email, Phone: body.Phone, Whatsapp: body.Whatsapp, PreferredChannel: body.PreferredChannel,
		IsActive: body.IsActive, InactiveReason: body.InactiveReason,
	})
	if err != nil {
		httpx.Error(w, http.StatusNotFound, "contact not found")
		return
	}
	httpx.JSON(w, http.StatusOK, partnerContactFromUpdateRow(c))
}

// Delete soft-deletes a contact (partners:delete).
func (h *PartnerContactHandler) Delete(w http.ResponseWriter, r *http.Request) {
	tenantID, _ := appctx.TenantID(r.Context())
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "invalid contact id")
		return
	}
	if err := h.Store.Queries.DeletePartnerContact(r.Context(), db.DeletePartnerContactParams{
		ID: id, TenantID: tenantID, DeletedByName: actorName(r.Context(), h.Store), DeleteReason: deleteReason(r),
	}); err != nil {
		httpx.Error(w, http.StatusInternalServerError, "could not delete contact")
		return
	}
	httpx.JSON(w, http.StatusOK, map[string]bool{"ok": true})
}
