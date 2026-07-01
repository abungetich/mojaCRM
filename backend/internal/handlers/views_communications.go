package handlers

import (
	"strings"
	"time"

	"github.com/google/uuid"

	"mojacrm/backend/internal/database/db"
)

type CommunicationView struct {
	ID                uuid.UUID `json:"id"`
	CustomerID        uuid.UUID `json:"customer_id"`
	CustomerName      string    `json:"customer_name,omitempty"`
	ContactID         string    `json:"contact_id,omitempty"`
	ContactName       string    `json:"contact_name,omitempty"`
	CommunicationType string    `json:"communication_type"`
	Direction         string    `json:"direction"`
	Subject           string    `json:"subject"`
	MessageBody       string    `json:"message_body"`
	Status            string    `json:"status"`
	CommunicationDate time.Time `json:"communication_date"`
	FollowUpRequired  bool      `json:"follow_up_required"`
	FollowUpDate      string    `json:"follow_up_date,omitempty"`
	CreatedByName     string    `json:"created_by_name,omitempty"`
	AssignedToName    string    `json:"assigned_to_name,omitempty"`
	CreatedAt         time.Time `json:"created_at"`
}

func contactFullName(first, last *string) string {
	if first == nil && last == nil {
		return ""
	}
	f, l := "", ""
	if first != nil {
		f = *first
	}
	if last != nil {
		l = *last
	}
	return strings.TrimSpace(f + " " + l)
}

func communicationView(c db.CustomerCommunication) CommunicationView {
	v := CommunicationView{
		ID:                c.ID,
		CustomerID:        c.CustomerID,
		CommunicationType: c.CommunicationType,
		Direction:         c.Direction,
		Subject:           c.Subject,
		MessageBody:       c.MessageBody,
		Status:            c.Status,
		CommunicationDate: c.CommunicationDate,
		FollowUpRequired:  c.FollowUpRequired,
		CreatedAt:         c.CreatedAt,
	}
	if c.ContactID.Valid {
		v.ContactID = uuid.UUID(c.ContactID.Bytes).String()
	}
	if c.FollowUpDate.Valid {
		v.FollowUpDate = c.FollowUpDate.Time.Format(time.RFC3339)
	}
	return v
}

func communicationByCustomerRowView(r db.ListCommunicationsByCustomerRow) CommunicationView {
	v := communicationView(db.CustomerCommunication{
		ID: r.ID, TenantID: r.TenantID, CustomerID: r.CustomerID, ContactID: r.ContactID,
		CommunicationType: r.CommunicationType, Direction: r.Direction, Subject: r.Subject,
		MessageBody: r.MessageBody, Status: r.Status, CommunicationDate: r.CommunicationDate,
		FollowUpRequired: r.FollowUpRequired, FollowUpDate: r.FollowUpDate,
		CreatedBy: r.CreatedBy, AssignedTo: r.AssignedTo, CreatedAt: r.CreatedAt, UpdatedAt: r.UpdatedAt,
	})
	v.ContactName = contactFullName(r.ContactFirstName, r.ContactLastName)
	if r.CreatedByName != nil {
		v.CreatedByName = *r.CreatedByName
	}
	if r.AssignedToName != nil {
		v.AssignedToName = *r.AssignedToName
	}
	return v
}

func communicationListRowView(r db.ListCommunicationsRow) CommunicationView {
	v := communicationView(db.CustomerCommunication{
		ID: r.ID, TenantID: r.TenantID, CustomerID: r.CustomerID, ContactID: r.ContactID,
		CommunicationType: r.CommunicationType, Direction: r.Direction, Subject: r.Subject,
		MessageBody: r.MessageBody, Status: r.Status, CommunicationDate: r.CommunicationDate,
		FollowUpRequired: r.FollowUpRequired, FollowUpDate: r.FollowUpDate,
		CreatedBy: r.CreatedBy, AssignedTo: r.AssignedTo, CreatedAt: r.CreatedAt, UpdatedAt: r.UpdatedAt,
	})
	v.CustomerName = r.CustomerName
	v.ContactName = contactFullName(r.ContactFirstName, r.ContactLastName)
	if r.CreatedByName != nil {
		v.CreatedByName = *r.CreatedByName
	}
	if r.AssignedToName != nil {
		v.AssignedToName = *r.AssignedToName
	}
	return v
}

func followUpDueRowView(r db.ListFollowUpsDueRow) CommunicationView {
	v := communicationView(db.CustomerCommunication{
		ID: r.ID, TenantID: r.TenantID, CustomerID: r.CustomerID, ContactID: r.ContactID,
		CommunicationType: r.CommunicationType, Direction: r.Direction, Subject: r.Subject,
		MessageBody: r.MessageBody, Status: r.Status, CommunicationDate: r.CommunicationDate,
		FollowUpRequired: r.FollowUpRequired, FollowUpDate: r.FollowUpDate,
		CreatedBy: r.CreatedBy, AssignedTo: r.AssignedTo, CreatedAt: r.CreatedAt, UpdatedAt: r.UpdatedAt,
	})
	v.CustomerName = r.CustomerName
	v.ContactName = contactFullName(r.ContactFirstName, r.ContactLastName)
	if r.CreatedByName != nil {
		v.CreatedByName = *r.CreatedByName
	}
	if r.AssignedToName != nil {
		v.AssignedToName = *r.AssignedToName
	}
	return v
}
