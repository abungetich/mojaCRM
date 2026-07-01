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

// PartnerHandler manages tenant-scoped partner organisations (e.g. banks,
// SACCOs), ported from propsense.
type PartnerHandler struct{ Deps }

func NewPartnerHandler(d Deps) *PartnerHandler { return &PartnerHandler{d} }

type partnerBody struct {
	Name              string `json:"name"`
	LogoUrl           string `json:"logo_url"`
	Industry          string `json:"industry"`
	PartnershipModel  string `json:"partnership_model"`
	Status            string `json:"status"`
	Address           string `json:"address"`
	Town              string `json:"town"`
	Country           string `json:"country"`
	ContactName       string `json:"contact_name"`
	ContactTitle      string `json:"contact_title"`
	WorkEmail         string `json:"work_email"`
	PhoneMobile       string `json:"phone_mobile"`
	PhoneOffice       string `json:"phone_office"`
	Notes             string `json:"notes"`
	Code              string `json:"code"`
	SlaDays           int32  `json:"sla_days"`
	DefaultTemplateID string `json:"default_template_id"`
	MileageRatePerKm  int64  `json:"mileage_rate_per_km"`
	Type              string `json:"type"`
}

// normalize trims/defaults the body and reports whether a name is present.
func (b *partnerBody) normalize() bool {
	b.Name = strings.TrimSpace(b.Name)
	if b.Status != "inactive" {
		b.Status = "active"
	}
	if strings.TrimSpace(b.Country) == "" {
		b.Country = "Kenya"
	}
	return b.Name != ""
}

type paginatedPartners struct {
	Data     []PartnerView `json:"data"`
	Total    int64         `json:"total"`
	Page     int32         `json:"page"`
	PageSize int32         `json:"page_size"`
}

func (h *PartnerHandler) List(w http.ResponseWriter, r *http.Request) {
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

	status := q.Get("status")
	partnerType := q.Get("type")
	search := strings.TrimSpace(q.Get("q"))

	rows, err := h.Store.Queries.ListPartners(r.Context(), db.ListPartnersParams{
		TenantID: tenantID,
		Column2:  status,
		Column3:  partnerType,
		Column4:  search,
		Limit:    pageSize,
		Offset:   (page - 1) * pageSize,
	})
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "could not list partners")
		return
	}
	total, err := h.Store.Queries.CountPartners(r.Context(), db.CountPartnersParams{
		TenantID: tenantID,
		Column2:  status,
		Column3:  partnerType,
		Column4:  search,
	})
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "could not count partners")
		return
	}

	out := make([]PartnerView, 0, len(rows))
	for _, p := range rows {
		out = append(out, partnerView(p))
	}
	httpx.JSON(w, http.StatusOK, paginatedPartners{Data: out, Total: total, Page: page, PageSize: pageSize})
}

func (h *PartnerHandler) Get(w http.ResponseWriter, r *http.Request) {
	tenantID, _ := appctx.TenantID(r.Context())
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "invalid partner id")
		return
	}
	p, err := h.Store.Queries.GetPartner(r.Context(), db.GetPartnerParams{ID: id, TenantID: tenantID})
	if err != nil {
		httpx.Error(w, http.StatusNotFound, "partner not found")
		return
	}
	httpx.JSON(w, http.StatusOK, partnerView(p))
}

func (h *PartnerHandler) Create(w http.ResponseWriter, r *http.Request) {
	tenantID, _ := appctx.TenantID(r.Context())
	var body partnerBody
	if err := httpx.Decode(r, &body); err != nil {
		httpx.Error(w, http.StatusBadRequest, "invalid request")
		return
	}
	if !body.normalize() {
		httpx.Error(w, http.StatusBadRequest, "name is required")
		return
	}
	defaultTemplateID, ok := parseOptionalUUID(body.DefaultTemplateID)
	if !ok {
		httpx.Error(w, http.StatusBadRequest, "invalid default_template_id")
		return
	}
	p, err := h.Store.Queries.CreatePartner(r.Context(), db.CreatePartnerParams{
		TenantID:          tenantID,
		Name:              body.Name,
		LogoUrl:           body.LogoUrl,
		Industry:          body.Industry,
		PartnershipModel:  body.PartnershipModel,
		Status:            body.Status,
		Address:           body.Address,
		Town:              body.Town,
		Country:           body.Country,
		ContactName:       body.ContactName,
		ContactTitle:      body.ContactTitle,
		WorkEmail:         body.WorkEmail,
		PhoneMobile:       body.PhoneMobile,
		PhoneOffice:       body.PhoneOffice,
		Notes:             body.Notes,
		CreatedByName:     actorName(r.Context(), h.Store),
		Code:              body.Code,
		SlaDays:           body.SlaDays,
		DefaultTemplateID: defaultTemplateID,
		MileageRatePerKm:  body.MileageRatePerKm,
		Type:              body.Type,
	})
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "could not create partner")
		return
	}
	httpx.JSON(w, http.StatusCreated, partnerView(p))
}

