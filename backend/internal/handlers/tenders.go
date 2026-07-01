package handlers

import (
	"encoding/json"
	"net/http"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	"mojacrm/backend/internal/appctx"
	"mojacrm/backend/internal/database/db"
	"mojacrm/backend/internal/httpx"
)

// TenderHandler manages the Tenders & Pre-Qualification register, its
// documents and letter templates, ported from propsense. propsense scopes
// rows via Postgres RLS; here every query takes an explicit tenant_id,
// matching MojaCRM's application-level scoping (see ClientHandler).
type TenderHandler struct{ Deps }

func NewTenderHandler(d Deps) *TenderHandler { return &TenderHandler{d} }

// validStages is the full workflow, ported unchanged from propsense. Note
// "evaluation" is just a normal pipeline stage here, not a separate feature.
var validStages = map[string]bool{
	"watching": true, "preparing": true, "submitted": true, "evaluation": true,
	"shortlisted": true, "awarded": true, "unsuccessful": true, "withdrawn": true,
}

// postSubmitStage: outcome/evaluation stages can't be set before the tender
// has actually been submitted.
var postSubmitStage = map[string]bool{"evaluation": true, "shortlisted": true, "awarded": true, "unsuccessful": true}

type tenderBody struct {
	Title              string              `json:"title"`
	Reference          string              `json:"reference"`
	Issuer             string              `json:"issuer"`
	Type               string              `json:"type"`
	Category           string              `json:"category"`
	Description        string              `json:"description"`
	Stage              string              `json:"stage"`
	OutcomeNote        string              `json:"outcome_note"`
	SubmissionDeadline string              `json:"submission_deadline"`
	OpeningDatetime    string              `json:"opening_datetime"`
	SubmissionMethod   string              `json:"submission_method"`
	SubmissionAddress  string              `json:"submission_address"`
	SubmissionEmail    string              `json:"submission_email"`
	SubmissionContact  string              `json:"submission_contact"`
	EstimatedValue     int64               `json:"estimated_value"`
	DocFee             int64               `json:"doc_fee"`
	Currency           string              `json:"currency"`
	SecurityType       string              `json:"security_type"`
	SecurityAmount     int64               `json:"security_amount"`
	SecurityValidity   string              `json:"security_validity"`
	OwnerUserID        string              `json:"owner_user_id"`
	Signed             bool                `json:"signed"`
	Requirements       []TenderRequirement `json:"requirements"`
	ContactName        string              `json:"contact_name"`
	ContactEmail       string              `json:"contact_email"`
	Notes              string              `json:"notes"`
}

// normalize defaults blank fields and marshals the requirements checklist,
// mirroring propsense's tenderBody.clean().
func (b *tenderBody) normalize() []byte {
	if b.Currency == "" {
		b.Currency = "KES"
	}
	if b.Stage == "" {
		b.Stage = "watching"
	}
	if b.Type == "" {
		b.Type = "tender"
	}
	if b.Requirements == nil {
		b.Requirements = []TenderRequirement{}
	}
	reqs, _ := json.Marshal(b.Requirements)
	return reqs
}

type paginatedTenders struct {
	Data     []TenderListRow `json:"data"`
	Total    int64           `json:"total"`
	Page     int32           `json:"page"`
	PageSize int32           `json:"page_size"`
}

func (h *TenderHandler) List(w http.ResponseWriter, r *http.Request) {
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

	stage := q.Get("stage")
	search := strings.TrimSpace(q.Get("q"))

	rows, err := h.Store.Queries.ListTenders(r.Context(), db.ListTendersParams{
		TenantID: tenantID, Column2: stage, Column3: search,
		Limit: pageSize, Offset: (page - 1) * pageSize,
	})
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "could not list tenders")
		return
	}
	total, err := h.Store.Queries.CountTenders(r.Context(), db.CountTendersParams{
		TenantID: tenantID, Column2: stage, Column3: search,
	})
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "could not count tenders")
		return
	}

	out := make([]TenderListRow, 0, len(rows))
	for _, row := range rows {
		out = append(out, tenderListRowView(row))
	}
	httpx.JSON(w, http.StatusOK, paginatedTenders{Data: out, Total: total, Page: page, PageSize: pageSize})
}

