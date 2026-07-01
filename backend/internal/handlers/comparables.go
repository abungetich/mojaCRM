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

// ComparableHandler manages the tenant-wide market-comparables library
// (property sale records used as reference data), ported from propsense.
// Comparables aren't owned by any client/partner/job — just a shared
// reference collection any tenant user can browse and add to.
//
// Usage tracking (which job/report used which comparable) is deliberately
// not ported: it ties comparables to Instructions and Reports, neither of
// which exist in MojaCRM yet. See db/migrations/0010_comparables.up.sql.
type ComparableHandler struct{ Deps }

func NewComparableHandler(d Deps) *ComparableHandler { return &ComparableHandler{d} }

type comparableBody struct {
	ParcelRef    string  `json:"parcel_ref"`
	Size         string  `json:"size"`
	Location     string  `json:"location"`
	CompDate     string  `json:"comp_date"`
	LandUser     string  `json:"land_user"`
	Value        string  `json:"value"`
	ValueAmount  int64   `json:"value_amount"`
	ValueDate    string  `json:"value_date"`
	Source       string  `json:"source"`
	County       string  `json:"county"`
	Notes        string  `json:"notes"`
	Lat          float64 `json:"lat"`
	Lng          float64 `json:"lng"`
	ContactPhone string  `json:"contact_phone"`
	DoneBy       string  `json:"done_by"`
}

type paginatedComparables struct {
	Data     []ComparableView `json:"data"`
	Total    int64            `json:"total"`
	Page     int32            `json:"page"`
	PageSize int32            `json:"page_size"`
}

// List returns a paginated, searchable page of comparables (comparables:read).
func (h *ComparableHandler) List(w http.ResponseWriter, r *http.Request) {
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

	search := strings.TrimSpace(q.Get("q"))

	rows, err := h.Store.Queries.ListComparables(r.Context(), db.ListComparablesParams{
		TenantID: tenantID,
		Column2:  search,
		Limit:    pageSize,
		Offset:   (page - 1) * pageSize,
	})
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "could not list comparables")
		return
	}
	total, err := h.Store.Queries.CountComparables(r.Context(), db.CountComparablesParams{
		TenantID: tenantID,
		Column2:  search,
	})
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "could not count comparables")
		return
	}

	out := make([]ComparableView, 0, len(rows))
	for _, row := range rows {
		out = append(out, comparableView(row))
	}
	httpx.JSON(w, http.StatusOK, paginatedComparables{Data: out, Total: total, Page: page, PageSize: pageSize})
}

// Get returns a single comparable (comparables:read).
func (h *ComparableHandler) Get(w http.ResponseWriter, r *http.Request) {
	tenantID, _ := appctx.TenantID(r.Context())
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "invalid comparable id")
		return
	}
	c, err := h.Store.Queries.GetComparable(r.Context(), db.GetComparableParams{ID: id, TenantID: tenantID})
	if err != nil {
		httpx.Error(w, http.StatusNotFound, "comparable not found")
		return
	}
	httpx.JSON(w, http.StatusOK, comparableView(c))
}

// Create adds a comparable to the library (comparables:write).
func (h *ComparableHandler) Create(w http.ResponseWriter, r *http.Request) {
	tenantID, _ := appctx.TenantID(r.Context())
	var body comparableBody
	if err := httpx.Decode(r, &body); err != nil {
		httpx.Error(w, http.StatusBadRequest, "invalid request")
		return
	}
	if strings.TrimSpace(body.ParcelRef) == "" && strings.TrimSpace(body.Location) == "" {
		httpx.Error(w, http.StatusBadRequest, "a parcel reference or location is required")
		return
	}
	c, err := h.Store.Queries.CreateComparable(r.Context(), db.CreateComparableParams{
		TenantID:      tenantID,
		ParcelRef:     body.ParcelRef,
		Size:          body.Size,
		Location:      body.Location,
		CompDate:      body.CompDate,
		LandUser:      body.LandUser,
		Value:         body.Value,
		ValueAmount:   body.ValueAmount,
		ValueDate:     body.ValueDate,
		Source:        body.Source,
		County:        body.County,
		Notes:         body.Notes,
		Lat:           body.Lat,
		Lng:           body.Lng,
		ContactPhone:  body.ContactPhone,
		DoneBy:        body.DoneBy,
		CreatedByName: actorName(r.Context(), h.Store),
	})
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "could not create comparable")
		return
	}
	httpx.JSON(w, http.StatusCreated, comparableView(c))
}

