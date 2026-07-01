package handlers

import (
	"context"
	"encoding/json"
	"net/http"
	"strings"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"

	"mojacrm/backend/internal/appctx"
	"mojacrm/backend/internal/database"
	"mojacrm/backend/internal/database/db"
	"mojacrm/backend/internal/httpx"
)

// ClientHandler manages tenant-scoped clients (person or company), ported
// from propsense. propsense scopes rows via Postgres RLS; here every query
// takes an explicit tenant_id, matching MojaCRM's application-level scoping.
type ClientHandler struct{ Deps }

func NewClientHandler(d Deps) *ClientHandler { return &ClientHandler{d} }

// actorName resolves the acting user's display name for audit columns
// (created_by_name / deleted_by_name). MojaCRM's appctx carries only the
// user id, so the name is looked up on demand (mirrors CustomerHandler.CreateNote).
func actorName(ctx context.Context, store *database.Store) string {
	userID, ok := appctx.UserID(ctx)
	if !ok {
		return ""
	}
	u, err := store.Queries.GetUserByID(ctx, userID)
	if err != nil {
		return ""
	}
	return u.Name
}

// deleteReason reads an optional {"reason": "..."} body on a delete request.
// Tolerates an empty/absent body (unlike httpx.Decode, which is strict).
func deleteReason(r *http.Request) string {
	var body struct {
		Reason string `json:"reason"`
	}
	_ = json.NewDecoder(r.Body).Decode(&body)
	return strings.TrimSpace(body.Reason)
}

// parseOptionalUUID parses an optional UUID string, returning a zero-value
// (invalid) pgtype.UUID when the input is blank.
func parseOptionalUUID(s string) (pgtype.UUID, bool) {
	if strings.TrimSpace(s) == "" {
		return pgtype.UUID{}, true
	}
	id, err := uuid.Parse(s)
	if err != nil {
		return pgtype.UUID{}, false
	}
	return pgtype.UUID{Bytes: id, Valid: true}, true
}

type clientBody struct {
	ClientType      string `json:"client_type"`
	FirstName       string `json:"first_name"`
	MiddleName      string `json:"middle_name"`
	LastName        string `json:"last_name"`
	IDType          string `json:"id_type"`
	IDNumber        string `json:"id_number"`
	CompanyName     string `json:"company_name"`
	RegNumber       string `json:"reg_number"`
	KraPin          string `json:"kra_pin"`
	Email           string `json:"email"`
	Phone           string `json:"phone"`
	Address         string `json:"address"`
	Notes           string `json:"notes"`
	CompanyClientID string `json:"company_client_id"`
	Code            string `json:"code"`
}

// displayName derives the searchable label from the typed fields.
func (b clientBody) displayName() string {
	if b.ClientType == "company" {
		return strings.TrimSpace(b.CompanyName)
	}
	parts := []string{}
	for _, p := range []string{b.FirstName, b.MiddleName, b.LastName} {
		if s := strings.TrimSpace(p); s != "" {
			parts = append(parts, s)
		}
	}
	return strings.Join(parts, " ")
}

// normalize validates and defaults the body, returning the display name.
func (b *clientBody) normalize() (string, bool) {
	if b.ClientType != "company" {
		b.ClientType = "person"
	}
	if b.IDType != "passport" {
		b.IDType = "id"
	}
	name := b.displayName()
	return name, name != ""
}

// companyLink resolves the optional company_client_id (only meaningful for persons).
func (b clientBody) companyLink() (pgtype.UUID, bool) {
	if b.ClientType == "company" {
		return pgtype.UUID{}, true
	}
	return parseOptionalUUID(b.CompanyClientID)
}

type paginatedClients struct {
	Data     []ClientView `json:"data"`
	Total    int64        `json:"total"`
	Page     int32        `json:"page"`
	PageSize int32        `json:"page_size"`
}

func (h *ClientHandler) List(w http.ResponseWriter, r *http.Request) {
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

	clientType := q.Get("client_type")
	search := strings.TrimSpace(q.Get("q"))

	rows, err := h.Store.Queries.ListClients(r.Context(), db.ListClientsParams{
		TenantID: tenantID,
		Column2:  clientType,
		Column3:  search,
		Limit:    pageSize,
		Offset:   (page - 1) * pageSize,
	})
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "could not list clients")
		return
	}
	total, err := h.Store.Queries.CountClients(r.Context(), db.CountClientsParams{
		TenantID: tenantID,
		Column2:  clientType,
		Column3:  search,
	})
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "could not count clients")
		return
	}

	out := make([]ClientView, 0, len(rows))
	for _, row := range rows {
		out = append(out, listClientsRowView(row))
	}
	httpx.JSON(w, http.StatusOK, paginatedClients{Data: out, Total: total, Page: page, PageSize: pageSize})
}