func (h *TenderHandler) Get(w http.ResponseWriter, r *http.Request) {
	tenantID, _ := appctx.TenantID(r.Context())
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "invalid tender id")
		return
	}
	row, err := h.Store.Queries.GetTender(r.Context(), db.GetTenderParams{ID: id, TenantID: tenantID})
	if err != nil {
		httpx.Error(w, http.StatusNotFound, "tender not found")
		return
	}
	httpx.JSON(w, http.StatusOK, getTenderRowView(row))
}

func (h *TenderHandler) Create(w http.ResponseWriter, r *http.Request) {
	tenantID, _ := appctx.TenantID(r.Context())
	var body tenderBody
	if err := httpx.Decode(r, &body); err != nil || strings.TrimSpace(body.Title) == "" {
		httpx.Error(w, http.StatusBadRequest, "a title is required")
		return
	}
	owner, ok := parseOptionalUUID(body.OwnerUserID)
	if !ok {
		httpx.Error(w, http.StatusBadRequest, "invalid owner_user_id")
		return
	}
	reqs := body.normalize()
	t, err := h.Store.Queries.CreateTender(r.Context(), db.CreateTenderParams{
		TenantID: tenantID, Title: body.Title, Reference: body.Reference, Issuer: body.Issuer, Type: body.Type,
		Category: body.Category, Description: body.Description, Stage: body.Stage, OutcomeNote: body.OutcomeNote,
		SubmissionDeadline: body.SubmissionDeadline, OpeningDatetime: body.OpeningDatetime,
		SubmissionMethod: body.SubmissionMethod, SubmissionAddress: body.SubmissionAddress,
		SubmissionEmail: body.SubmissionEmail, SubmissionContact: body.SubmissionContact,
		EstimatedValue: body.EstimatedValue, DocFee: body.DocFee, Currency: body.Currency,
		SecurityType: body.SecurityType, SecurityAmount: body.SecurityAmount, SecurityValidity: body.SecurityValidity,
		OwnerUserID: owner, Signed: body.Signed, Requirements: reqs,
		ContactName: body.ContactName, ContactEmail: body.ContactEmail, Notes: body.Notes,
		CreatedByName: actorName(r.Context(), h.Store),
	})
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "could not create tender")
		return
	}
	httpx.JSON(w, http.StatusCreated, tenderView(t))
}

func (h *TenderHandler) Update(w http.ResponseWriter, r *http.Request) {
	tenantID, _ := appctx.TenantID(r.Context())
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "invalid tender id")
		return
	}
	var body tenderBody
	if err := httpx.Decode(r, &body); err != nil || strings.TrimSpace(body.Title) == "" {
		httpx.Error(w, http.StatusBadRequest, "a title is required")
		return
	}
	owner, ok := parseOptionalUUID(body.OwnerUserID)
	if !ok {
		httpx.Error(w, http.StatusBadRequest, "invalid owner_user_id")
		return
	}
	reqs := body.normalize()
	t, err := h.Store.Queries.UpdateTender(r.Context(), db.UpdateTenderParams{
		ID: id, TenantID: tenantID, Title: body.Title, Reference: body.Reference, Issuer: body.Issuer, Type: body.Type,
		Category: body.Category, Description: body.Description, Stage: body.Stage, OutcomeNote: body.OutcomeNote,
		SubmissionDeadline: body.SubmissionDeadline, OpeningDatetime: body.OpeningDatetime,
		SubmissionMethod: body.SubmissionMethod, SubmissionAddress: body.SubmissionAddress,
		SubmissionEmail: body.SubmissionEmail, SubmissionContact: body.SubmissionContact,
		EstimatedValue: body.EstimatedValue, DocFee: body.DocFee, Currency: body.Currency,
		SecurityType: body.SecurityType, SecurityAmount: body.SecurityAmount, SecurityValidity: body.SecurityValidity,
		OwnerUserID: owner, Signed: body.Signed, Requirements: reqs,
		ContactName: body.ContactName, ContactEmail: body.ContactEmail, Notes: body.Notes,
	})
	if err != nil {
		httpx.Error(w, http.StatusNotFound, "tender not found")
		return
	}
	httpx.JSON(w, http.StatusOK, tenderView(t))
}

