package handlers

import (
	"net/http"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"

	"mojacrm/backend/internal/appctx"
	"mojacrm/backend/internal/database/db"
	"mojacrm/backend/internal/httpx"
)

type CommunicationHandler struct{ Deps }

func NewCommunicationHandler(d Deps) *CommunicationHandler { return &CommunicationHandler{d} }

var validCommTypes = map[string]bool{
	"call": true, "email": true, "sms": true, "whatsapp": true,
	"meeting": true, "note": true, "task_followup": true, "system_message": true,
}
var validCommDirections = map[string]bool{"incoming": true, "outgoing": true, "internal": true}
var validCommStatuses = map[string]bool{"draft": true, "sent": true, "delivered": true, "failed": true, "completed": true}

type communicationInput struct {
	ContactID         *string `json:"contact_id"`
	CommunicationType string  `json:"communication_type"`
	Direction         string  `json:"direction"`
	Subject           string  `json:"subject"`
	MessageBody       string  `json:"message_body"`
	Status            string  `json:"status"`
	CommunicationDate *string `json:"communication_date"`
	FollowUpRequired  bool    `json:"follow_up_required"`
	FollowUpDate      *string `json:"follow_up_date"`
	AssignedTo        *string `json:"assigned_to"`
}

func parseTimestamptz(s *string) (pgtype.Timestamptz, error) {
	if s == nil || *s == "" {
		return pgtype.Timestamptz{}, nil
	}
	t, err := time.Parse(time.RFC3339, *s)
	if err != nil {
		t, err = time.Parse("2006-01-02T15:04", *s)
		if err != nil {
			return pgtype.Timestamptz{}, err
		}
	}
	return pgtype.Timestamptz{Time: t, Valid: true}, nil
}

// Create logs a new communication (call, email, SMS, WhatsApp, meeting,
// note, follow-up, or system message) against a customer.
func (h *CommunicationHandler) Create(w http.ResponseWriter, r *http.Request) {
	tenantID, _ := appctx.TenantID(r.Context())
	customerID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "invalid customer id")
		return
	}
	var in communicationInput
	if err := httpx.Decode(r, &in); err != nil {
		httpx.Error(w, http.StatusBadRequest, "invalid body")
		return
	}
	if !validCommTypes[in.CommunicationType] {
		httpx.Error(w, http.StatusBadRequest, "invalid communication_type")
		return
	}
	if in.Direction == "" {
		in.Direction = "outgoing"
	}
	if !validCommDirections[in.Direction] {
		httpx.Error(w, http.StatusBadRequest, "invalid direction")
		return
	}
	if in.Status == "" {
		in.Status = "completed"
	}
	if !validCommStatuses[in.Status] {
		httpx.Error(w, http.StatusBadRequest, "invalid status")
		return
	}

	var contactID pgtype.UUID
	if in.ContactID != nil && *in.ContactID != "" {
		parsed, err := uuid.Parse(*in.ContactID)
		if err != nil {
			httpx.Error(w, http.StatusBadRequest, "invalid contact_id")
			return
		}
		contactID = pgtype.UUID{Bytes: parsed, Valid: true}
	}

	commDate := time.Now()
	if in.CommunicationDate != nil && *in.CommunicationDate != "" {
		parsed, err := parseTimestamptz(in.CommunicationDate)
		if err != nil {
			httpx.Error(w, http.StatusBadRequest, "invalid communication_date")
			return
		}
		commDate = parsed.Time
	}

	followUpDate, err := parseTimestamptz(in.FollowUpDate)
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "invalid follow_up_date")
		return
	}

	var assignedTo pgtype.UUID
	if in.AssignedTo != nil && *in.AssignedTo != "" {
		parsed, err := uuid.Parse(*in.AssignedTo)
		if err != nil {
			httpx.Error(w, http.StatusBadRequest, "invalid assigned_to")
			return
		}
		assignedTo = pgtype.UUID{Bytes: parsed, Valid: true}
	}

	userID, _ := appctx.UserID(r.Context())

	comm, err := h.Store.Queries.CreateCommunication(r.Context(), db.CreateCommunicationParams{
		TenantID:          tenantID,
		CustomerID:        customerID,
		ContactID:         contactID,
		CommunicationType: in.CommunicationType,
		Direction:         in.Direction,
		Subject:           in.Subject,
		MessageBody:       in.MessageBody,
		Status:            in.Status,
		CommunicationDate: commDate,
		FollowUpRequired:  in.FollowUpRequired,
		FollowUpDate:      followUpDate,
		CreatedBy:         pgtype.UUID{Bytes: userID, Valid: true},
		AssignedTo:        assignedTo,
	})
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "could not log communication")
		return
	}
	httpx.JSON(w, http.StatusCreated, communicationView(comm))
}

