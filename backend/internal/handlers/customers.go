package handlers

import (
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"

	"mojacrm/backend/internal/appctx"
	"mojacrm/backend/internal/database/db"
	"mojacrm/backend/internal/httpx"
)

type CustomerHandler struct{ Deps }

func NewCustomerHandler(d Deps) *CustomerHandler { return &CustomerHandler{d} }

var validCustomerTypes = map[string]bool{"organization": true, "individual": true}
var validCustomerStatuses = map[string]bool{"prospect": true, "active": true, "dormant": true, "archived": true, "blacklisted": true}

type customerInput struct {
	CustomerType       string  `json:"customer_type"`
	Segment            string  `json:"segment"`
	Source             string  `json:"source"`
	OrganizationName   string  `json:"organization_name"`
	LegalName          string  `json:"legal_name"`
	TradingName        string  `json:"trading_name"`
	RegistrationNumber string  `json:"registration_number"`
	TaxPin             string  `json:"tax_pin"`
	Industry           string  `json:"industry"`
	OrganizationSize   string  `json:"organization_size"`
	FirstName          string  `json:"first_name"`
	MiddleName         string  `json:"middle_name"`
	LastName           string  `json:"last_name"`
	DisplayName        string  `json:"display_name"`
	IDNumber           string  `json:"id_number"`
	DateOfBirth        *string `json:"date_of_birth"`
	Gender             string  `json:"gender"`
	Occupation         string  `json:"occupation"`
	Website            string  `json:"website"`
	Description        string  `json:"description"`
	PrimaryEmail       string  `json:"primary_email"`
	PrimaryPhone       string  `json:"primary_phone"`
	AlternativePhone   string  `json:"alternative_phone"`
	Address            string  `json:"address"`
	Country            string  `json:"country"`
	State              string  `json:"state"`
	City               string  `json:"city"`
}

func parseDate(s *string) (pgtype.Date, error) {
	if s == nil || *s == "" {
		return pgtype.Date{}, nil
	}
	t, err := time.Parse("2006-01-02", *s)
	if err != nil {
		return pgtype.Date{}, err
	}
	return pgtype.Date{Time: t, Valid: true}, nil
}

func (h *CustomerHandler) Create(w http.ResponseWriter, r *http.Request) {
	tenantID, _ := appctx.TenantID(r.Context())
	var in customerInput
	if err := httpx.Decode(r, &in); err != nil {
		httpx.Error(w, http.StatusBadRequest, "invalid body")
		return
	}
	if !validCustomerTypes[in.CustomerType] {
		httpx.Error(w, http.StatusBadRequest, "customer_type must be organization or individual")
		return
	}
	if in.CustomerType == "organization" && in.OrganizationName == "" {
		httpx.Error(w, http.StatusBadRequest, "organization_name is required")
		return
	}
	if in.CustomerType == "individual" {
		if in.FirstName == "" || in.LastName == "" {
			httpx.Error(w, http.StatusBadRequest, "first_name and last_name are required")
			return
		}
		if in.PrimaryPhone == "" {
			httpx.Error(w, http.StatusBadRequest, "primary_phone is required")
			return
		}
	}

	dob, err := parseDate(in.DateOfBirth)
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "invalid date_of_birth, expected YYYY-MM-DD")
		return
	}

	displayName := strings.TrimSpace(in.DisplayName)
	if displayName == "" {
		if in.CustomerType == "organization" {
			displayName = in.OrganizationName
		} else {
			displayName = strings.TrimSpace(in.FirstName + " " + in.LastName)
		}
	}

	customer, err := h.Store.Queries.CreateCustomer(r.Context(), db.CreateCustomerParams{
		TenantID:           tenantID,
		CustomerType:       in.CustomerType,
		Status:             "prospect",
		Segment:            in.Segment,
		Source:             in.Source,
		OrganizationName:   in.OrganizationName,
		LegalName:          in.LegalName,
		TradingName:        in.TradingName,
		RegistrationNumber: in.RegistrationNumber,
		TaxPin:             in.TaxPin,
		Industry:           in.Industry,
		OrganizationSize:   in.OrganizationSize,
		FirstName:          in.FirstName,
		MiddleName:         in.MiddleName,
		LastName:           in.LastName,
		DisplayName:        displayName,
		IDNumber:           in.IDNumber,
		DateOfBirth:        dob,
		Gender:             in.Gender,
		Occupation:         in.Occupation,
		Website:            in.Website,
		Description:        in.Description,
		PrimaryEmail:       in.PrimaryEmail,
		PrimaryPhone:       in.PrimaryPhone,
		AlternativePhone:   in.AlternativePhone,
		Address:            in.Address,
		Country:            in.Country,
		State:              in.State,
		City:               in.City,
	})
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "could not create customer")
		return
	}
	httpx.JSON(w, http.StatusCreated, customerView(customer))
}

