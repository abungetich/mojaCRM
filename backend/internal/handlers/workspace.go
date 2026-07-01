package handlers

import (
	"net/http"

	"mojacrm/backend/internal/appctx"
	"mojacrm/backend/internal/database/db"
	"mojacrm/backend/internal/httpx"
)

// WorkspaceHandler manages the tenant's own organisation profile, email
// sender settings, and a read-only view of its billing plan — ported from
// propsense's workspace.go, trimmed to what MojaCRM actually has (no
// letterhead/seal assets, fee scales, or report-template boilerplate yet).
type WorkspaceHandler struct{ Deps }

func NewWorkspaceHandler(d Deps) *WorkspaceHandler { return &WorkspaceHandler{d} }

// Get returns the current tenant's profile.
func (h *WorkspaceHandler) Get(w http.ResponseWriter, r *http.Request) {
	tenantID, _ := appctx.TenantID(r.Context())
	tenant, err := h.Store.Queries.GetTenantByID(r.Context(), tenantID)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "could not load workspace")
		return
	}
	httpx.JSON(w, http.StatusOK, tenant)
}

type profileBody struct {
	Name           string `json:"name"`
	Country        string `json:"country"`
	LegalName      string `json:"legal_name"`
	RegistrationNo string `json:"registration_no"`
	KraPin         string `json:"kra_pin"`
	Phone          string `json:"phone"`
	Email          string `json:"email"`
	Website        string `json:"website"`
}

// UpdateProfile edits the organisation's legal identity fields (settings:write).
func (h *WorkspaceHandler) UpdateProfile(w http.ResponseWriter, r *http.Request) {
	tenantID, _ := appctx.TenantID(r.Context())
	var body profileBody
	if err := httpx.Decode(r, &body); err != nil || body.Name == "" {
		httpx.Error(w, http.StatusBadRequest, "name is required")
		return
	}
	tenant, err := h.Store.Queries.UpdateTenantProfile(r.Context(), db.UpdateTenantProfileParams{
		ID: tenantID, Name: body.Name, Country: body.Country, LegalName: body.LegalName,
		RegistrationNo: body.RegistrationNo, KraPin: body.KraPin, Phone: body.Phone,
		Email: body.Email, Website: body.Website,
	})
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "could not update profile")
		return
	}
	httpx.JSON(w, http.StatusOK, tenant)
}

type emailSettingsBody struct {
	MailSenderName string `json:"mail_sender_name"`
	MailReplyTo    string `json:"mail_reply_to"`
	InvoiceCc      string `json:"invoice_cc"`
	InvoiceBcc     string `json:"invoice_bcc"`
	BillingEmail   string `json:"billing_email"`
}

// UpdateEmailSettings edits the tenant's sender/notification preferences (settings:write).
func (h *WorkspaceHandler) UpdateEmailSettings(w http.ResponseWriter, r *http.Request) {
	tenantID, _ := appctx.TenantID(r.Context())
	var body emailSettingsBody
	if err := httpx.Decode(r, &body); err != nil {
		httpx.Error(w, http.StatusBadRequest, "invalid request")
		return
	}
	tenant, err := h.Store.Queries.UpdateTenantEmailSettings(r.Context(), db.UpdateTenantEmailSettingsParams{
		ID: tenantID, MailSenderName: body.MailSenderName, MailReplyTo: body.MailReplyTo,
		InvoiceCc: body.InvoiceCc, InvoiceBcc: body.InvoiceBcc, BillingEmail: body.BillingEmail,
	})
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "could not update email settings")
		return
	}
	httpx.JSON(w, http.StatusOK, tenant)
}

// Billing returns a read-only view of the tenant's own plan. MojaCRM has no
// subscriptions/plans system yet (unlike propsense's Billing page, which
// lists all plans + the active subscription) — this just surfaces the
// `plan` column already on the tenants table (settings:read).
func (h *WorkspaceHandler) Billing(w http.ResponseWriter, r *http.Request) {
	tenantID, _ := appctx.TenantID(r.Context())
	tenant, err := h.Store.Queries.GetTenantByID(r.Context(), tenantID)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "could not load billing")
		return
	}
	httpx.JSON(w, http.StatusOK, map[string]string{"plan": tenant.Plan, "status": tenant.Status})
}
