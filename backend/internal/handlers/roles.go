package handlers

import (
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	"mojacrm/backend/internal/appctx"
	"mojacrm/backend/internal/database/db"
	"mojacrm/backend/internal/httpx"
)

type RoleHandler struct{ Deps }

func NewRoleHandler(d Deps) *RoleHandler { return &RoleHandler{d} }

func (h *RoleHandler) List(w http.ResponseWriter, r *http.Request) {
	tenantID, _ := appctx.TenantID(r.Context())
	roles, err := h.Store.Queries.ListRolesByTenant(r.Context(), tenantID)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "could not list roles")
		return
	}
	out := make([]RoleView, 0, len(roles))
	for _, role := range roles {
		keys, err := h.Store.Queries.ListRolePermissionKeys(r.Context(), role.ID)
		if err != nil {
			httpx.Error(w, http.StatusInternalServerError, "could not list role permissions")
			return
		}
		out = append(out, RoleView{
			ID:             role.ID,
			Name:           role.Name,
			Description:    role.Description,
			IsSystem:       role.IsSystem,
			PermissionKeys: keys,
		})
	}
	httpx.JSON(w, http.StatusOK, out)
}

func (h *RoleHandler) ListPermissions(w http.ResponseWriter, r *http.Request) {
	perms, err := h.Store.Queries.ListPermissions(r.Context())
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "could not list permissions")
		return
	}
	httpx.JSON(w, http.StatusOK, perms)
}

func (h *RoleHandler) Create(w http.ResponseWriter, r *http.Request) {
	tenantID, _ := appctx.TenantID(r.Context())
	var body struct {
		Name           string   `json:"name"`
		Description    string   `json:"description"`
		PermissionKeys []string `json:"permission_keys"`
	}
	if err := httpx.Decode(r, &body); err != nil || body.Name == "" {
		httpx.Error(w, http.StatusBadRequest, "invalid body")
		return
	}
	role, err := h.Store.Queries.CreateRole(r.Context(), db.CreateRoleParams{
		TenantID:    tenantID,
		Name:        body.Name,
		Description: body.Description,
		IsSystem:    false,
	})
	if err != nil {
		httpx.Error(w, http.StatusConflict, "role name already exists")
		return
	}
	for _, key := range body.PermissionKeys {
		_ = h.Store.Queries.AddPermissionToRole(r.Context(), db.AddPermissionToRoleParams{RoleID: role.ID, PermissionKey: key})
	}
	httpx.JSON(w, http.StatusCreated, RoleView{
		ID:             role.ID,
		Name:           role.Name,
		Description:    role.Description,
		IsSystem:       role.IsSystem,
		PermissionKeys: body.PermissionKeys,
	})
}

func (h *RoleHandler) Update(w http.ResponseWriter, r *http.Request) {
	tenantID, _ := appctx.TenantID(r.Context())
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "invalid id")
		return
	}
	role, err := h.Store.Queries.GetRoleByID(r.Context(), db.GetRoleByIDParams{ID: id, TenantID: tenantID})
	if err != nil {
		httpx.Error(w, http.StatusNotFound, "role not found")
		return
	}
	var body struct {
		PermissionKeys *[]string `json:"permission_keys"`
	}
	if err := httpx.Decode(r, &body); err != nil {
		httpx.Error(w, http.StatusBadRequest, "invalid body")
		return
	}
	if body.PermissionKeys != nil {
		if err := h.Store.Queries.ClearRolePermissions(r.Context(), role.ID); err != nil {
			httpx.Error(w, http.StatusInternalServerError, "could not update permissions")
			return
		}
		for _, key := range *body.PermissionKeys {
			_ = h.Store.Queries.AddPermissionToRole(r.Context(), db.AddPermissionToRoleParams{RoleID: role.ID, PermissionKey: key})
		}
	}
	keys, _ := h.Store.Queries.ListRolePermissionKeys(r.Context(), role.ID)
	httpx.JSON(w, http.StatusOK, RoleView{
		ID:             role.ID,
		Name:           role.Name,
		Description:    role.Description,
		IsSystem:       role.IsSystem,
		PermissionKeys: keys,
	})
}