func (h *CustomerHandler) Update(w http.ResponseWriter, r *http.Request) {
	tenantID, _ := appctx.TenantID(r.Context())
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "invalid id")
		return
	}
	var in customerInput
	if err := httpx.Decode(r, &in); err != nil {
		httpx.Error(w, http.StatusBadRequest, "invalid body")
		return
	}
	dob, err := parseDate(in.DateOfBirth)
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "invalid date_of_birth, expected YYYY-MM-DD")
		return
	}
	displayName := strings.TrimSpace(in.DisplayName)
	if displayName == "" {
		if in.CustomerType == "organization" {
			displayName = in.OrganizationName
		} else {
			displayName = strings.TrimSpace(in.FirstName + " " + in.LastName)
		}
	}

	customer, err := h.Store.Queries.UpdateCustomer(r.Context(), db.UpdateCustomerParams{
		ID:                 id,
		TenantID:           tenantID,
		Segment:            in.Segment,
		Source:             in.Source,
		OrganizationName:   in.OrganizationName,
		LegalName:          in.LegalName,
		TradingName:        in.TradingName,
		RegistrationNumber: in.RegistrationNumber,
		TaxPin:             in.TaxPin,
		Industry:           in.Industry,
		OrganizationSize:   in.OrganizationSize,
		FirstName:          in.FirstName,
		MiddleName:         in.MiddleName,
		LastName:           in.LastName,
		DisplayName:        displayName,
		IDNumber:           in.IDNumber,
		DateOfBirth:        dob,
		Gender:             in.Gender,
		Occupation:         in.Occupation,
		Website:            in.Website,
		Description:        in.Description,
		PrimaryEmail:       in.PrimaryEmail,
		PrimaryPhone:       in.PrimaryPhone,
		AlternativePhone:   in.AlternativePhone,
		Address:            in.Address,
		Country:            in.Country,
		State:              in.State,
		City:               in.City,
	})
	if err != nil {
		httpx.Error(w, http.StatusNotFound, "customer not found")
		return
	}
	httpx.JSON(w, http.StatusOK, customerView(customer))
}

func (h *CustomerHandler) Get(w http.ResponseWriter, r *http.Request) {
	tenantID, _ := appctx.TenantID(r.Context())
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "invalid id")
		return
	}
	row, err := h.Store.Queries.GetCustomerByID(r.Context(), db.GetCustomerByIDParams{ID: id, TenantID: tenantID})
	if err != nil {
		httpx.Error(w, http.StatusNotFound, "customer not found")
		return
	}
	httpx.JSON(w, http.StatusOK, getCustomerByIDRowView(row))
}

type paginatedCustomers struct {
	Data     []CustomerView `json:"data"`
	Total    int64          `json:"total"`
	Page     int32          `json:"page"`
	PageSize int32          `json:"page_size"`
}

func (h *CustomerHandler) List(w http.ResponseWriter, r *http.Request) {
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

	status := q.Get("status")
	customerType := q.Get("customer_type")
	segment := q.Get("segment")
	search := strings.TrimSpace(q.Get("q"))

	rows, err := h.Store.Queries.ListCustomers(r.Context(), db.ListCustomersParams{
		TenantID: tenantID,
		Column2:  status,
		Column3:  customerType,
		Column4:  segment,
		Column5:  search,
		Limit:    pageSize,
		Offset:   (page - 1) * pageSize,
	})
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "could not list customers")
		return
	}
	total, err := h.Store.Queries.CountCustomers(r.Context(), db.CountCustomersParams{
		TenantID: tenantID,
		Column2:  status,
		Column3:  customerType,
		Column4:  segment,
		Column5:  search,
	})
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "could not count customers")
		return
	}

	out := make([]CustomerView, 0, len(rows))
	for _, row := range rows {
		out = append(out, listCustomersRowView(row))
	}
	httpx.JSON(w, http.StatusOK, paginatedCustomers{Data: out, Total: total, Page: page, PageSize: pageSize})
}