func (h *TenderHandler) Delete(w http.ResponseWriter, r *http.Request) {
	tenantID, _ := appctx.TenantID(r.Context())
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "invalid tender id")
		return
	}
	if err := h.Store.Queries.DeleteTender(r.Context(), db.DeleteTenderParams{
		ID: id, TenantID: tenantID, DeletedByName: actorName(r.Context(), h.Store), DeleteReason: deleteReason(r),
	}); err != nil {
		httpx.Error(w, http.StatusInternalServerError, "could not delete tender")
		return
	}
	httpx.JSON(w, http.StatusOK, map[string]bool{"ok": true})
}

// SetStage changes the workflow stage and appends to the stage history.
// Guards against recording an outcome/evaluation stage before the tender
// has been submitted, exactly as propsense does. (propsense also notifies
// the assigned lead here; MojaCRM has no notifications module yet, so that
// side effect is intentionally not ported — see migration 0008 comments.)
func (h *TenderHandler) SetStage(w http.ResponseWriter, r *http.Request) {
	tenantID, _ := appctx.TenantID(r.Context())
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "invalid tender id")
		return
	}
	var b struct {
		Stage       string `json:"stage"`
		Note        string `json:"note"`
		OutcomeNote string `json:"outcome_note"`
	}
	if err := httpx.Decode(r, &b); err != nil {
		httpx.Error(w, http.StatusBadRequest, "invalid request")
		return
	}
	if !validStages[b.Stage] {
		httpx.Error(w, http.StatusBadRequest, "invalid stage")
		return
	}
	cur, err := h.Store.Queries.GetTender(r.Context(), db.GetTenderParams{ID: id, TenantID: tenantID})
	if err != nil {
		httpx.Error(w, http.StatusNotFound, "tender not found")
		return
	}
	if postSubmitStage[b.Stage] && (cur.Stage == "watching" || cur.Stage == "preparing") {
		httpx.Error(w, http.StatusBadRequest, "submit the tender before recording an evaluation or outcome")
		return
	}
	log := decodeStageLog(cur.StageLog)
	log = append(log, TenderStageEvent{
		At: time.Now().Format(time.RFC3339), By: actorName(r.Context(), h.Store),
		From: cur.Stage, To: b.Stage, Note: strings.TrimSpace(b.Note),
	})
	logJSON, _ := json.Marshal(log)
	outcome := cur.OutcomeNote
	if b.OutcomeNote != "" {
		outcome = strings.TrimSpace(b.OutcomeNote)
	}
	if err := h.Store.Queries.SetTenderStage(r.Context(), db.SetTenderStageParams{
		ID: id, TenantID: tenantID, Stage: b.Stage, StageLog: logJSON, OutcomeNote: outcome,
	}); err != nil {
		httpx.Error(w, http.StatusInternalServerError, "could not update stage")
		return
	}
	httpx.JSON(w, http.StatusOK, map[string]bool{"ok": true})
}

// Assign sets the tender's lead. (propsense also notifies the new/previous
// lead here; not ported — see SetStage comment above.)
func (h *TenderHandler) Assign(w http.ResponseWriter, r *http.Request) {
	tenantID, _ := appctx.TenantID(r.Context())
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "invalid tender id")
		return
	}
	var b struct {
		OwnerUserID string `json:"owner_user_id"`
	}
	if err := httpx.Decode(r, &b); err != nil {
		httpx.Error(w, http.StatusBadRequest, "invalid request")
		return
	}
	owner, ok := parseOptionalUUID(b.OwnerUserID)
	if !ok {
		httpx.Error(w, http.StatusBadRequest, "invalid owner_user_id")
		return
	}
	if err := h.Store.Queries.AssignTender(r.Context(), db.AssignTenderParams{ID: id, TenantID: tenantID, OwnerUserID: owner}); err != nil {
		httpx.Error(w, http.StatusInternalServerError, "could not assign tender")
		return
	}
	httpx.JSON(w, http.StatusOK, map[string]bool{"ok": true})
}

