package handlers

import (
	"encoding/json"
	"time"

	"github.com/google/uuid"

	"mojacrm/backend/internal/database/db"
)

// --- Clients ---

// ClientView flattens the nullable company link (a person may represent a
// company client) into a clean optional string + the resolved company name,
// and omits internal soft-delete audit columns.
type ClientView struct {
	ID                uuid.UUID `json:"id"`
	ClientType        string    `json:"client_type"`
	DisplayName       string    `json:"display_name"`
	FirstName         string    `json:"first_name"`
	MiddleName        string    `json:"middle_name"`
	LastName          string    `json:"last_name"`
	IDType            string    `json:"id_type"`
	IDNumber          string    `json:"id_number"`
	CompanyName       string    `json:"company_name"`
	RegNumber         string    `json:"reg_number"`
	KraPin            string    `json:"kra_pin"`
	Email             string    `json:"email"`
	Phone             string    `json:"phone"`
	Address           string    `json:"address"`
	Notes             string    `json:"notes"`
	CompanyClientID   string    `json:"company_client_id,omitempty"`
	CompanyClientName string    `json:"company_client_name,omitempty"`
	Code              string    `json:"code"`
	CreatedByName     string    `json:"created_by_name"`
	CreatedAt         time.Time `json:"created_at"`
	UpdatedAt         time.Time `json:"updated_at"`
}

func clientView(c db.Client) ClientView {
	v := ClientView{
		ID: c.ID, ClientType: c.ClientType, DisplayName: c.DisplayName,
		FirstName: c.FirstName, MiddleName: c.MiddleName, LastName: c.LastName,
		IDType: c.IDType, IDNumber: c.IDNumber,
		CompanyName: c.CompanyName, RegNumber: c.RegNumber, KraPin: c.KraPin,
		Email: c.Email, Phone: c.Phone, Address: c.Address, Notes: c.Notes, Code: c.Code,
		CreatedByName: c.CreatedByName, CreatedAt: c.CreatedAt, UpdatedAt: c.UpdatedAt,
	}
	if c.CompanyClientID.Valid {
		v.CompanyClientID = uuid.UUID(c.CompanyClientID.Bytes).String()
	}
	return v
}

func getClientRowView(row db.GetClientRow) ClientView {
	v := clientView(db.Client{
		ID: row.ID, TenantID: row.TenantID, ClientType: row.ClientType, DisplayName: row.DisplayName,
		FirstName: row.FirstName, MiddleName: row.MiddleName, LastName: row.LastName,
		IDType: row.IDType, IDNumber: row.IDNumber,
		CompanyName: row.CompanyName, RegNumber: row.RegNumber, KraPin: row.KraPin,
		Email: row.Email, Phone: row.Phone, Address: row.Address, Notes: row.Notes, Code: row.Code,
		CompanyClientID: row.CompanyClientID,
		CreatedByName:   row.CreatedByName, CreatedAt: row.CreatedAt, UpdatedAt: row.UpdatedAt,
	})
	if row.CompanyClientName != nil {
		v.CompanyClientName = *row.CompanyClientName
	}
	return v
}

func listClientsRowView(row db.ListClientsRow) ClientView {
	v := clientView(db.Client{
		ID: row.ID, TenantID: row.TenantID, ClientType: row.ClientType, DisplayName: row.DisplayName,
		FirstName: row.FirstName, MiddleName: row.MiddleName, LastName: row.LastName,
		IDType: row.IDType, IDNumber: row.IDNumber,
		CompanyName: row.CompanyName, RegNumber: row.RegNumber, KraPin: row.KraPin,
		Email: row.Email, Phone: row.Phone, Address: row.Address, Notes: row.Notes, Code: row.Code,
		CompanyClientID: row.CompanyClientID,
		CreatedByName:   row.CreatedByName, CreatedAt: row.CreatedAt, UpdatedAt: row.UpdatedAt,
	})
	if row.CompanyClientName != nil {
		v.CompanyClientName = *row.CompanyClientName
	}
	return v
}