func parseIntDefault(s string, def int32) int32 {
	if s == "" {
		return def
	}
	n, err := strconv.Atoi(s)
	if err != nil {
		return def
	}
	return int32(n)
}

func (h *CustomerHandler) Delete(w http.ResponseWriter, r *http.Request) {
	tenantID, _ := appctx.TenantID(r.Context())
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "invalid id")
		return
	}
	if err := h.Store.Queries.DeleteCustomer(r.Context(), db.DeleteCustomerParams{ID: id, TenantID: tenantID}); err != nil {
		httpx.Error(w, http.StatusInternalServerError, "could not delete customer")
		return
	}
	httpx.JSON(w, http.StatusOK, map[string]bool{"ok": true})
}

func (h *CustomerHandler) Archive(w http.ResponseWriter, r *http.Request) {
	tenantID, _ := appctx.TenantID(r.Context())
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "invalid id")
		return
	}
	var body struct {
		Reason string `json:"reason"`
	}
	if err := httpx.Decode(r, &body); err != nil {
		httpx.Error(w, http.StatusBadRequest, "invalid body")
		return
	}
	customer, err := h.Store.Queries.ArchiveCustomer(r.Context(), db.ArchiveCustomerParams{ID: id, TenantID: tenantID, ArchiveReason: &body.Reason})
	if err != nil {
		httpx.Error(w, http.StatusNotFound, "customer not found")
		return
	}
	httpx.JSON(w, http.StatusOK, customerView(customer))
}

func (h *CustomerHandler) Restore(w http.ResponseWriter, r *http.Request) {
	tenantID, _ := appctx.TenantID(r.Context())
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "invalid id")
		return
	}
	customer, err := h.Store.Queries.RestoreCustomer(r.Context(), db.RestoreCustomerParams{ID: id, TenantID: tenantID})
	if err != nil {
		httpx.Error(w, http.StatusNotFound, "customer not found")
		return
	}
	httpx.JSON(w, http.StatusOK, customerView(customer))
}

func (h *CustomerHandler) SetStatus(w http.ResponseWriter, r *http.Request) {
	tenantID, _ := appctx.TenantID(r.Context())
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "invalid id")
		return
	}
	var body struct {
		Status string `json:"status"`
	}
	if err := httpx.Decode(r, &body); err != nil || !validCustomerStatuses[body.Status] {
		httpx.Error(w, http.StatusBadRequest, "invalid status")
		return
	}
	customer, err := h.Store.Queries.SetCustomerStatus(r.Context(), db.SetCustomerStatusParams{ID: id, TenantID: tenantID, Status: body.Status})
	if err != nil {
		httpx.Error(w, http.StatusNotFound, "customer not found")
		return
	}
	httpx.JSON(w, http.StatusOK, customerView(customer))
}

func (h *CustomerHandler) AssignOwner(w http.ResponseWriter, r *http.Request) {
	tenantID, _ := appctx.TenantID(r.Context())
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "invalid id")
		return
	}
	var body struct {
		AccountOwnerID string `json:"account_owner_id"`
	}
	if err := httpx.Decode(r, &body); err != nil {
		httpx.Error(w, http.StatusBadRequest, "invalid body")
		return
	}
	var ownerID pgtype.UUID
	if body.AccountOwnerID != "" {
		parsed, err := uuid.Parse(body.AccountOwnerID)
		if err != nil {
			httpx.Error(w, http.StatusBadRequest, "invalid account_owner_id")
			return
		}
		ownerID = pgtype.UUID{Bytes: parsed, Valid: true}
	}
	customer, err := h.Store.Queries.AssignAccountOwner(r.Context(), db.AssignAccountOwnerParams{ID: id, TenantID: tenantID, AccountOwnerID: ownerID})
	if err != nil {
		httpx.Error(w, http.StatusNotFound, "customer not found")
		return
	}
	httpx.JSON(w, http.StatusOK, customerView(customer))
}

