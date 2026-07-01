package handlers

import (
	"encoding/json"
	"time"

	"github.com/google/uuid"

	"mojacrm/backend/internal/database/db"
)

// --- Tenders ---

// TenderRequirement is one line of a tender's requirements checklist,
// stored as a JSONB array on the tender row.
type TenderRequirement struct {
	Item    string `json:"item"`
	Section string `json:"section"`
	Met     bool   `json:"met"`
}

// TenderStageEvent is one entry in a tender's stage history, appended on
// every SetStage call.
type TenderStageEvent struct {
	At   string `json:"at"`
	By   string `json:"by"`
	From string `json:"from"`
	To   string `json:"to"`
	Note string `json:"note"`
}

// TenderSubmissionEvent is one entry in a tender's submission log, appended
// on every Submit call.
type TenderSubmissionEvent struct {
	At        string `json:"at"`
	By        string `json:"by"`
	Method    string `json:"method"`
	Reference string `json:"reference"`
	Note      string `json:"note"`
}

func decodeRequirements(b []byte) []TenderRequirement {
	out := []TenderRequirement{}
	if len(b) > 0 {
		_ = json.Unmarshal(b, &out)
	}
	if out == nil {
		out = []TenderRequirement{}
	}
	return out
}

func decodeStageLog(b []byte) []TenderStageEvent {
	out := []TenderStageEvent{}
	if len(b) > 0 {
		_ = json.Unmarshal(b, &out)
	}
	if out == nil {
		out = []TenderStageEvent{}
	}
	return out
}

func decodeSubmissionLog(b []byte) []TenderSubmissionEvent {
	out := []TenderSubmissionEvent{}
	if len(b) > 0 {
		_ = json.Unmarshal(b, &out)
	}
	if out == nil {
		out = []TenderSubmissionEvent{}
	}
	return out
}

// TenderListRow is the compact shape returned by the paginated list endpoint.
type TenderListRow struct {
	ID                 uuid.UUID `json:"id"`
	Title              string    `json:"title"`
	Reference          string    `json:"reference"`
	Issuer             string    `json:"issuer"`
	Type               string    `json:"type"`
	Category           string    `json:"category"`
	Stage              string    `json:"stage"`
	SubmissionDeadline string    `json:"submission_deadline"`
	OpeningDatetime    string    `json:"opening_datetime"`
	EstimatedValue     int64     `json:"estimated_value"`
	DocFee             int64     `json:"doc_fee"`
	Currency           string    `json:"currency"`
	SecurityType       string    `json:"security_type"`
	SecurityAmount     int64     `json:"security_amount"`
	Signed             bool      `json:"signed"`
	SubmittedOn        string    `json:"submitted_on"`
	OutcomeNote        string    `json:"outcome_note"`
	OwnerUserID        string    `json:"owner_user_id,omitempty"`
	OwnerName          string    `json:"owner_name"`
	DocCount           int64     `json:"doc_count"`
	CreatedAt          time.Time `json:"created_at"`
	CreatedByName      string    `json:"created_by_name"`
}

func tenderListRowView(r db.ListTendersRow) TenderListRow {
	v := TenderListRow{
		ID: r.ID, Title: r.Title, Reference: r.Reference, Issuer: r.Issuer, Type: r.Type, Category: r.Category,
		Stage: r.Stage, SubmissionDeadline: r.SubmissionDeadline, OpeningDatetime: r.OpeningDatetime,
		EstimatedValue: r.EstimatedValue, DocFee: r.DocFee, Currency: r.Currency,
		SecurityType: r.SecurityType, SecurityAmount: r.SecurityAmount, Signed: r.Signed,
		SubmittedOn: r.SubmittedOn, OutcomeNote: r.OutcomeNote, OwnerName: r.OwnerName, DocCount: r.DocCount,
		CreatedAt: r.CreatedAt, CreatedByName: r.CreatedByName,
	}
	if r.OwnerUserID.Valid {
		v.OwnerUserID = uuid.UUID(r.OwnerUserID.Bytes).String()
	}
	return v
}

// TenderView is the full detail shape (Get / Create / Update responses).
type TenderView struct {
	ID                 uuid.UUID               `json:"id"`
	Title              string                  `json:"title"`
	Reference          string                  `json:"reference"`
	Issuer             string                  `json:"issuer"`
	Type               string                  `json:"type"`
	Category           string                  `json:"category"`
	Description        string                  `json:"description"`
	Stage              string                  `json:"stage"`
	OutcomeNote        string                  `json:"outcome_note"`
	SubmissionDeadline string                  `json:"submission_deadline"`
	OpeningDatetime    string                  `json:"opening_datetime"`
	SubmittedOn        string                  `json:"submitted_on"`
	SubmissionMethod   string                  `json:"submission_method"`
	SubmissionAddress  string                  `json:"submission_address"`
	SubmissionEmail    string                  `json:"submission_email"`
	SubmissionContact  string                  `json:"submission_contact"`
	EstimatedValue     int64                   `json:"estimated_value"`
	DocFee             int64                   `json:"doc_fee"`
	Currency           string                  `json:"currency"`
	SecurityType       string                  `json:"security_type"`
	SecurityAmount     int64                   `json:"security_amount"`
	SecurityValidity   string                  `json:"security_validity"`
	OwnerUserID        string                  `json:"owner_user_id,omitempty"`
	OwnerName          string                  `json:"owner_name"`
	Signed             bool                    `json:"signed"`
	Requirements       []TenderRequirement     `json:"requirements"`
	StageLog           []TenderStageEvent      `json:"stage_log"`
	SubmissionLog      []TenderSubmissionEvent `json:"submission_log"`
	ContactName        string                  `json:"contact_name"`
	ContactEmail       string                  `json:"contact_email"`
	Notes              string                  `json:"notes"`
	CreatedAt          time.Time               `json:"created_at"`
	CreatedByName      string                  `json:"created_by_name"`
}