// Submit records a submission (method/reference/note), appends to the
// submission log and moves the tender to the submitted stage.
func (h *TenderHandler) Submit(w http.ResponseWriter, r *http.Request) {
	tenantID, _ := appctx.TenantID(r.Context())
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "invalid tender id")
		return
	}
	var b struct {
		SubmittedOn string `json:"submitted_on"`
		Method      string `json:"method"`
		Reference   string `json:"reference"`
		Note        string `json:"note"`
	}
	if err := httpx.Decode(r, &b); err != nil {
		httpx.Error(w, http.StatusBadRequest, "invalid request")
		return
	}
	cur, err := h.Store.Queries.GetTender(r.Context(), db.GetTenderParams{ID: id, TenantID: tenantID})
	if err != nil {
		httpx.Error(w, http.StatusNotFound, "tender not found")
		return
	}
	log := decodeSubmissionLog(cur.SubmissionLog)
	log = append(log, TenderSubmissionEvent{
		At: time.Now().Format(time.RFC3339), By: actorName(r.Context(), h.Store),
		Method: b.Method, Reference: b.Reference, Note: strings.TrimSpace(b.Note),
	})
	logJSON, _ := json.Marshal(log)
	on := b.SubmittedOn
	if on == "" {
		on = time.Now().Format("2006-01-02")
	}
	if err := h.Store.Queries.SetTenderSubmission(r.Context(), db.SetTenderSubmissionParams{
		ID: id, TenantID: tenantID, SubmittedOn: on, SubmissionMethod: b.Method, SubmissionLog: logJSON,
	}); err != nil {
		httpx.Error(w, http.StatusInternalServerError, "could not record submission")
		return
	}
	httpx.JSON(w, http.StatusOK, map[string]bool{"ok": true})
}

// ---- Documents ----

func (h *TenderHandler) ListDocuments(w http.ResponseWriter, r *http.Request) {
	tenantID, _ := appctx.TenantID(r.Context())
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "invalid tender id")
		return
	}
	rows, err := h.Store.Queries.ListTenderDocuments(r.Context(), db.ListTenderDocumentsParams{TenderID: id, TenantID: tenantID})
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "could not list documents")
		return
	}
	out := make([]TenderDocumentView, 0, len(rows))
	for _, row := range rows {
		out = append(out, tenderDocumentView(row))
	}
	httpx.JSON(w, http.StatusOK, out)
}

func (h *TenderHandler) GetDocument(w http.ResponseWriter, r *http.Request) {
	tenantID, _ := appctx.TenantID(r.Context())
	docID, err := uuid.Parse(chi.URLParam(r, "docId"))
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "invalid document id")
		return
	}
	doc, err := h.Store.Queries.GetTenderDocument(r.Context(), db.GetTenderDocumentParams{ID: docID, TenantID: tenantID})
	if err != nil {
		httpx.Error(w, http.StatusNotFound, "document not found")
		return
	}
	httpx.JSON(w, http.StatusOK, map[string]any{"data_url": doc.DataUrl, "name": doc.Name})
}

func (h *TenderHandler) AddDocument(w http.ResponseWriter, r *http.Request) {
	tenantID, _ := appctx.TenantID(r.Context())
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "invalid tender id")
		return
	}
	var b struct {
		Name    string `json:"name"`
		Label   string `json:"label"`
		Kind    string `json:"kind"`
		DataURL string `json:"data_url"`
	}
	if err := httpx.Decode(r, &b); err != nil || b.DataURL == "" {
		httpx.Error(w, http.StatusBadRequest, "a file is required")
		return
	}
	if b.Kind == "" {
		b.Kind = "other"
	}
	docID, err := h.Store.Queries.AddTenderDocument(r.Context(), db.AddTenderDocumentParams{
		TenantID: tenantID, TenderID: id, Name: b.Name, Label: b.Label, Kind: b.Kind, DataUrl: b.DataURL,
		CreatedByName: actorName(r.Context(), h.Store),
	})
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "could not add document")
		return
	}
	httpx.JSON(w, http.StatusCreated, map[string]any{"id": docID.String()})
}

