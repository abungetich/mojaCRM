package handlers

import (
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	"mojacrm/backend/internal/appctx"
	"mojacrm/backend/internal/database/db"
	"mojacrm/backend/internal/httpx"
)

type ContactHandler struct{ Deps }

func NewContactHandler(d Deps) *ContactHandler { return &ContactHandler{d} }

type contactInput struct {
	FirstName               string `json:"first_name"`
	LastName                string `json:"last_name"`
	JobTitle                string `json:"job_title"`
	Department              string `json:"department"`
	Email                   string `json:"email"`
	Phone                   string `json:"phone"`
	AlternativePhone        string `json:"alternative_phone"`
	CommunicationPreference string `json:"communication_preference"`
	Notes                   string `json:"notes"`
}

func (h *ContactHandler) List(w http.ResponseWriter, r *http.Request) {
	customerID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "invalid customer id")
		return
	}
	contacts, err := h.Store.Queries.ListContactsByCustomer(r.Context(), customerID)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "could not list contacts")
		return
	}
	out := make([]ContactView, 0, len(contacts))
	for _, c := range contacts {
		out = append(out, contactView(c))
	}
	httpx.JSON(w, http.StatusOK, out)
}

func (h *ContactHandler) Create(w http.ResponseWriter, r *http.Request) {
	tenantID, _ := appctx.TenantID(r.Context())
	customerID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "invalid customer id")
		return
	}
	var in contactInput
	if err := httpx.Decode(r, &in); err != nil {
		httpx.Error(w, http.StatusBadRequest, "invalid body")
		return
	}
	if in.FirstName == "" || in.LastName == "" {
		httpx.Error(w, http.StatusBadRequest, "first_name and last_name are required")
		return
	}
	if in.Phone == "" {
		httpx.Error(w, http.StatusBadRequest, "phone is required")
		return
	}

	existing, err := h.Store.Queries.ListContactsByCustomer(r.Context(), customerID)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "could not check existing contacts")
		return
	}
	isPrimary := len(existing) == 0

	contact, err := h.Store.Queries.CreateContact(r.Context(), db.CreateContactParams{
		TenantID:                tenantID,
		CustomerID:              customerID,
		FirstName:               in.FirstName,
		LastName:                in.LastName,
		JobTitle:                in.JobTitle,
		Department:              in.Department,
		Email:                   in.Email,
		Phone:                   in.Phone,
		AlternativePhone:        in.AlternativePhone,
		IsPrimary:               isPrimary,
		CommunicationPreference: in.CommunicationPreference,
		Notes:                   in.Notes,
		Status:                  "active",
	})
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "could not create contact")
		return
	}
	httpx.JSON(w, http.StatusCreated, contactView(contact))
}

func (h *ContactHandler) Update(w http.ResponseWriter, r *http.Request) {
	customerID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "invalid customer id")
		return
	}
	contactID, err := uuid.Parse(chi.URLParam(r, "contactId"))
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "invalid contact id")
		return
	}
	var in contactInput
	if err := httpx.Decode(r, &in); err != nil {
		httpx.Error(w, http.StatusBadRequest, "invalid body")
		return
	}
	contact, err := h.Store.Queries.UpdateContact(r.Context(), db.UpdateContactParams{
		ID:                      contactID,
		CustomerID:              customerID,
		FirstName:               in.FirstName,
		LastName:                in.LastName,
		JobTitle:                in.JobTitle,
		Department:              in.Department,
		Email:                   in.Email,
		Phone:                   in.Phone,
		AlternativePhone:        in.AlternativePhone,
		CommunicationPreference: in.CommunicationPreference,
		Notes:                   in.Notes,
	})
	if err != nil {
		httpx.Error(w, http.StatusNotFound, "contact not found")
		return
	}
	httpx.JSON(w, http.StatusOK, contactView(contact))
}

func (h *ContactHandler) Delete(w http.ResponseWriter, r *http.Request) {
	customerID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "invalid customer id")
		return
	}
	contactID, err := uuid.Parse(chi.URLParam(r, "contactId"))
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "invalid contact id")
		return
	}
	if err := h.Store.Queries.DeleteContact(r.Context(), db.DeleteContactParams{ID: contactID, CustomerID: customerID}); err != nil {
		httpx.Error(w, http.StatusInternalServerError, "could not delete contact")
		return
	}
	httpx.JSON(w, http.StatusOK, map[string]bool{"ok": true})
}

func (h *ContactHandler) SetPrimary(w http.ResponseWriter, r *http.Request) {
	customerID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "invalid customer id")
		return
	}
	contactID, err := uuid.Parse(chi.URLParam(r, "contactId"))
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "invalid contact id")
		return
	}
	if err := h.Store.Queries.UnsetPrimaryContacts(r.Context(), customerID); err != nil {
		httpx.Error(w, http.StatusInternalServerError, "could not update contacts")
		return
	}
	contact, err := h.Store.Queries.SetContactPrimary(r.Context(), db.SetContactPrimaryParams{ID: contactID, CustomerID: customerID})
	if err != nil {
		httpx.Error(w, http.StatusNotFound, "contact not found")
		return
	}
	httpx.JSON(w, http.StatusOK, contactView(contact))
}

func (h *ContactHandler) SetStatus(w http.ResponseWriter, r *http.Request) {
	customerID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "invalid customer id")
		return
	}
	contactID, err := uuid.Parse(chi.URLParam(r, "contactId"))
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "invalid contact id")
		return
	}
	var body struct {
		Status string `json:"status"`
	}
	if err := httpx.Decode(r, &body); err != nil || (body.Status != "active" && body.Status != "inactive") {
		httpx.Error(w, http.StatusBadRequest, "status must be active or inactive")
		return
	}
	contact, err := h.Store.Queries.SetContactStatus(r.Context(), db.SetContactStatusParams{ID: contactID, CustomerID: customerID, Status: body.Status})
	if err != nil {
		httpx.Error(w, http.StatusNotFound, "contact not found")
		return
	}
	httpx.JSON(w, http.StatusOK, contactView(contact))
}