// --- Tags ---

func (h *CustomerHandler) ListTags(w http.ResponseWriter, r *http.Request) {
	tenantID, _ := appctx.TenantID(r.Context())
	tags, err := h.Store.Queries.ListTags(r.Context(), tenantID)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "could not list tags")
		return
	}
	out := make([]TagView, 0, len(tags))
	for _, t := range tags {
		out = append(out, tagView(t))
	}
	httpx.JSON(w, http.StatusOK, out)
}

func (h *CustomerHandler) ListCustomerTags(w http.ResponseWriter, r *http.Request) {
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "invalid id")
		return
	}
	tags, err := h.Store.Queries.ListCustomerTags(r.Context(), id)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "could not list tags")
		return
	}
	out := make([]TagView, 0, len(tags))
	for _, t := range tags {
		out = append(out, tagView(t))
	}
	httpx.JSON(w, http.StatusOK, out)
}

func (h *CustomerHandler) AddTag(w http.ResponseWriter, r *http.Request) {
	tenantID, _ := appctx.TenantID(r.Context())
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "invalid id")
		return
	}
	var body struct {
		Name string `json:"name"`
	}
	if err := httpx.Decode(r, &body); err != nil || strings.TrimSpace(body.Name) == "" {
		httpx.Error(w, http.StatusBadRequest, "tag name is required")
		return
	}
	tag, err := h.Store.Queries.UpsertTag(r.Context(), db.UpsertTagParams{TenantID: tenantID, Name: strings.TrimSpace(body.Name)})
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "could not create tag")
		return
	}
	if err := h.Store.Queries.AddTagToCustomer(r.Context(), db.AddTagToCustomerParams{CustomerID: id, TagID: tag.ID}); err != nil {
		httpx.Error(w, http.StatusInternalServerError, "could not tag customer")
		return
	}
	httpx.JSON(w, http.StatusCreated, tagView(tag))
}

func (h *CustomerHandler) RemoveTag(w http.ResponseWriter, r *http.Request) {
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "invalid id")
		return
	}
	tagID, err := uuid.Parse(chi.URLParam(r, "tagId"))
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "invalid tag id")
		return
	}
	if err := h.Store.Queries.RemoveTagFromCustomer(r.Context(), db.RemoveTagFromCustomerParams{CustomerID: id, TagID: tagID}); err != nil {
		httpx.Error(w, http.StatusInternalServerError, "could not remove tag")
		return
	}
	httpx.JSON(w, http.StatusOK, map[string]bool{"ok": true})
}

// --- Notes ---

func (h *CustomerHandler) ListNotes(w http.ResponseWriter, r *http.Request) {
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "invalid id")
		return
	}
	notes, err := h.Store.Queries.ListCustomerNotes(r.Context(), id)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "could not list notes")
		return
	}
	out := make([]NoteView, 0, len(notes))
	for _, n := range notes {
		out = append(out, noteView(n))
	}
	httpx.JSON(w, http.StatusOK, out)
}

func (h *CustomerHandler) CreateNote(w http.ResponseWriter, r *http.Request) {
	tenantID, _ := appctx.TenantID(r.Context())
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "invalid id")
		return
	}
	var body struct {
		Body string `json:"body"`
	}
	if err := httpx.Decode(r, &body); err != nil || strings.TrimSpace(body.Body) == "" {
		httpx.Error(w, http.StatusBadRequest, "note body is required")
		return
	}
	userID, _ := appctx.UserID(r.Context())
	note, err := h.Store.Queries.CreateCustomerNote(r.Context(), db.CreateCustomerNoteParams{
		TenantID:   tenantID,
		CustomerID: id,
		AuthorID:   pgtype.UUID{Bytes: userID, Valid: true},
		Body:       body.Body,
	})
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "could not create note")
		return
	}
	authorName := ""
	if user, err := h.Store.Queries.GetUserByID(r.Context(), userID); err == nil {
		authorName = user.Name
	}
	httpx.JSON(w, http.StatusCreated, NoteView{ID: note.ID, CustomerID: note.CustomerID, AuthorName: authorName, Body: note.Body, CreatedAt: note.CreatedAt})
}
