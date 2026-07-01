package handlers

import (
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"

	"mojacrm/backend/internal/database/db"
)

type UserView struct {
	ID        uuid.UUID `json:"id"`
	Email     string    `json:"email"`
	Name      string    `json:"name"`
	RoleID    string    `json:"role_id,omitempty"`
	RoleName  string    `json:"role_name,omitempty"`
	Status    string    `json:"status"`
	AvatarURL string    `json:"avatar_url,omitempty"`
	CreatedAt time.Time `json:"created_at"`
}

func userView(u db.User) UserView {
	v := UserView{
		ID:        u.ID,
		Email:     u.Email,
		Name:      u.Name,
		Status:    u.Status,
		CreatedAt: u.CreatedAt,
	}
	if u.RoleID.Valid {
		v.RoleID = uuid.UUID(u.RoleID.Bytes).String()
	}
	if u.AvatarUrl != nil {
		v.AvatarURL = *u.AvatarUrl
	}
	return v
}

func userWithRoleView(id uuid.UUID, tenantID uuid.UUID, roleID pgtype.UUID, email, name, status string, avatarURL *string, createdAt time.Time, roleName *string) UserView {
	v := UserView{ID: id, Email: email, Name: name, Status: status, CreatedAt: createdAt}
	if roleID.Valid {
		v.RoleID = uuid.UUID(roleID.Bytes).String()
	}
	if avatarURL != nil {
		v.AvatarURL = *avatarURL
	}
	if roleName != nil {
		v.RoleName = *roleName
	}
	_ = tenantID
	return v
}

func listUsersWithRoleView(rows []db.ListUsersWithRoleRow) []UserView {
	out := make([]UserView, 0, len(rows))
	for _, r := range rows {
		out = append(out, userWithRoleView(r.ID, r.TenantID, r.RoleID, r.Email, r.Name, r.Status, r.AvatarUrl, r.CreatedAt, r.RoleName))
	}
	return out
}

type RoleView struct {
	ID             uuid.UUID `json:"id"`
	Name           string    `json:"name"`
	Description    string    `json:"description"`
	IsSystem       bool      `json:"is_system"`
	PermissionKeys []string  `json:"permission_keys"`
}

type TenantView struct {
	ID        uuid.UUID `json:"id"`
	Name      string    `json:"name"`
	Slug      string    `json:"slug"`
	Status    string    `json:"status"`
	Plan      string    `json:"plan"`
	CreatedAt time.Time `json:"created_at"`
}

func tenantView(t db.Tenant) TenantView {
	return TenantView{ID: t.ID, Name: t.Name, Slug: t.Slug, Status: t.Status, Plan: t.Plan, CreatedAt: t.CreatedAt}
}

type PlatformAdminView struct {
	ID        uuid.UUID `json:"id"`
	Email     string    `json:"email"`
	Name      string    `json:"name"`
	Status    string    `json:"status"`
	CreatedAt time.Time `json:"created_at"`
}

func platformAdminView(a db.PlatformAdmin) PlatformAdminView {
	return PlatformAdminView{ID: a.ID, Email: a.Email, Name: a.Name, Status: a.Status, CreatedAt: a.CreatedAt}
}
