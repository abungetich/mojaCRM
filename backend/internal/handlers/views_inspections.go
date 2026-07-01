package handlers

import (
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"

	"mojacrm/backend/internal/database/db"
)

// InspectionView flattens the nullable schedule/arrive/depart timestamps
// into pointers (omitted entirely from JSON until set) and carries the
// client's display name when the row came from the tenant-wide Calendar
// feed (ListInspectionsAll); it's blank for the per-client tab list, which
// already knows which client it's looking at.
type InspectionView struct {
	ID            uuid.UUID  `json:"id"`
	ClientID      uuid.UUID  `json:"client_id"`
	ClientName    string     `json:"client_name,omitempty"`
	Status        string     `json:"status"`
	ScheduledAt   *time.Time `json:"scheduled_at,omitempty"`
	ContactName   string     `json:"contact_name"`
	ContactPhone  string     `json:"contact_phone"`
	Notes         string     `json:"notes"`
	TransportMode string     `json:"transport_mode"`
	ArrivedAt     *time.Time `json:"arrived_at,omitempty"`
	ArrivalLat    float64    `json:"arrival_lat"`
	ArrivalLng    float64    `json:"arrival_lng"`
	DepartedAt    *time.Time `json:"departed_at,omitempty"`
	DepartureLat  float64    `json:"departure_lat"`
	DepartureLng  float64    `json:"departure_lng"`
	CreatedByName string     `json:"created_by_name"`
	CreatedAt     time.Time  `json:"created_at"`
	UpdatedAt     time.Time  `json:"updated_at"`
}

func tsPtr(t pgtype.Timestamptz) *time.Time {
	if !t.Valid {
		return nil
	}
	return &t.Time
}

func inspectionView(i db.Inspection) InspectionView {
	return InspectionView{
		ID: i.ID, ClientID: i.ClientID, Status: i.Status, ScheduledAt: tsPtr(i.ScheduledAt),
		ContactName: i.ContactName, ContactPhone: i.ContactPhone, Notes: i.Notes, TransportMode: i.TransportMode,
		ArrivedAt: tsPtr(i.ArrivedAt), ArrivalLat: i.ArrivalLat, ArrivalLng: i.ArrivalLng,
		DepartedAt: tsPtr(i.DepartedAt), DepartureLat: i.DepartureLat, DepartureLng: i.DepartureLng,
		CreatedByName: i.CreatedByName, CreatedAt: i.CreatedAt, UpdatedAt: i.UpdatedAt,
	}
}

func listInspectionsAllRowView(row db.ListInspectionsAllRow) InspectionView {
	v := inspectionView(db.Inspection{
		ID: row.ID, TenantID: row.TenantID, ClientID: row.ClientID, Status: row.Status, ScheduledAt: row.ScheduledAt,
		ContactName: row.ContactName, ContactPhone: row.ContactPhone, Notes: row.Notes, TransportMode: row.TransportMode,
		ArrivedAt: row.ArrivedAt, ArrivalLat: row.ArrivalLat, ArrivalLng: row.ArrivalLng,
		DepartedAt: row.DepartedAt, DepartureLat: row.DepartureLat, DepartureLng: row.DepartureLng,
		CreatedByName: row.CreatedByName, CreatedAt: row.CreatedAt, UpdatedAt: row.UpdatedAt,
	})
	v.ClientName = row.ClientName
	return v
}

// --- Inspection photos ---

type InspectionPhotoView struct {
	ID            uuid.UUID `json:"id"`
	InspectionID  uuid.UUID `json:"inspection_id"`
	ClientID      uuid.UUID `json:"client_id"`
	Caption       string    `json:"caption"`
	DataUrl       string    `json:"data_url"`
	Lat           float64   `json:"lat"`
	Lng           float64   `json:"lng"`
	TakenAt       time.Time `json:"taken_at"`
	CreatedByName string    `json:"created_by_name"`
}

func inspectionPhotoView(p db.InspectionPhoto) InspectionPhotoView {
	return InspectionPhotoView{
		ID: p.ID, InspectionID: p.InspectionID, ClientID: p.ClientID, Caption: p.Caption, DataUrl: p.DataUrl,
		Lat: p.Lat, Lng: p.Lng, TakenAt: p.TakenAt, CreatedByName: p.CreatedByName,
	}
}