func (h *TenderHandler) DeleteDocument(w http.ResponseWriter, r *http.Request) {
	tenantID, _ := appctx.TenantID(r.Context())
	docID, err := uuid.Parse(chi.URLParam(r, "docId"))
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "invalid document id")
		return
	}
	if err := h.Store.Queries.DeleteTenderDocument(r.Context(), db.DeleteTenderDocumentParams{ID: docID, TenantID: tenantID}); err != nil {
		httpx.Error(w, http.StatusInternalServerError, "could not delete document")
		return
	}
	httpx.JSON(w, http.StatusOK, map[string]bool{"ok": true})
}

// Email would send a client-generated PDF (tender dossier or letter) as an
// email attachment, as propsense does via its mailer package. MojaCRM has
// no mailer/email-sending infrastructure at all yet (confirmed: no
// internal/mailer package, and the only asynq task handlers are logging
// stubs for signup emails). Rather than silently no-op or fake success,
// this returns a clear 501 so the frontend can show "not available" instead
// of a misleading confirmation. Wire this up once a real mailer exists.
func (h *TenderHandler) Email(w http.ResponseWriter, r *http.Request) {
	httpx.Error(w, http.StatusNotImplemented, "email sending is not available yet (no mailer configured in this build)")
}

// ---- Letter templates ----

func (h *TenderHandler) ListLetters(w http.ResponseWriter, r *http.Request) {
	tenantID, _ := appctx.TenantID(r.Context())
	rows, err := h.Store.Queries.ListTenderLetters(r.Context(), tenantID)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "could not list letters")
		return
	}
	out := make([]TenderLetterView, 0, len(rows))
	for _, row := range rows {
		out = append(out, tenderLetterView(row))
	}
	httpx.JSON(w, http.StatusOK, out)
}

type letterBody struct {
	Name            string `json:"name"`
	Kind            string `json:"kind"`
	TemplateContent string `json:"template_content"`
	IsDefault       bool   `json:"is_default"`
}

func (h *TenderHandler) CreateLetter(w http.ResponseWriter, r *http.Request) {
	tenantID, _ := appctx.TenantID(r.Context())
	var b letterBody
	if err := httpx.Decode(r, &b); err != nil || strings.TrimSpace(b.Name) == "" {
		httpx.Error(w, http.StatusBadRequest, "a name is required")
		return
	}
	if b.Kind == "" {
		b.Kind = "cover"
	}
	id, err := h.Store.Queries.CreateTenderLetter(r.Context(), db.CreateTenderLetterParams{
		TenantID: tenantID, Name: b.Name, Kind: b.Kind, TemplateContent: b.TemplateContent, IsDefault: b.IsDefault,
		CreatedByName: actorName(r.Context(), h.Store),
	})
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "could not create letter")
		return
	}
	httpx.JSON(w, http.StatusCreated, map[string]any{"id": id.String()})
}

func (h *TenderHandler) UpdateLetter(w http.ResponseWriter, r *http.Request) {
	tenantID, _ := appctx.TenantID(r.Context())
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "invalid letter id")
		return
	}
	var b letterBody
	if err := httpx.Decode(r, &b); err != nil || strings.TrimSpace(b.Name) == "" {
		httpx.Error(w, http.StatusBadRequest, "a name is required")
		return
	}
	if err := h.Store.Queries.UpdateTenderLetter(r.Context(), db.UpdateTenderLetterParams{
		ID: id, TenantID: tenantID, Name: b.Name, Kind: b.Kind, TemplateContent: b.TemplateContent, IsDefault: b.IsDefault,
	}); err != nil {
		httpx.Error(w, http.StatusInternalServerError, "could not update letter")
		return
	}
	httpx.JSON(w, http.StatusOK, map[string]bool{"ok": true})
}

func (h *TenderHandler) DeleteLetter(w http.ResponseWriter, r *http.Request) {
	tenantID, _ := appctx.TenantID(r.Context())
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "invalid letter id")
		return
	}
	if err := h.Store.Queries.DeleteTenderLetter(r.Context(), db.DeleteTenderLetterParams{ID: id, TenantID: tenantID}); err != nil {
		httpx.Error(w, http.StatusInternalServerError, "could not delete letter")
		return
	}
	httpx.JSON(w, http.StatusOK, map[string]bool{"ok": true})
}
