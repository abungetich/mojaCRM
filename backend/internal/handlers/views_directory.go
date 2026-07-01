package handlers

import (
	"time"

	"github.com/google/uuid"

	"mojacrm/backend/internal/database/db"
)

type CustomerView struct {
	ID                 uuid.UUID `json:"id"`
	CustomerType       string    `json:"customer_type"`
	Status             string    `json:"status"`
	Segment            string    `json:"segment"`
	Source             string    `json:"source"`
	AccountOwnerID     string    `json:"account_owner_id,omitempty"`
	AccountOwnerName   string    `json:"account_owner_name,omitempty"`
	ArchiveReason      string    `json:"archive_reason,omitempty"`
	ArchivedAt         string    `json:"archived_at,omitempty"`
	OrganizationName   string    `json:"organization_name"`
	LegalName          string    `json:"legal_name"`
	TradingName        string    `json:"trading_name"`
	RegistrationNumber string    `json:"registration_number"`
	TaxPin             string    `json:"tax_pin"`
	Industry           string    `json:"industry"`
	OrganizationSize   string    `json:"organization_size"`
	FirstName          string    `json:"first_name"`
	MiddleName         string    `json:"middle_name"`
	LastName           string    `json:"last_name"`
	DisplayName        string    `json:"display_name"`
	IDNumber           string    `json:"id_number"`
	DateOfBirth        string    `json:"date_of_birth,omitempty"`
	Gender             string    `json:"gender"`
	Occupation         string    `json:"occupation"`
	Website            string    `json:"website"`
	Description        string    `json:"description"`
	PrimaryEmail       string    `json:"primary_email"`
	PrimaryPhone       string    `json:"primary_phone"`
	AlternativePhone   string    `json:"alternative_phone"`
	Address            string    `json:"address"`
	Country            string    `json:"country"`
	State              string    `json:"state"`
	City               string    `json:"city"`
	CreatedAt          time.Time `json:"created_at"`
	UpdatedAt          time.Time `json:"updated_at"`
}

func customerView(c db.Customer) CustomerView {
	v := CustomerView{
		ID:                 c.ID,
		CustomerType:       c.CustomerType,
		Status:             c.Status,
		Segment:            c.Segment,
		Source:             c.Source,
		OrganizationName:   c.OrganizationName,
		LegalName:          c.LegalName,
		TradingName:        c.TradingName,
		RegistrationNumber: c.RegistrationNumber,
		TaxPin:             c.TaxPin,
		Industry:           c.Industry,
		OrganizationSize:   c.OrganizationSize,
		FirstName:          c.FirstName,
		MiddleName:         c.MiddleName,
		LastName:           c.LastName,
		DisplayName:        c.DisplayName,
		IDNumber:           c.IDNumber,
		Gender:             c.Gender,
		Occupation:         c.Occupation,
		Website:            c.Website,
		Description:        c.Description,
		PrimaryEmail:       c.PrimaryEmail,
		PrimaryPhone:       c.PrimaryPhone,
		AlternativePhone:   c.AlternativePhone,
		Address:            c.Address,
		Country:            c.Country,
		State:              c.State,
		City:               c.City,
		CreatedAt:          c.CreatedAt,
		UpdatedAt:          c.UpdatedAt,
	}
	if c.AccountOwnerID.Valid {
		v.AccountOwnerID = uuid.UUID(c.AccountOwnerID.Bytes).String()
	}
	if c.ArchiveReason != nil {
		v.ArchiveReason = *c.ArchiveReason
	}
	if c.ArchivedAt.Valid {
		v.ArchivedAt = c.ArchivedAt.Time.Format(time.RFC3339)
	}
	if c.DateOfBirth.Valid {
		v.DateOfBirth = c.DateOfBirth.Time.Format("2006-01-02")
	}
	return v
}

func customerViewWithOwner(c db.Customer, accountOwnerName *string) CustomerView {
	v := customerView(c)
	if accountOwnerName != nil {
		v.AccountOwnerName = *accountOwnerName
	}
	return v
}