// Update edits a comparable (comparables:write).
func (h *ComparableHandler) Update(w http.ResponseWriter, r *http.Request) {
	tenantID, _ := appctx.TenantID(r.Context())
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "invalid comparable id")
		return
	}
	var body comparableBody
	if err := httpx.Decode(r, &body); err != nil {
		httpx.Error(w, http.StatusBadRequest, "invalid request")
		return
	}
	if strings.TrimSpace(body.ParcelRef) == "" && strings.TrimSpace(body.Location) == "" {
		httpx.Error(w, http.StatusBadRequest, "a parcel reference or location is required")
		return
	}
	c, err := h.Store.Queries.UpdateComparable(r.Context(), db.UpdateComparableParams{
		ID:           id,
		TenantID:     tenantID,
		ParcelRef:    body.ParcelRef,
		Size:         body.Size,
		Location:     body.Location,
		CompDate:     body.CompDate,
		LandUser:     body.LandUser,
		Value:        body.Value,
		ValueAmount:  body.ValueAmount,
		ValueDate:    body.ValueDate,
		Source:       body.Source,
		County:       body.County,
		Notes:        body.Notes,
		Lat:          body.Lat,
		Lng:          body.Lng,
		ContactPhone: body.ContactPhone,
		DoneBy:       body.DoneBy,
	})
	if err != nil {
		httpx.Error(w, http.StatusNotFound, "comparable not found")
		return
	}
	httpx.JSON(w, http.StatusOK, comparableView(c))
}

// Delete soft-deletes a comparable (comparables:write).
func (h *ComparableHandler) Delete(w http.ResponseWriter, r *http.Request) {
	tenantID, _ := appctx.TenantID(r.Context())
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "invalid comparable id")
		return
	}
	if err := h.Store.Queries.DeleteComparable(r.Context(), db.DeleteComparableParams{
		ID: id, TenantID: tenantID, DeletedByName: actorName(r.Context(), h.Store), DeleteReason: deleteReason(r),
	}); err != nil {
		httpx.Error(w, http.StatusInternalServerError, "could not delete comparable")
		return
	}
	httpx.JSON(w, http.StatusOK, map[string]bool{"ok": true})
}

// ListPhotos returns a comparable's property photos (comparables:read).
func (h *ComparableHandler) ListPhotos(w http.ResponseWriter, r *http.Request) {
	tenantID, _ := appctx.TenantID(r.Context())
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "invalid comparable id")
		return
	}
	rows, err := h.Store.Queries.ListComparablePhotos(r.Context(), db.ListComparablePhotosParams{
		ComparableID: id, TenantID: tenantID,
	})
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "could not list photos")
		return
	}
	out := make([]ComparablePhotoView, 0, len(rows))
	for _, p := range rows {
		out = append(out, comparablePhotoView(p))
	}
	httpx.JSON(w, http.StatusOK, out)
}

// AddPhoto attaches a property photo (plain URL) to a comparable (comparables:write).
func (h *ComparableHandler) AddPhoto(w http.ResponseWriter, r *http.Request) {
	tenantID, _ := appctx.TenantID(r.Context())
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "invalid comparable id")
		return
	}
	var b struct {
		PhotoUrl string `json:"photo_url"`
		Caption  string `json:"caption"`
	}
	if err := httpx.Decode(r, &b); err != nil || strings.TrimSpace(b.PhotoUrl) == "" {
		httpx.Error(w, http.StatusBadRequest, "a photo URL is required")
		return
	}
	p, err := h.Store.Queries.AddComparablePhoto(r.Context(), db.AddComparablePhotoParams{
		TenantID: tenantID, ComparableID: id, PhotoUrl: strings.TrimSpace(b.PhotoUrl),
		Caption: strings.TrimSpace(b.Caption), CreatedByName: actorName(r.Context(), h.Store),
	})
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "could not save photo")
		return
	}
	httpx.JSON(w, http.StatusCreated, comparablePhotoView(p))
}

// DeletePhoto removes a comparable photo (comparables:write). Flat path, per
// MojaCRM convention for nested sub-resource delete/update.
func (h *ComparableHandler) DeletePhoto(w http.ResponseWriter, r *http.Request) {
	tenantID, _ := appctx.TenantID(r.Context())
	id, err := uuid.Parse(chi.URLParam(r, "photoId"))
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "invalid photo id")
		return
	}
	if err := h.Store.Queries.DeleteComparablePhoto(r.Context(), db.DeleteComparablePhotoParams{
		ID: id, TenantID: tenantID,
	}); err != nil {
		httpx.Error(w, http.StatusInternalServerError, "could not delete photo")
		return
	}
	httpx.JSON(w, http.StatusOK, map[string]bool{"ok": true})
}

// PhotoCounts returns photo counts per comparable, keyed by comparable id (as
// a string), for table badges (comparables:read).
func (h *ComparableHandler) PhotoCounts(w http.ResponseWriter, r *http.Request) {
	tenantID, _ := appctx.TenantID(r.Context())
	rows, err := h.Store.Queries.ComparablePhotoCounts(r.Context(), tenantID)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "could not count photos")
		return
	}
	out := map[string]int64{}
	for _, row := range rows {
		out[row.ComparableID.String()] = row.N
	}
	httpx.JSON(w, http.StatusOK, out)
}
