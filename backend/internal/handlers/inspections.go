package handlers

import (
	"net/http"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"

	"mojacrm/backend/internal/appctx"
	"mojacrm/backend/internal/database/db"
	"mojacrm/backend/internal/httpx"
)

// InspectionHandler manages inspections — field visits scheduled against a
// client — ported from propsense's job-scoped inspection scheduler.
//
// propsense schedules an inspection against a valuation job (instruction),
// and on Arrive/Depart captures the field officer's GPS and compares it to
// the property's coordinates (captured on the job's report) as a geofence
// "field control", warning but never blocking. MojaCRM deliberately has no
// Instructions/jobs module and no report/property-location concept, so per
// product decision this is a general field visit scoped to a CLIENT instead
// of a job. The geofence distance/flag calculation has no equivalent
// without a property location to compare against, so it's dropped —
// arrival/departure GPS is still captured for the record.
type InspectionHandler struct{ Deps }

func NewInspectionHandler(d Deps) *InspectionHandler { return &InspectionHandler{d} }

// parseSchedule accepts an ISO datetime or the frontend DateTimePicker's
// "yyyy-MM-ddTHH:mm" value. Ported from propsense's inspections handler.
func parseSchedule(s string) pgtype.Timestamptz {
	s = strings.TrimSpace(s)
	if s == "" {
		return pgtype.Timestamptz{}
	}
	for _, layout := range []string{time.RFC3339, "2006-01-02T15:04", "2006-01-02T15:04:05", "2006-01-02 15:04"} {
		if t, err := time.Parse(layout, s); err == nil {
			return pgtype.Timestamptz{Time: t, Valid: true}
		}
	}
	return pgtype.Timestamptz{}
}

type inspectionBody struct {
	ScheduledAt   string `json:"scheduled_at"`
	ContactName   string `json:"contact_name"`
	ContactPhone  string `json:"contact_phone"`
	Notes         string `json:"notes"`
	TransportMode string `json:"transport_mode"`
}

// ListByClient lists a client's inspections (inspections:read).
func (h *InspectionHandler) ListByClient(w http.ResponseWriter, r *http.Request) {
	tenantID, _ := appctx.TenantID(r.Context())
	clientID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "invalid client id")
		return
	}
	rows, err := h.Store.Queries.ListInspectionsByClient(r.Context(), db.ListInspectionsByClientParams{
		TenantID: tenantID, ClientID: clientID,
	})
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "could not list inspections")
		return
	}
	out := make([]InspectionView, 0, len(rows))
	for _, i := range rows {
		out = append(out, inspectionView(i))
	}
	httpx.JSON(w, http.StatusOK, out)
}

// ListAll is the tenant-wide feed for the Calendar page (inspections:read).
func (h *InspectionHandler) ListAll(w http.ResponseWriter, r *http.Request) {
	tenantID, _ := appctx.TenantID(r.Context())
	rows, err := h.Store.Queries.ListInspectionsAll(r.Context(), tenantID)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "could not list inspections")
		return
	}
	out := make([]InspectionView, 0, len(rows))
	for _, i := range rows {
		out = append(out, listInspectionsAllRowView(i))
	}
	httpx.JSON(w, http.StatusOK, out)
}

// Get returns a single inspection (inspections:read).
func (h *InspectionHandler) Get(w http.ResponseWriter, r *http.Request) {
	tenantID, _ := appctx.TenantID(r.Context())
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "invalid inspection id")
		return
	}
	ins, err := h.Store.Queries.GetInspection(r.Context(), db.GetInspectionParams{ID: id, TenantID: tenantID})
	if err != nil {
		httpx.Error(w, http.StatusNotFound, "inspection not found")
		return
	}
	httpx.JSON(w, http.StatusOK, inspectionView(ins))
}