func listCustomersRowView(row db.ListCustomersRow) CustomerView {
	return customerViewWithOwner(db.Customer{
		ID: row.ID, TenantID: row.TenantID, CustomerType: row.CustomerType, Status: row.Status,
		Segment: row.Segment, Source: row.Source, AccountOwnerID: row.AccountOwnerID,
		ArchiveReason: row.ArchiveReason, ArchivedAt: row.ArchivedAt,
		OrganizationName: row.OrganizationName, LegalName: row.LegalName, TradingName: row.TradingName,
		RegistrationNumber: row.RegistrationNumber, TaxPin: row.TaxPin, Industry: row.Industry,
		OrganizationSize: row.OrganizationSize, FirstName: row.FirstName, MiddleName: row.MiddleName,
		LastName: row.LastName, DisplayName: row.DisplayName, IDNumber: row.IDNumber,
		DateOfBirth: row.DateOfBirth, Gender: row.Gender, Occupation: row.Occupation,
		Website: row.Website, Description: row.Description, PrimaryEmail: row.PrimaryEmail,
		PrimaryPhone: row.PrimaryPhone, AlternativePhone: row.AlternativePhone, Address: row.Address,
		Country: row.Country, State: row.State, City: row.City,
		CreatedAt: row.CreatedAt, UpdatedAt: row.UpdatedAt,
	}, row.AccountOwnerName)
}

func getCustomerByIDRowView(row db.GetCustomerByIDRow) CustomerView {
	return customerViewWithOwner(db.Customer{
		ID: row.ID, TenantID: row.TenantID, CustomerType: row.CustomerType, Status: row.Status,
		Segment: row.Segment, Source: row.Source, AccountOwnerID: row.AccountOwnerID,
		ArchiveReason: row.ArchiveReason, ArchivedAt: row.ArchivedAt,
		OrganizationName: row.OrganizationName, LegalName: row.LegalName, TradingName: row.TradingName,
		RegistrationNumber: row.RegistrationNumber, TaxPin: row.TaxPin, Industry: row.Industry,
		OrganizationSize: row.OrganizationSize, FirstName: row.FirstName, MiddleName: row.MiddleName,
		LastName: row.LastName, DisplayName: row.DisplayName, IDNumber: row.IDNumber,
		DateOfBirth: row.DateOfBirth, Gender: row.Gender, Occupation: row.Occupation,
		Website: row.Website, Description: row.Description, PrimaryEmail: row.PrimaryEmail,
		PrimaryPhone: row.PrimaryPhone, AlternativePhone: row.AlternativePhone, Address: row.Address,
		Country: row.Country, State: row.State, City: row.City,
		CreatedAt: row.CreatedAt, UpdatedAt: row.UpdatedAt,
	}, row.AccountOwnerName)
}

type ContactView struct {
	ID                      uuid.UUID `json:"id"`
	CustomerID              uuid.UUID `json:"customer_id"`
	FirstName               string    `json:"first_name"`
	LastName                string    `json:"last_name"`
	JobTitle                string    `json:"job_title"`
	Department              string    `json:"department"`
	Email                   string    `json:"email"`
	Phone                   string    `json:"phone"`
	AlternativePhone        string    `json:"alternative_phone"`
	IsPrimary               bool      `json:"is_primary"`
	CommunicationPreference string    `json:"communication_preference"`
	Notes                   string    `json:"notes"`
	Status                  string    `json:"status"`
	CreatedAt               time.Time `json:"created_at"`
}

func contactView(c db.Contact) ContactView {
	return ContactView{
		ID:                      c.ID,
		CustomerID:              c.CustomerID,
		FirstName:               c.FirstName,
		LastName:                c.LastName,
		JobTitle:                c.JobTitle,
		Department:              c.Department,
		Email:                   c.Email,
		Phone:                   c.Phone,
		AlternativePhone:        c.AlternativePhone,
		IsPrimary:               c.IsPrimary,
		CommunicationPreference: c.CommunicationPreference,
		Notes:                   c.Notes,
		Status:                  c.Status,
		CreatedAt:               c.CreatedAt,
	}
}

type TagView struct {
	ID   uuid.UUID `json:"id"`
	Name string    `json:"name"`
}

func tagView(t db.Tag) TagView {
	return TagView{ID: t.ID, Name: t.Name}
}

type NoteView struct {
	ID         uuid.UUID `json:"id"`
	CustomerID uuid.UUID `json:"customer_id"`
	AuthorName string    `json:"author_name,omitempty"`
	Body       string    `json:"body"`
	CreatedAt  time.Time `json:"created_at"`
}

func noteView(n db.ListCustomerNotesRow) NoteView {
	v := NoteView{ID: n.ID, CustomerID: n.CustomerID, Body: n.Body, CreatedAt: n.CreatedAt}
	if n.AuthorName != nil {
		v.AuthorName = *n.AuthorName
	}
	return v
}