// ListByCustomer returns the full activity timeline for one customer.
func (h *CommunicationHandler) ListByCustomer(w http.ResponseWriter, r *http.Request) {
	customerID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "invalid customer id")
		return
	}
	rows, err := h.Store.Queries.ListCommunicationsByCustomer(r.Context(), customerID)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "could not list communications")
		return
	}
	out := make([]CommunicationView, 0, len(rows))
	for _, row := range rows {
		out = append(out, communicationByCustomerRowView(row))
	}
	httpx.JSON(w, http.StatusOK, out)
}

type paginatedCommunications struct {
	Data     []CommunicationView `json:"data"`
	Total    int64               `json:"total"`
	Page     int32               `json:"page"`
	PageSize int32               `json:"page_size"`
}

// List is the tenant-wide Communications Center: every logged
// communication across all customers, with filters and pagination.
func (h *CommunicationHandler) List(w http.ResponseWriter, r *http.Request) {
	tenantID, _ := appctx.TenantID(r.Context())
	q := r.URL.Query()

	page := parseIntDefault(q.Get("page"), 1)
	if page < 1 {
		page = 1
	}
	pageSize := parseIntDefault(q.Get("page_size"), 25)
	if pageSize < 1 {
		pageSize = 25
	}
	if pageSize > 100 {
		pageSize = 100
	}

	commType := q.Get("communication_type")
	status := q.Get("status")
	followUp := q.Get("follow_up_required")
	search := strings.TrimSpace(q.Get("q"))

	rows, err := h.Store.Queries.ListCommunications(r.Context(), db.ListCommunicationsParams{
		TenantID: tenantID,
		Column2:  commType,
		Column3:  status,
		Column4:  followUp,
		Column5:  search,
		Limit:    pageSize,
		Offset:   (page - 1) * pageSize,
	})
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "could not list communications")
		return
	}
	total, err := h.Store.Queries.CountCommunications(r.Context(), db.CountCommunicationsParams{
		TenantID: tenantID,
		Column2:  commType,
		Column3:  status,
		Column4:  followUp,
		Column5:  search,
	})
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "could not count communications")
		return
	}

	out := make([]CommunicationView, 0, len(rows))
	for _, row := range rows {
		out = append(out, communicationListRowView(row))
	}
	httpx.JSON(w, http.StatusOK, paginatedCommunications{Data: out, Total: total, Page: page, PageSize: pageSize})
}

// FollowUps lists every open follow-up across the tenant, soonest first.
func (h *CommunicationHandler) FollowUps(w http.ResponseWriter, r *http.Request) {
	tenantID, _ := appctx.TenantID(r.Context())
	rows, err := h.Store.Queries.ListFollowUpsDue(r.Context(), tenantID)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "could not list follow-ups")
		return
	}
	out := make([]CommunicationView, 0, len(rows))
	for _, row := range rows {
		out = append(out, followUpDueRowView(row))
	}
	httpx.JSON(w, http.StatusOK, out)
}

func (h *CommunicationHandler) UpdateStatus(w http.ResponseWriter, r *http.Request) {
	tenantID, _ := appctx.TenantID(r.Context())
	id, err := uuid.Parse(chi.URLParam(r, "commId"))
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "invalid id")
		return
	}
	var body struct {
		Status string `json:"status"`
	}
	if err := httpx.Decode(r, &body); err != nil || !validCommStatuses[body.Status] {
		httpx.Error(w, http.StatusBadRequest, "invalid status")
		return
	}
	comm, err := h.Store.Queries.UpdateCommunicationStatus(r.Context(), db.UpdateCommunicationStatusParams{ID: id, TenantID: tenantID, Status: body.Status})
	if err != nil {
		httpx.Error(w, http.StatusNotFound, "communication not found")
		return
	}
	httpx.JSON(w, http.StatusOK, communicationView(comm))
}

func (h *CommunicationHandler) CompleteFollowUp(w http.ResponseWriter, r *http.Request) {
	tenantID, _ := appctx.TenantID(r.Context())
	id, err := uuid.Parse(chi.URLParam(r, "commId"))
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "invalid id")
		return
	}
	comm, err := h.Store.Queries.CompleteFollowUp(r.Context(), db.CompleteFollowUpParams{ID: id, TenantID: tenantID})
	if err != nil {
		httpx.Error(w, http.StatusNotFound, "communication not found")
		return
	}
	httpx.JSON(w, http.StatusOK, communicationView(comm))
}

func (h *CommunicationHandler) Delete(w http.ResponseWriter, r *http.Request) {
	tenantID, _ := appctx.TenantID(r.Context())
	id, err := uuid.Parse(chi.URLParam(r, "commId"))
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "invalid id")
		return
	}
	if err := h.Store.Queries.DeleteCommunication(r.Context(), db.DeleteCommunicationParams{ID: id, TenantID: tenantID}); err != nil {
		httpx.Error(w, http.StatusInternalServerError, "could not delete communication")
		return
	}
	httpx.JSON(w, http.StatusOK, map[string]bool{"ok": true})
}
