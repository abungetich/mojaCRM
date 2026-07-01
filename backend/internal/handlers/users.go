package handlers

import (
	"net/http"
	"strings"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"

	"mojacrm/backend/internal/appctx"
	authpkg "mojacrm/backend/internal/auth"
	"mojacrm/backend/internal/database/db"
	"mojacrm/backend/internal/httpx"
)

type UserHandler struct{ Deps }

func NewUserHandler(d Deps) *UserHandler { return &UserHandler{d} }

func (h *UserHandler) List(w http.ResponseWriter, r *http.Request) {
	tenantID, _ := appctx.TenantID(r.Context())
	rows, err := h.Store.Queries.ListUsersWithRole(r.Context(), tenantID)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "could not list users")
		return
	}
	httpx.JSON(w, http.StatusOK, listUsersWithRoleView(rows))
}

func (h *UserHandler) Create(w http.ResponseWriter, r *http.Request) {
	tenantID, _ := appctx.TenantID(r.Context())
	var body struct {
		Email  string `json:"email"`
		Name   string `json:"name"`
		RoleID string `json:"role_id"`
	}
	if err := httpx.Decode(r, &body); err != nil || body.Email == "" || body.Name == "" {
		httpx.Error(w, http.StatusBadRequest, "invalid body")
		return
	}
	var roleID pgtype.UUID
	if body.RoleID != "" {
		id, err := uuid.Parse(body.RoleID)
		if err != nil {
			httpx.Error(w, http.StatusBadRequest, "invalid role_id")
			return
		}
		roleID = pgtype.UUID{Bytes: id, Valid: true}
	}

	tempPassword := uuid.NewString()
	hash, err := authpkg.HashPassword(tempPassword)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "could not hash password")
		return
	}

	user, err := h.Store.Queries.CreateUser(r.Context(), db.CreateUserParams{
		TenantID:     tenantID,
		RoleID:       roleID,
		Email:        strings.ToLower(body.Email),
		Name:         body.Name,
		PasswordHash: hash,
		Status:       "invited",
	})
	if err != nil {
		httpx.Error(w, http.StatusConflict, "email already in use")
		return
	}
	httpx.JSON(w, http.StatusCreated, userView(user))
}

// Update applies a partial update: role_id and/or status. Name changes are
// out of scope for this scaffold (users edit their own profile elsewhere).
func (h *UserHandler) Update(w http.ResponseWriter, r *http.Request) {
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "invalid id")
		return
	}
	var body struct {
		RoleID *string `json:"role_id"`
		Status *string `json:"status"`
	}
	if err := httpx.Decode(r, &body); err != nil {
		httpx.Error(w, http.StatusBadRequest, "invalid body")
		return
	}

	var user db.User
	if body.RoleID != nil {
		roleID, err := uuid.Parse(*body.RoleID)
		if err != nil {
			httpx.Error(w, http.StatusBadRequest, "invalid role_id")
			return
		}
		user, err = h.Store.Queries.UpdateUserRole(r.Context(), db.UpdateUserRoleParams{ID: id, RoleID: pgtype.UUID{Bytes: roleID, Valid: true}})
		if err != nil {
			httpx.Error(w, http.StatusInternalServerError, "could not update role")
			return
		}
	}
	if body.Status != nil {
		user, err = h.Store.Queries.UpdateUserStatus(r.Context(), db.UpdateUserStatusParams{ID: id, Status: *body.Status})
		if err != nil {
			httpx.Error(w, http.StatusInternalServerError, "could not update status")
			return
		}
	}
	httpx.JSON(w, http.StatusOK, userView(user))
}

func (h *UserHandler) Delete(w http.ResponseWriter, r *http.Request) {
	tenantID, _ := appctx.TenantID(r.Context())
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "invalid id")
		return
	}
	if err := h.Store.Queries.DeleteUser(r.Context(), db.DeleteUserParams{ID: id, TenantID: tenantID}); err != nil {
		httpx.Error(w, http.StatusInternalServerError, "could not delete user")
		return
	}
	httpx.JSON(w, http.StatusOK, map[string]bool{"ok": true})
}
