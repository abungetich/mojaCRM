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

// DocumentHandler manages the Document Vault (company-wide/staff documents +
// version history), ported from propsense. propsense stores an uploaded file
// as a base64 data URL; MojaCRM has no file upload infrastructure yet, so
// file_url is a plain text field here (matching how Partner.logo_url was
// ported in Phase 1) instead of stored binary.
type DocumentHandler struct{ Deps }

func NewDocumentHandler(d Deps) *DocumentHandler { return &DocumentHandler{d} }

type documentBody struct {
	Name            string `json:"name"`
	Category        string `json:"category"`
	DocNumber       string `json:"doc_number"`
	Issuer          string `json:"issuer"`
	Description     string `json:"description"`
	OwnerUserID     string `json:"owner_user_id"`
	OwnerName       string `json:"owner_name"`
	FileName        string `json:"file_name"`
	FileUrl         string `json:"file_url"`
	IssueDate       string `json:"issue_date"`
	ExpiryDate      string `json:"expiry_date"`
	RenewalLeadDays int32  `json:"renewal_lead_days"`
	OnReport        bool   `json:"on_report"`
	ReportMode      string `json:"report_mode"`
	Active          bool   `json:"active"`
}

// normalize trims/defaults the body and reports whether a name is present.
func (b *documentBody) normalize() bool {
	b.Name = strings.TrimSpace(b.Name)
	if b.ReportMode != "author" {
		b.ReportMode = "always"
	}
	if b.RenewalLeadDays <= 0 {
		b.RenewalLeadDays = 30
	}
	return b.Name != ""
}

type documentVersionBody struct {
	FileName   string `json:"file_name"`
	FileUrl    string `json:"file_url"`
	IssueDate  string `json:"issue_date"`
	ExpiryDate string `json:"expiry_date"`
}

type paginatedDocuments struct {
	Data     []DocumentView `json:"data"`
	Total    int64          `json:"total"`
	Page     int32          `json:"page"`
	PageSize int32          `json:"page_size"`
}

func (h *DocumentHandler) List(w http.ResponseWriter, r *http.Request) {
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

	category := q.Get("category")
	search := strings.TrimSpace(q.Get("q"))

	rows, err := h.Store.Queries.ListDocuments(r.Context(), db.ListDocumentsParams{
		TenantID: tenantID,
		Column2:  category,
		Column3:  search,
		Limit:    pageSize,
		Offset:   (page - 1) * pageSize,
	})
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "could not list documents")
		return
	}
	total, err := h.Store.Queries.CountDocuments(r.Context(), db.CountDocumentsParams{
		TenantID: tenantID,
		Column2:  category,
		Column3:  search,
	})
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "could not count documents")
		return
	}

	out := make([]DocumentView, 0, len(rows))
	for _, d := range rows {
		out = append(out, documentView(d))
	}
	httpx.JSON(w, http.StatusOK, paginatedDocuments{Data: out, Total: total, Page: page, PageSize: pageSize})
}

func (h *DocumentHandler) Get(w http.ResponseWriter, r *http.Request) {
	tenantID, _ := appctx.TenantID(r.Context())
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "invalid document id")
		return
	}
	d, err := h.Store.Queries.GetDocument(r.Context(), db.GetDocumentParams{ID: id, TenantID: tenantID})
	if err != nil {
		httpx.Error(w, http.StatusNotFound, "document not found")
		return
	}
	httpx.JSON(w, http.StatusOK, documentView(d))
}

func (h *DocumentHandler) Create(w http.ResponseWriter, r *http.Request) {
	tenantID, _ := appctx.TenantID(r.Context())
	var body documentBody
	if err := httpx.Decode(r, &body); err != nil {
		httpx.Error(w, http.StatusBadRequest, "invalid request")
		return
	}
	if !body.normalize() {
		httpx.Error(w, http.StatusBadRequest, "a document name is required")
		return
	}
	owner, ok := parseOptionalUUID(body.OwnerUserID)
	if !ok {
		httpx.Error(w, http.StatusBadRequest, "invalid owner_user_id")
		return
	}
	issueDate, err := parseDate(&body.IssueDate)
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "invalid issue_date")
		return
	}
	expiryDate, err := parseDate(&body.ExpiryDate)
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "invalid expiry_date")
		return
	}
	d, err := h.Store.Queries.CreateDocument(r.Context(), db.CreateDocumentParams{
		TenantID: tenantID, Name: body.Name, Category: body.Category,
		DocNumber: body.DocNumber, Issuer: body.Issuer, Description: body.Description,
		OwnerUserID: owner, OwnerName: body.OwnerName,
		FileName: body.FileName, FileUrl: body.FileUrl,
		IssueDate: issueDate, ExpiryDate: expiryDate, RenewalLeadDays: body.RenewalLeadDays,
		OnReport: body.OnReport, ReportMode: body.ReportMode, CreatedByName: actorName(r.Context(), h.Store),
	})
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "could not create document")
		return
	}
	httpx.JSON(w, http.StatusCreated, documentView(d))
}