// Schedule creates a new inspection against a client — the "call the client,
// arrange a visit" event (inspections:write).
func (h *InspectionHandler) Schedule(w http.ResponseWriter, r *http.Request) {
	tenantID, _ := appctx.TenantID(r.Context())
	clientID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "invalid client id")
		return
	}
	var b inspectionBody
	if err := httpx.Decode(r, &b); err != nil {
		httpx.Error(w, http.StatusBadRequest, "invalid request")
		return
	}
	ins, err := h.Store.Queries.CreateInspection(r.Context(), db.CreateInspectionParams{
		TenantID: tenantID, ClientID: clientID, ScheduledAt: parseSchedule(b.ScheduledAt),
		ContactName: strings.TrimSpace(b.ContactName), ContactPhone: strings.TrimSpace(b.ContactPhone),
		Notes: strings.TrimSpace(b.Notes), TransportMode: strings.TrimSpace(b.TransportMode),
		CreatedByName: actorName(r.Context(), h.Store),
	})
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "could not schedule inspection")
		return
	}
	httpx.JSON(w, http.StatusCreated, inspectionView(ins))
}

// Update edits a scheduled inspection's details — reschedule, change
// contact, add notes, etc. (inspections:write).
func (h *InspectionHandler) Update(w http.ResponseWriter, r *http.Request) {
	tenantID, _ := appctx.TenantID(r.Context())
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "invalid inspection id")
		return
	}
	var b inspectionBody
	if err := httpx.Decode(r, &b); err != nil {
		httpx.Error(w, http.StatusBadRequest, "invalid request")
		return
	}
	ins, err := h.Store.Queries.UpdateInspection(r.Context(), db.UpdateInspectionParams{
		ID: id, TenantID: tenantID, ScheduledAt: parseSchedule(b.ScheduledAt),
		ContactName: strings.TrimSpace(b.ContactName), ContactPhone: strings.TrimSpace(b.ContactPhone),
		Notes: strings.TrimSpace(b.Notes), TransportMode: strings.TrimSpace(b.TransportMode),
	})
	if err != nil {
		httpx.Error(w, http.StatusNotFound, "inspection not found")
		return
	}
	httpx.JSON(w, http.StatusOK, inspectionView(ins))
}

type gpsBody struct {
	Lat float64 `json:"lat"`
	Lng float64 `json:"lng"`
}

// Arrive logs arrival on site (inspections:write).
func (h *InspectionHandler) Arrive(w http.ResponseWriter, r *http.Request) {
	tenantID, _ := appctx.TenantID(r.Context())
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "invalid inspection id")
		return
	}
	var b gpsBody
	_ = httpx.Decode(r, &b) // GPS is optional — best-effort capture, never blocks the visit
	ins, err := h.Store.Queries.ArriveInspection(r.Context(), db.ArriveInspectionParams{
		ID: id, TenantID: tenantID, ArrivalLat: b.Lat, ArrivalLng: b.Lng,
	})
	if err != nil {
		httpx.Error(w, http.StatusNotFound, "inspection not found")
		return
	}
	httpx.JSON(w, http.StatusOK, inspectionView(ins))
}

// Depart logs departure from site, completing the visit (inspections:write).
func (h *InspectionHandler) Depart(w http.ResponseWriter, r *http.Request) {
	tenantID, _ := appctx.TenantID(r.Context())
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "invalid inspection id")
		return
	}
	var b gpsBody
	_ = httpx.Decode(r, &b)
	ins, err := h.Store.Queries.DepartInspection(r.Context(), db.DepartInspectionParams{
		ID: id, TenantID: tenantID, DepartureLat: b.Lat, DepartureLng: b.Lng,
	})
	if err != nil {
		httpx.Error(w, http.StatusNotFound, "inspection not found")
		return
	}
	httpx.JSON(w, http.StatusOK, inspectionView(ins))
}

// Cancel cancels a scheduled inspection (inspections:write).
func (h *InspectionHandler) Cancel(w http.ResponseWriter, r *http.Request) {
	tenantID, _ := appctx.TenantID(r.Context())
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "invalid inspection id")
		return
	}
	ins, err := h.Store.Queries.CancelInspection(r.Context(), db.CancelInspectionParams{ID: id, TenantID: tenantID})
	if err != nil {
		httpx.Error(w, http.StatusNotFound, "inspection not found")
		return
	}
	httpx.JSON(w, http.StatusOK, inspectionView(ins))
}