// --- Partners ---

// PartnerView omits internal soft-delete audit columns.
type PartnerView struct {
	ID                  uuid.UUID `json:"id"`
	Name                string    `json:"name"`
	LogoUrl             string    `json:"logo_url"`
	Industry            string    `json:"industry"`
	PartnershipModel    string    `json:"partnership_model"`
	Status              string    `json:"status"`
	Address             string    `json:"address"`
	Town                string    `json:"town"`
	Country             string    `json:"country"`
	ContactName         string    `json:"contact_name"`
	ContactTitle        string    `json:"contact_title"`
	WorkEmail           string    `json:"work_email"`
	PhoneMobile         string    `json:"phone_mobile"`
	PhoneOffice         string    `json:"phone_office"`
	Notes               string    `json:"notes"`
	Code                string    `json:"code"`
	Type                string    `json:"type"`
	SlaDays             int32     `json:"sla_days"`
	DefaultTemplateID   string    `json:"default_template_id,omitempty"`
	MileageRatePerKm    int64     `json:"mileage_rate_per_km"`
	CompMinCount        int32     `json:"comp_min_count"`
	CompMaxAgeMonths    int32     `json:"comp_max_age_months"`
	CompMaxRadiusKm     int32     `json:"comp_max_radius_km"`
	CompMaxVariancePct  int32     `json:"comp_max_variance_pct"`
	CompActualSalesOnly bool      `json:"comp_actual_sales_only"`
	CreatedByName       string    `json:"created_by_name"`
	CreatedAt           time.Time `json:"created_at"`
	UpdatedAt           time.Time `json:"updated_at"`
}

func partnerView(p db.Partner) PartnerView {
	v := PartnerView{
		ID: p.ID, Name: p.Name, LogoUrl: p.LogoUrl, Industry: p.Industry,
		PartnershipModel: p.PartnershipModel, Status: p.Status,
		Address: p.Address, Town: p.Town, Country: p.Country,
		ContactName: p.ContactName, ContactTitle: p.ContactTitle, WorkEmail: p.WorkEmail,
		PhoneMobile: p.PhoneMobile, PhoneOffice: p.PhoneOffice, Notes: p.Notes,
		Code: p.Code, Type: p.Type, SlaDays: p.SlaDays, MileageRatePerKm: p.MileageRatePerKm,
		CompMinCount: p.CompMinCount, CompMaxAgeMonths: p.CompMaxAgeMonths,
		CompMaxRadiusKm: p.CompMaxRadiusKm, CompMaxVariancePct: p.CompMaxVariancePct,
		CompActualSalesOnly: p.CompActualSalesOnly,
		CreatedByName:       p.CreatedByName, CreatedAt: p.CreatedAt, UpdatedAt: p.UpdatedAt,
	}
	if p.DefaultTemplateID.Valid {
		v.DefaultTemplateID = uuid.UUID(p.DefaultTemplateID.Bytes).String()
	}
	return v
}

// --- Partner branches ---

type BranchView struct {
	ID            uuid.UUID `json:"id"`
	PartnerID     uuid.UUID `json:"partner_id"`
	Name          string    `json:"name"`
	Town          string    `json:"town"`
	Phone         string    `json:"phone"`
	Email         string    `json:"email"`
	CreatedByName string    `json:"created_by_name"`
	CreatedAt     time.Time `json:"created_at"`
	UpdatedAt     time.Time `json:"updated_at"`
}

func branchView(b db.PartnerBranch) BranchView {
	return BranchView{
		ID: b.ID, PartnerID: b.PartnerID, Name: b.Name, Town: b.Town, Phone: b.Phone, Email: b.Email,
		CreatedByName: b.CreatedByName, CreatedAt: b.CreatedAt, UpdatedAt: b.UpdatedAt,
	}
}

// --- Partner contacts ---

