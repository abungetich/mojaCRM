package handlers

import (
	"net/http"
	"strings"

	authpkg "mojacrm/backend/internal/auth"
	"mojacrm/backend/internal/database/db"
	"mojacrm/backend/internal/httpx"
)

type TeamHandler struct{ Deps }

func NewTeamHandler(d Deps) *TeamHandler { return &TeamHandler{d} }

func (h *TeamHandler) List(w http.ResponseWriter, r *http.Request) {
	admins, err := h.Store.Queries.ListPlatformAdmins(r.Context())
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "could not list team")
		return
	}
	out := make([]PlatformAdminView, 0, len(admins))
	for _, a := range admins {
		out = append(out, platformAdminView(a))
	}
	httpx.JSON(w, http.StatusOK, out)
}

func (h *TeamHandler) Create(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Email    string `json:"email"`
		Name     string `json:"name"`
		Password string `json:"password"`
	}
	if err := httpx.Decode(r, &body); err != nil || body.Email == "" || body.Name == "" || len(body.Password) < 8 {
		httpx.Error(w, http.StatusBadRequest, "invalid body")
		return
	}
	hash, err := authpkg.HashPassword(body.Password)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "could not hash password")
		return
	}
	admin, err := h.Store.Queries.CreatePlatformAdmin(r.Context(), db.CreatePlatformAdminParams{
		Email:        strings.ToLower(body.Email),
		Name:         body.Name,
		PasswordHash: hash,
	})
	if err != nil {
		httpx.Error(w, http.StatusConflict, "email already in use")
		return
	}
	httpx.JSON(w, http.StatusCreated, platformAdminView(admin))
}
