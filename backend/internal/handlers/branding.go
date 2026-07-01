package handlers

import (
	"net/http"

	"mojacrm/backend/internal/database/db"
	"mojacrm/backend/internal/httpx"
)

type BrandingHandler struct{ Deps }

func NewBrandingHandler(d Deps) *BrandingHandler { return &BrandingHandler{d} }

type BrandingView struct {
	AppName string `json:"app_name"`
	Tagline string `json:"tagline"`
	LogoURL string `json:"logo_url"`
	IconURL string `json:"icon_url"`
}

func brandingView(s db.PlatformSetting) BrandingView {
	return BrandingView{AppName: s.AppName, Tagline: s.Tagline, LogoURL: s.LogoUrl, IconURL: s.IconUrl}
}

// Get is public — the login page and unauthenticated shell need branding
// before anyone signs in.
func (h *BrandingHandler) Get(w http.ResponseWriter, r *http.Request) {
	settings, err := h.Store.Queries.GetPlatformSettings(r.Context())
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "could not load branding")
		return
	}
	httpx.JSON(w, http.StatusOK, brandingView(settings))
}

// Update is platform-admin only.
func (h *BrandingHandler) Update(w http.ResponseWriter, r *http.Request) {
	var body struct {
		AppName string `json:"app_name"`
		Tagline string `json:"tagline"`
		LogoURL string `json:"logo_url"`
		IconURL string `json:"icon_url"`
	}
	if err := httpx.Decode(r, &body); err != nil || body.AppName == "" {
		httpx.Error(w, http.StatusBadRequest, "app_name is required")
		return
	}
	settings, err := h.Store.Queries.UpdatePlatformSettings(r.Context(), db.UpdatePlatformSettingsParams{
		AppName: body.AppName,
		Tagline: body.Tagline,
		LogoUrl: body.LogoURL,
		IconUrl: body.IconURL,
	})
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "could not update branding")
		return
	}
	httpx.JSON(w, http.StatusOK, brandingView(settings))
}