type PartnerContactView struct {
	ID               uuid.UUID `json:"id"`
	PartnerID        uuid.UUID `json:"partner_id"`
	FirstName        string    `json:"first_name"`
	MiddleName       string    `json:"middle_name"`
	LastName         string    `json:"last_name"`
	Title            string    `json:"title"`
	Email            string    `json:"email"`
	Phone            string    `json:"phone"`
	Whatsapp         string    `json:"whatsapp"`
	PreferredChannel string    `json:"preferred_channel"`
	IsActive         bool      `json:"is_active"`
	InactiveReason   string    `json:"inactive_reason"`
	CreatedByName    string    `json:"created_by_name"`
	CreatedAt        time.Time `json:"created_at"`
}

func partnerContactFromListRow(c db.ListContactsByPartnerRow) PartnerContactView {
	return PartnerContactView{
		ID: c.ID, PartnerID: c.PartnerID, FirstName: c.FirstName, MiddleName: c.MiddleName,
		LastName: c.LastName, Title: c.Title, Email: c.Email, Phone: c.Phone, Whatsapp: c.Whatsapp,
		PreferredChannel: c.PreferredChannel, IsActive: c.IsActive, InactiveReason: c.InactiveReason,
		CreatedByName: c.CreatedByName, CreatedAt: c.CreatedAt,
	}
}

func partnerContactFromCreateRow(c db.CreatePartnerContactRow) PartnerContactView {
	return PartnerContactView{
		ID: c.ID, PartnerID: c.PartnerID, FirstName: c.FirstName, MiddleName: c.MiddleName,
		LastName: c.LastName, Title: c.Title, Email: c.Email, Phone: c.Phone, Whatsapp: c.Whatsapp,
		PreferredChannel: c.PreferredChannel, IsActive: c.IsActive, InactiveReason: c.InactiveReason,
		CreatedByName: c.CreatedByName, CreatedAt: c.CreatedAt,
	}
}

func partnerContactFromUpdateRow(c db.UpdatePartnerContactRow) PartnerContactView {
	return PartnerContactView{
		ID: c.ID, PartnerID: c.PartnerID, FirstName: c.FirstName, MiddleName: c.MiddleName,
		LastName: c.LastName, Title: c.Title, Email: c.Email, Phone: c.Phone, Whatsapp: c.Whatsapp,
		PreferredChannel: c.PreferredChannel, IsActive: c.IsActive, InactiveReason: c.InactiveReason,
		CreatedByName: c.CreatedByName, CreatedAt: c.CreatedAt,
	}
}

// --- Partner requirements ---

type PartnerRequirementView struct {
	ID        uuid.UUID `json:"id"`
	PartnerID uuid.UUID `json:"partner_id"`
	Label     string    `json:"label"`
	Detail    string    `json:"detail"`
	Kind      string    `json:"kind"`
	SortOrder int32     `json:"sort_order"`
}

func requirementView(r db.PartnerRequirement) PartnerRequirementView {
	return PartnerRequirementView{
		ID: r.ID, PartnerID: r.PartnerID, Label: r.Label, Detail: r.Detail, Kind: r.Kind, SortOrder: r.SortOrder,
	}
}

// --- Partner appendix templates ---

// AppendixField is one fillable line in a template.
type AppendixField struct {
	Label string `json:"label"`
	Type  string `json:"type"` // text | textarea | checkbox
}

type AppendixTemplateView struct {
	ID          uuid.UUID       `json:"id"`
	PartnerID   uuid.UUID       `json:"partner_id"`
	Name        string          `json:"name"`
	Description string          `json:"description"`
	Fields      []AppendixField `json:"fields"`
	SortOrder   int32           `json:"sort_order"`
}

func appendixTemplateView(t db.PartnerAppendixTemplate) AppendixTemplateView {
	var fields []AppendixField
	_ = json.Unmarshal(t.Fields, &fields)
	if fields == nil {
		fields = []AppendixField{}
	}
	return AppendixTemplateView{
		ID: t.ID, PartnerID: t.PartnerID, Name: t.Name, Description: t.Description,
		Fields: fields, SortOrder: t.SortOrder,
	}
}