// Delete permanently removes an inspection (inspections:write). Inspections
// have no soft-delete/archive support (see the migration's comment) — use
// Cancel for a scheduled visit that falls through instead.
func (h *InspectionHandler) Delete(w http.ResponseWriter, r *http.Request) {
	tenantID, _ := appctx.TenantID(r.Context())
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "invalid inspection id")
		return
	}
	if err := h.Store.Queries.DeleteInspection(r.Context(), db.DeleteInspectionParams{ID: id, TenantID: tenantID}); err != nil {
		httpx.Error(w, http.StatusInternalServerError, "could not delete inspection")
		return
	}
	httpx.JSON(w, http.StatusOK, map[string]bool{"ok": true})
}

// --- Photos ---

// AddPhoto stores a geotagged field photo against an inspection (inspections:write).
func (h *InspectionHandler) AddPhoto(w http.ResponseWriter, r *http.Request) {
	tenantID, _ := appctx.TenantID(r.Context())
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "invalid inspection id")
		return
	}
	ins, err := h.Store.Queries.GetInspection(r.Context(), db.GetInspectionParams{ID: id, TenantID: tenantID})
	if err != nil {
		httpx.Error(w, http.StatusNotFound, "inspection not found")
		return
	}
	var b struct {
		DataURL string  `json:"data_url"`
		Caption string  `json:"caption"`
		Lat     float64 `json:"lat"`
		Lng     float64 `json:"lng"`
	}
	if err := httpx.Decode(r, &b); err != nil || strings.TrimSpace(b.DataURL) == "" {
		httpx.Error(w, http.StatusBadRequest, "a photo is required")
		return
	}
	p, err := h.Store.Queries.CreateInspectionPhoto(r.Context(), db.CreateInspectionPhotoParams{
		TenantID: tenantID, ClientID: ins.ClientID, InspectionID: id,
		Caption: strings.TrimSpace(b.Caption), DataUrl: b.DataURL, Lat: b.Lat, Lng: b.Lng,
		CreatedByName: actorName(r.Context(), h.Store),
	})
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "could not save photo")
		return
	}
	httpx.JSON(w, http.StatusCreated, inspectionPhotoView(p))
}

// ListPhotos returns an inspection's photos (inspections:read).
func (h *InspectionHandler) ListPhotos(w http.ResponseWriter, r *http.Request) {
	tenantID, _ := appctx.TenantID(r.Context())
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "invalid inspection id")
		return
	}
	rows, err := h.Store.Queries.ListInspectionPhotosByInspection(r.Context(), db.ListInspectionPhotosByInspectionParams{
		TenantID: tenantID, InspectionID: id,
	})
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "could not list photos")
		return
	}
	out := make([]InspectionPhotoView, 0, len(rows))
	for _, p := range rows {
		out = append(out, inspectionPhotoView(p))
	}
	httpx.JSON(w, http.StatusOK, out)
}

// UpdatePhotoCaption sets a photo's caption (inspections:write).
func (h *InspectionHandler) UpdatePhotoCaption(w http.ResponseWriter, r *http.Request) {
	tenantID, _ := appctx.TenantID(r.Context())
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "invalid photo id")
		return
	}
	var b struct {
		Caption string `json:"caption"`
	}
	if err := httpx.Decode(r, &b); err != nil {
		httpx.Error(w, http.StatusBadRequest, "invalid request")
		return
	}
	p, err := h.Store.Queries.UpdateInspectionPhotoCaption(r.Context(), db.UpdateInspectionPhotoCaptionParams{
		ID: id, TenantID: tenantID, Caption: strings.TrimSpace(b.Caption),
	})
	if err != nil {
		httpx.Error(w, http.StatusNotFound, "photo not found")
		return
	}
	httpx.JSON(w, http.StatusOK, inspectionPhotoView(p))
}

// DeletePhoto removes an inspection photo (inspections:write).
func (h *InspectionHandler) DeletePhoto(w http.ResponseWriter, r *http.Request) {
	tenantID, _ := appctx.TenantID(r.Context())
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "invalid id")
		return
	}
	if err := h.Store.Queries.DeleteInspectionPhoto(r.Context(), db.DeleteInspectionPhotoParams{ID: id, TenantID: tenantID}); err != nil {
		httpx.Error(w, http.StatusInternalServerError, "could not delete photo")
		return
	}
	httpx.JSON(w, http.StatusOK, map[string]bool{"ok": true})
}
