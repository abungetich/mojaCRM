package handlers

import (
	"time"

	"github.com/google/uuid"

	"mojacrm/backend/internal/database/db"
)

// --- Company documents (Document Vault) ---

// DocumentView omits nothing sensitive here (no soft-delete columns exist on
// company_documents — propsense hard-deletes them), it just flattens the
// nullable owner link into a plain optional string.
type DocumentView struct {
	ID              uuid.UUID `json:"id"`
	Name            string    `json:"name"`
	Category        string    `json:"category"`
	DocNumber       string    `json:"doc_number"`
	Issuer          string    `json:"issuer"`
	Description     string    `json:"description"`
	OwnerUserID     string    `json:"owner_user_id,omitempty"`
	OwnerName       string    `json:"owner_name"`
	FileName        string    `json:"file_name"`
	FileUrl         string    `json:"file_url"`
	IssueDate       string    `json:"issue_date,omitempty"`
	ExpiryDate      string    `json:"expiry_date,omitempty"`
	RenewalLeadDays int32     `json:"renewal_lead_days"`
	OnReport        bool      `json:"on_report"`
	ReportMode      string    `json:"report_mode"`
	VersionNo       int32     `json:"version_no"`
	Active          bool      `json:"active"`
	CreatedByName   string    `json:"created_by_name"`
	CreatedAt       time.Time `json:"created_at"`
	UpdatedAt       time.Time `json:"updated_at"`
}

func documentView(d db.CompanyDocument) DocumentView {
	v := DocumentView{
		ID: d.ID, Name: d.Name, Category: d.Category, DocNumber: d.DocNumber, Issuer: d.Issuer,
		Description: d.Description, OwnerName: d.OwnerName, FileName: d.FileName, FileUrl: d.FileUrl,
		RenewalLeadDays: d.RenewalLeadDays, OnReport: d.OnReport, ReportMode: d.ReportMode,
		VersionNo: d.VersionNo, Active: d.Active, CreatedByName: d.CreatedByName,
		CreatedAt: d.CreatedAt, UpdatedAt: d.UpdatedAt,
	}
	if d.OwnerUserID.Valid {
		v.OwnerUserID = uuid.UUID(d.OwnerUserID.Bytes).String()
	}
	if d.IssueDate.Valid {
		v.IssueDate = d.IssueDate.Time.Format("2006-01-02")
	}
	if d.ExpiryDate.Valid {
		v.ExpiryDate = d.ExpiryDate.Time.Format("2006-01-02")
	}
	return v
}

// --- Document versions (version history) ---

type DocumentVersionView struct {
	ID            uuid.UUID `json:"id"`
	DocumentID    uuid.UUID `json:"document_id"`
	VersionNo     int32     `json:"version_no"`
	FileName      string    `json:"file_name"`
	FileUrl       string    `json:"file_url"`
	IssueDate     string    `json:"issue_date,omitempty"`
	ExpiryDate    string    `json:"expiry_date,omitempty"`
	CreatedByName string    `json:"created_by_name"`
	ArchivedAt    time.Time `json:"archived_at"`
}

func documentVersionView(v db.DocumentVersion) DocumentVersionView {
	out := DocumentVersionView{
		ID: v.ID, DocumentID: v.DocumentID, VersionNo: v.VersionNo, FileName: v.FileName, FileUrl: v.FileUrl,
		CreatedByName: v.CreatedByName, ArchivedAt: v.ArchivedAt,
	}
	if v.IssueDate.Valid {
		out.IssueDate = v.IssueDate.Time.Format("2006-01-02")
	}
	if v.ExpiryDate.Valid {
		out.ExpiryDate = v.ExpiryDate.Time.Format("2006-01-02")
	}
	return out
}
