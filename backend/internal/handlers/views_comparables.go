package handlers

import (
	"time"

	"github.com/google/uuid"

	"mojacrm/backend/internal/database/db"
)

// ComparableView omits internal soft-delete audit columns.
type ComparableView struct {
	ID            uuid.UUID `json:"id"`
	ParcelRef     string    `json:"parcel_ref"`
	Size          string    `json:"size"`
	Location      string    `json:"location"`
	CompDate      string    `json:"comp_date"`
	LandUser      string    `json:"land_user"`
	Value         string    `json:"value"`
	ValueAmount   int64     `json:"value_amount"`
	ValueDate     string    `json:"value_date"`
	Source        string    `json:"source"`
	County        string    `json:"county"`
	Notes         string    `json:"notes"`
	Lat           float64   `json:"lat"`
	Lng           float64   `json:"lng"`
	ContactPhone  string    `json:"contact_phone"`
	DoneBy        string    `json:"done_by"`
	CreatedByName string    `json:"created_by_name"`
	CreatedAt     time.Time `json:"created_at"`
	UpdatedAt     time.Time `json:"updated_at"`
}

func comparableView(c db.Comparable) ComparableView {
	return ComparableView{
		ID: c.ID, ParcelRef: c.ParcelRef, Size: c.Size, Location: c.Location,
		CompDate: c.CompDate, LandUser: c.LandUser, Value: c.Value,
		ValueAmount: c.ValueAmount, ValueDate: c.ValueDate,
		Source: c.Source, County: c.County, Notes: c.Notes,
		Lat: c.Lat, Lng: c.Lng, ContactPhone: c.ContactPhone, DoneBy: c.DoneBy,
		CreatedByName: c.CreatedByName, CreatedAt: c.CreatedAt, UpdatedAt: c.UpdatedAt,
	}
}

// ComparablePhotoView is a property photo attached to a comparable. photo_url
// is a plain link (no file-upload infra yet), matching Partner.logo_url.
type ComparablePhotoView struct {
	ID            uuid.UUID `json:"id"`
	ComparableID  uuid.UUID `json:"comparable_id"`
	PhotoUrl      string    `json:"photo_url"`
	Caption       string    `json:"caption"`
	CreatedByName string    `json:"created_by_name"`
	CreatedAt     time.Time `json:"created_at"`
}

func comparablePhotoView(p db.ComparablePhoto) ComparablePhotoView {
	return ComparablePhotoView{
		ID: p.ID, ComparableID: p.ComparableID, PhotoUrl: p.PhotoUrl,
		Caption: p.Caption, CreatedByName: p.CreatedByName, CreatedAt: p.CreatedAt,
	}
}