func (h *DocumentHandler) Update(w http.ResponseWriter, r *http.Request) {
	tenantID, _ := appctx.TenantID(r.Context())
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "invalid document id")
		return
	}
	var body documentBody
	if err := httpx.Decode(r, &body); err != nil {
		httpx.Error(w, http.StatusBadRequest, "invalid request")
		return
	}
	if !body.normalize() {
		httpx.Error(w, http.StatusBadRequest, "a document name is required")
		return
	}
	owner, ok := parseOptionalUUID(body.OwnerUserID)
	if !ok {
		httpx.Error(w, http.StatusBadRequest, "invalid owner_user_id")
		return
	}
	issueDate, err := parseDate(&body.IssueDate)
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "invalid issue_date")
		return
	}
	expiryDate, err := parseDate(&body.ExpiryDate)
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "invalid expiry_date")
		return
	}
	d, err := h.Store.Queries.UpdateDocument(r.Context(), db.UpdateDocumentParams{
		ID: id, TenantID: tenantID, Name: body.Name, Category: body.Category,
		DocNumber: body.DocNumber, Issuer: body.Issuer, Description: body.Description,
		OwnerUserID: owner, OwnerName: body.OwnerName,
		IssueDate: issueDate, ExpiryDate: expiryDate, RenewalLeadDays: body.RenewalLeadDays,
		OnReport: body.OnReport, ReportMode: body.ReportMode, Active: body.Active,
	})
	if err != nil {
		httpx.Error(w, http.StatusNotFound, "document not found")
		return
	}
	httpx.JSON(w, http.StatusOK, documentView(d))
}

func (h *DocumentHandler) Delete(w http.ResponseWriter, r *http.Request) {
	tenantID, _ := appctx.TenantID(r.Context())
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "invalid document id")
		return
	}
	// Hard delete, matching propsense (company_documents has no soft-delete columns).
	if err := h.Store.Queries.DeleteDocument(r.Context(), db.DeleteDocumentParams{ID: id, TenantID: tenantID}); err != nil {
		httpx.Error(w, http.StatusInternalServerError, "could not delete document")
		return
	}
	httpx.JSON(w, http.StatusOK, map[string]bool{"ok": true})
}

// AddVersion archives the current file and replaces it with a new version
// (e.g. a renewed certificate). Bumps the version number.
func (h *DocumentHandler) AddVersion(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	tenantID, _ := appctx.TenantID(ctx)
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "invalid document id")
		return
	}
	var body documentVersionBody
	if err := httpx.Decode(r, &body); err != nil || strings.TrimSpace(body.FileUrl) == "" {
		httpx.Error(w, http.StatusBadRequest, "a file URL is required for a new version")
		return
	}
	issueDate, err := parseDate(&body.IssueDate)
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "invalid issue_date")
		return
	}
	expiryDate, err := parseDate(&body.ExpiryDate)
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "invalid expiry_date")
		return
	}
	if _, gerr := h.Store.Queries.GetDocument(ctx, db.GetDocumentParams{ID: id, TenantID: tenantID}); gerr != nil {
		httpx.Error(w, http.StatusNotFound, "document not found")
		return
	}
	if err := h.Store.Queries.ArchiveCurrentVersion(ctx, db.ArchiveCurrentVersionParams{ID: id, TenantID: tenantID}); err != nil {
		httpx.Error(w, http.StatusInternalServerError, "could not archive current version")
		return
	}
	d, err := h.Store.Queries.SetNewVersion(ctx, db.SetNewVersionParams{
		ID: id, TenantID: tenantID, FileName: body.FileName, FileUrl: body.FileUrl,
		IssueDate: issueDate, ExpiryDate: expiryDate, CreatedByName: actorName(ctx, h.Store),
	})
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "could not save new version")
		return
	}
	httpx.JSON(w, http.StatusOK, documentView(d))
}

// ListVersions returns a document's superseded versions (history).
func (h *DocumentHandler) ListVersions(w http.ResponseWriter, r *http.Request) {
	tenantID, _ := appctx.TenantID(r.Context())
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "invalid document id")
		return
	}
	rows, err := h.Store.Queries.ListDocumentVersions(r.Context(), db.ListDocumentVersionsParams{DocumentID: id, TenantID: tenantID})
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "could not list versions")
		return
	}
	out := make([]DocumentVersionView, 0, len(rows))
	for _, v := range rows {
		out = append(out, documentVersionView(v))
	}
	httpx.JSON(w, http.StatusOK, out)
}