func getTenderRowView(t db.GetTenderRow) TenderView {
	v := TenderView{
		ID: t.ID, Title: t.Title, Reference: t.Reference, Issuer: t.Issuer, Type: t.Type, Category: t.Category,
		Description: t.Description, Stage: t.Stage, OutcomeNote: t.OutcomeNote,
		SubmissionDeadline: t.SubmissionDeadline, OpeningDatetime: t.OpeningDatetime, SubmittedOn: t.SubmittedOn,
		SubmissionMethod: t.SubmissionMethod, SubmissionAddress: t.SubmissionAddress, SubmissionEmail: t.SubmissionEmail,
		SubmissionContact: t.SubmissionContact, EstimatedValue: t.EstimatedValue, DocFee: t.DocFee, Currency: t.Currency,
		SecurityType: t.SecurityType, SecurityAmount: t.SecurityAmount, SecurityValidity: t.SecurityValidity,
		OwnerName: t.OwnerName, Signed: t.Signed,
		Requirements: decodeRequirements(t.Requirements), StageLog: decodeStageLog(t.StageLog), SubmissionLog: decodeSubmissionLog(t.SubmissionLog),
		ContactName: t.ContactName, ContactEmail: t.ContactEmail, Notes: t.Notes,
		CreatedAt: t.CreatedAt, CreatedByName: t.CreatedByName,
	}
	if t.OwnerUserID.Valid {
		v.OwnerUserID = uuid.UUID(t.OwnerUserID.Bytes).String()
	}
	return v
}

func tenderView(t db.Tender) TenderView {
	v := TenderView{
		ID: t.ID, Title: t.Title, Reference: t.Reference, Issuer: t.Issuer, Type: t.Type, Category: t.Category,
		Description: t.Description, Stage: t.Stage, OutcomeNote: t.OutcomeNote,
		SubmissionDeadline: t.SubmissionDeadline, OpeningDatetime: t.OpeningDatetime, SubmittedOn: t.SubmittedOn,
		SubmissionMethod: t.SubmissionMethod, SubmissionAddress: t.SubmissionAddress, SubmissionEmail: t.SubmissionEmail,
		SubmissionContact: t.SubmissionContact, EstimatedValue: t.EstimatedValue, DocFee: t.DocFee, Currency: t.Currency,
		SecurityType: t.SecurityType, SecurityAmount: t.SecurityAmount, SecurityValidity: t.SecurityValidity,
		Signed:       t.Signed,
		Requirements: decodeRequirements(t.Requirements), StageLog: decodeStageLog(t.StageLog), SubmissionLog: decodeSubmissionLog(t.SubmissionLog),
		ContactName: t.ContactName, ContactEmail: t.ContactEmail, Notes: t.Notes,
		CreatedAt: t.CreatedAt, CreatedByName: t.CreatedByName,
	}
	if t.OwnerUserID.Valid {
		v.OwnerUserID = uuid.UUID(t.OwnerUserID.Bytes).String()
	}
	return v
}

// --- Tender documents ---

type TenderDocumentView struct {
	ID            uuid.UUID `json:"id"`
	Name          string    `json:"name"`
	Label         string    `json:"label"`
	Kind          string    `json:"kind"`
	CreatedAt     time.Time `json:"created_at"`
	CreatedByName string    `json:"created_by_name"`
}

func tenderDocumentView(d db.ListTenderDocumentsRow) TenderDocumentView {
	return TenderDocumentView{
		ID: d.ID, Name: d.Name, Label: d.Label, Kind: d.Kind, CreatedAt: d.CreatedAt, CreatedByName: d.CreatedByName,
	}
}

// --- Tender letters ---

type TenderLetterView struct {
	ID              uuid.UUID `json:"id"`
	Name            string    `json:"name"`
	Kind            string    `json:"kind"`
	TemplateContent string    `json:"template_content"`
	IsDefault       bool      `json:"is_default"`
	CreatedAt       time.Time `json:"created_at"`
	CreatedByName   string    `json:"created_by_name"`
}

func tenderLetterView(l db.ListTenderLettersRow) TenderLetterView {
	return TenderLetterView{
		ID: l.ID, Name: l.Name, Kind: l.Kind, TemplateContent: l.TemplateContent, IsDefault: l.IsDefault,
		CreatedAt: l.CreatedAt, CreatedByName: l.CreatedByName,
	}
}