func (h *PartnerHandler) Update(w http.ResponseWriter, r *http.Request) {
	tenantID, _ := appctx.TenantID(r.Context())
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "invalid partner id")
		return
	}
	var body partnerBody
	if err := httpx.Decode(r, &body); err != nil {
		httpx.Error(w, http.StatusBadRequest, "invalid request")
		return
	}
	if !body.normalize() {
		httpx.Error(w, http.StatusBadRequest, "name is required")
		return
	}
	defaultTemplateID, ok := parseOptionalUUID(body.DefaultTemplateID)
	if !ok {
		httpx.Error(w, http.StatusBadRequest, "invalid default_template_id")
		return
	}
	p, err := h.Store.Queries.UpdatePartner(r.Context(), db.UpdatePartnerParams{
		ID:                id,
		TenantID:          tenantID,
		Name:              body.Name,
		LogoUrl:           body.LogoUrl,
		Industry:          body.Industry,
		PartnershipModel:  body.PartnershipModel,
		Status:            body.Status,
		Address:           body.Address,
		Town:              body.Town,
		Country:           body.Country,
		ContactName:       body.ContactName,
		ContactTitle:      body.ContactTitle,
		WorkEmail:         body.WorkEmail,
		PhoneMobile:       body.PhoneMobile,
		PhoneOffice:       body.PhoneOffice,
		Notes:             body.Notes,
		Code:              body.Code,
		SlaDays:           body.SlaDays,
		DefaultTemplateID: defaultTemplateID,
		MileageRatePerKm:  body.MileageRatePerKm,
		Type:              body.Type,
	})
	if err != nil {
		httpx.Error(w, http.StatusNotFound, "partner not found")
		return
	}
	httpx.JSON(w, http.StatusOK, partnerView(p))
}

// SetComparableRules sets a partner's comparable acceptance rules (partners:write).
func (h *PartnerHandler) SetComparableRules(w http.ResponseWriter, r *http.Request) {
	tenantID, _ := appctx.TenantID(r.Context())
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "invalid partner id")
		return
	}
	var b struct {
		CompMinCount        int32 `json:"comp_min_count"`
		CompMaxAgeMonths    int32 `json:"comp_max_age_months"`
		CompMaxRadiusKm     int32 `json:"comp_max_radius_km"`
		CompMaxVariancePct  int32 `json:"comp_max_variance_pct"`
		CompActualSalesOnly bool  `json:"comp_actual_sales_only"`
	}
	if err := httpx.Decode(r, &b); err != nil {
		httpx.Error(w, http.StatusBadRequest, "invalid request")
		return
	}
	if err := h.Store.Queries.SetPartnerComparableRules(r.Context(), db.SetPartnerComparableRulesParams{
		ID: id, TenantID: tenantID, CompMinCount: b.CompMinCount, CompMaxAgeMonths: b.CompMaxAgeMonths,
		CompMaxRadiusKm: b.CompMaxRadiusKm, CompMaxVariancePct: b.CompMaxVariancePct,
		CompActualSalesOnly: b.CompActualSalesOnly,
	}); err != nil {
		httpx.Error(w, http.StatusInternalServerError, "could not save rules")
		return
	}
	httpx.JSON(w, http.StatusOK, map[string]bool{"ok": true})
}

func (h *PartnerHandler) Delete(w http.ResponseWriter, r *http.Request) {
	tenantID, _ := appctx.TenantID(r.Context())
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "invalid partner id")
		return
	}
	if err := h.Store.Queries.DeletePartner(r.Context(), db.DeletePartnerParams{
		ID: id, TenantID: tenantID, DeletedByName: actorName(r.Context(), h.Store), DeleteReason: deleteReason(r),
	}); err != nil {
		httpx.Error(w, http.StatusInternalServerError, "could not delete partner")
		return
	}
	httpx.JSON(w, http.StatusOK, map[string]bool{"ok": true})
}