func (h *ClientHandler) Get(w http.ResponseWriter, r *http.Request) {
	tenantID, _ := appctx.TenantID(r.Context())
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "invalid client id")
		return
	}
	row, err := h.Store.Queries.GetClient(r.Context(), db.GetClientParams{ID: id, TenantID: tenantID})
	if err != nil {
		httpx.Error(w, http.StatusNotFound, "client not found")
		return
	}
	httpx.JSON(w, http.StatusOK, getClientRowView(row))
}

func (h *ClientHandler) Create(w http.ResponseWriter, r *http.Request) {
	tenantID, _ := appctx.TenantID(r.Context())
	var body clientBody
	if err := httpx.Decode(r, &body); err != nil {
		httpx.Error(w, http.StatusBadRequest, "invalid request")
		return
	}
	name, valid := body.normalize()
	if !valid {
		httpx.Error(w, http.StatusBadRequest, "a name is required")
		return
	}
	company, ok := body.companyLink()
	if !ok {
		httpx.Error(w, http.StatusBadRequest, "invalid company link")
		return
	}
	c, err := h.Store.Queries.CreateClient(r.Context(), db.CreateClientParams{
		TenantID:        tenantID,
		ClientType:      body.ClientType,
		DisplayName:     name,
		FirstName:       body.FirstName,
		MiddleName:      body.MiddleName,
		LastName:        body.LastName,
		IDType:          body.IDType,
		IDNumber:        body.IDNumber,
		CompanyName:     body.CompanyName,
		RegNumber:       body.RegNumber,
		KraPin:          body.KraPin,
		Email:           body.Email,
		Phone:           body.Phone,
		Address:         body.Address,
		Notes:           body.Notes,
		CompanyClientID: company,
		Code:            body.Code,
		CreatedByName:   actorName(r.Context(), h.Store),
	})
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "could not create client")
		return
	}
	httpx.JSON(w, http.StatusCreated, clientView(c))
}

func (h *ClientHandler) Update(w http.ResponseWriter, r *http.Request) {
	tenantID, _ := appctx.TenantID(r.Context())
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "invalid client id")
		return
	}
	var body clientBody
	if err := httpx.Decode(r, &body); err != nil {
		httpx.Error(w, http.StatusBadRequest, "invalid request")
		return
	}
	name, valid := body.normalize()
	if !valid {
		httpx.Error(w, http.StatusBadRequest, "a name is required")
		return
	}
	company, ok := body.companyLink()
	if !ok {
		httpx.Error(w, http.StatusBadRequest, "invalid company link")
		return
	}
	c, err := h.Store.Queries.UpdateClient(r.Context(), db.UpdateClientParams{
		ID:              id,
		TenantID:        tenantID,
		ClientType:      body.ClientType,
		DisplayName:     name,
		FirstName:       body.FirstName,
		MiddleName:      body.MiddleName,
		LastName:        body.LastName,
		IDType:          body.IDType,
		IDNumber:        body.IDNumber,
		CompanyName:     body.CompanyName,
		RegNumber:       body.RegNumber,
		KraPin:          body.KraPin,
		Email:           body.Email,
		Phone:           body.Phone,
		Address:         body.Address,
		Notes:           body.Notes,
		CompanyClientID: company,
		Code:            body.Code,
	})
	if err != nil {
		httpx.Error(w, http.StatusNotFound, "client not found")
		return
	}
	httpx.JSON(w, http.StatusOK, clientView(c))
}

func (h *ClientHandler) Delete(w http.ResponseWriter, r *http.Request) {
	tenantID, _ := appctx.TenantID(r.Context())
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "invalid client id")
		return
	}
	if err := h.Store.Queries.DeleteClient(r.Context(), db.DeleteClientParams{
		ID: id, TenantID: tenantID, DeletedByName: actorName(r.Context(), h.Store), DeleteReason: deleteReason(r),
	}); err != nil {
		httpx.Error(w, http.StatusInternalServerError, "could not delete client")
		return
	}
	httpx.JSON(w, http.StatusOK, map[string]bool{"ok": true})
}
