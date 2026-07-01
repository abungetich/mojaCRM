package handlers

import (
	"context"
	"fmt"
	"net/http"
	"regexp"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"

	authpkg "mojacrm/backend/internal/auth"
	"mojacrm/backend/internal/database/db"
	"mojacrm/backend/internal/httpx"
	"mojacrm/backend/internal/jobs"
	"mojacrm/backend/internal/rbac"
)

const verificationTTL = 24 * time.Hour

type AuthHandler struct{ Deps }

func NewAuthHandler(d Deps) *AuthHandler { return &AuthHandler{d} }

type sessionResponse struct {
	Session sessionView `json:"session"`
}

// signupResponse is returned instead of a session: signup no longer logs
// the user in immediately, it requires an email-verification step first.
// There is no real mailer wired up yet, so the verification link is
// simulated: it's logged server-side (see internal/jobs) and also handed
// back in this response so the frontend can surface it directly.
type signupResponse struct {
	Status          string `json:"status"`
	Email           string `json:"email"`
	VerificationURL string `json:"verification_url"`
}

type sessionView struct {
	Kind        string      `json:"kind"`
	User        UserView    `json:"user"`
	Tenant      *TenantView `json:"tenant,omitempty"`
	Permissions []string    `json:"permissions"`
}

var slugRe = regexp.MustCompile(`[^a-z0-9]+`)

func slugify(name string) string {
	s := slugRe.ReplaceAllString(strings.ToLower(name), "-")
	return strings.Trim(s, "-")
}

// Signup creates a brand new tenant workspace with an Owner user who is
// granted every permission in the catalog.
func (h *AuthHandler) Signup(w http.ResponseWriter, r *http.Request) {
	var body struct {
		WorkspaceName string `json:"workspace_name"`
		Name          string `json:"name"`
		Email         string `json:"email"`
		Password      string `json:"password"`
	}
	if err := httpx.Decode(r, &body); err != nil {
		httpx.Error(w, http.StatusBadRequest, "invalid body")
		return
	}
	if body.WorkspaceName == "" || body.Name == "" || body.Email == "" || len(body.Password) < 8 {
		httpx.Error(w, http.StatusBadRequest, "missing or invalid fields")
		return
	}

	ctx := r.Context()
	tx, err := h.Store.Pool.Begin(ctx)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "could not start transaction")
		return
	}
	defer tx.Rollback(ctx)
	q := h.Store.Queries.WithTx(tx)

	slug := slugify(body.WorkspaceName)
	if slug == "" {
		slug = "workspace"
	}
	tenant, err := q.CreateTenant(ctx, db.CreateTenantParams{Name: body.WorkspaceName, Slug: slug, Plan: "free"})
	if err != nil {
		httpx.Error(w, http.StatusConflict, "workspace slug already taken")
		return
	}

	ownerRole, err := q.CreateRole(ctx, db.CreateRoleParams{TenantID: tenant.ID, Name: rbac.RoleOwner, Description: "Full access to everything", IsSystem: true})
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "could not create owner role")
		return
	}
	for _, key := range rbac.AllPermissions {
		_ = q.AddPermissionToRole(ctx, db.AddPermissionToRoleParams{RoleID: ownerRole.ID, PermissionKey: key})
	}

	adminRole, err := q.CreateRole(ctx, db.CreateRoleParams{TenantID: tenant.ID, Name: rbac.RoleAdmin, Description: "Manage the workspace", IsSystem: true})
	if err == nil {
		for _, key := range rbac.AdminPermissions {
			_ = q.AddPermissionToRole(ctx, db.AddPermissionToRoleParams{RoleID: adminRole.ID, PermissionKey: key})
		}
	}
	memberRole, err := q.CreateRole(ctx, db.CreateRoleParams{TenantID: tenant.ID, Name: rbac.RoleMember, Description: "Standard workspace member", IsSystem: true})
	if err == nil {
		for _, key := range rbac.MemberPermissions {
			_ = q.AddPermissionToRole(ctx, db.AddPermissionToRoleParams{RoleID: memberRole.ID, PermissionKey: key})
		}
	}

	hash, err := authpkg.HashPassword(body.Password)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "could not hash password")
		return
	}
	user, err := q.CreateUser(ctx, db.CreateUserParams{
		TenantID:     tenant.ID,
		RoleID:       pgtype.UUID{Bytes: ownerRole.ID, Valid: true},
		Email:        strings.ToLower(body.Email),
		Name:         body.Name,
		PasswordHash: hash,
		Status:       "pending_verification",
	})
	if err != nil {
		httpx.Error(w, http.StatusConflict, "email already in use")
		return
	}

	verificationToken, err := authpkg.NewVerificationToken()
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "could not create verification token")
		return
	}
	if err := q.SetVerificationToken(ctx, db.SetVerificationTokenParams{
		ID:                    user.ID,
		VerificationToken:     &verificationToken,
		VerificationExpiresAt: pgtype.Timestamptz{Time: time.Now().Add(verificationTTL), Valid: true},
	}); err != nil {
		httpx.Error(w, http.StatusInternalServerError, "could not set verification token")
		return
	}

	if err := tx.Commit(ctx); err != nil {
		httpx.Error(w, http.StatusInternalServerError, "could not commit transaction")
		return
	}

	verificationURL := fmt.Sprintf("%s/verify-email?token=%s", h.FrontendURL, verificationToken)
	if h.Jobs != nil {
		if task, err := jobs.NewVerificationEmailTask(user.Email, user.Name, verificationURL); err == nil {
			_, _ = h.Jobs.Enqueue(task)
		}
	}

	httpx.JSON(w, http.StatusCreated, signupResponse{
		Status:          "verification_required",
		Email:           user.Email,
		VerificationURL: verificationURL,
	})
}

// VerifyEmail simulates clicking the link from a verification email:
// activates the pending user and starts their session.
func (h *AuthHandler) VerifyEmail(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Token string `json:"token"`
	}
	if err := httpx.Decode(r, &body); err != nil || body.Token == "" {
		httpx.Error(w, http.StatusBadRequest, "invalid body")
		return
	}
	ctx := r.Context()

	user, err := h.Store.Queries.GetUserByVerificationToken(ctx, &body.Token)
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "invalid or expired verification link")
		return
	}
	if !user.VerificationExpiresAt.Valid || user.VerificationExpiresAt.Time.Before(time.Now()) {
		httpx.Error(w, http.StatusBadRequest, "invalid or expired verification link")
		return
	}

	user, err = h.Store.Queries.MarkUserVerified(ctx, user.ID)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "could not verify email")
		return
	}

	if h.Jobs != nil {
		if task, err := jobs.NewWelcomeEmailTask(user.Email, user.Name); err == nil {
			_, _ = h.Jobs.Enqueue(task)
		}
	}

	token, err := authpkg.GenerateToken(h.JWTSecret, user.ID, user.TenantID, false)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "could not create session")
		return
	}
	authpkg.SetSessionCookie(w, token, h.CookieDomain, h.CookieSecure)

	session, err := h.buildTenantSession(ctx, user.ID)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "could not load session")
		return
	}
	httpx.JSON(w, http.StatusOK, sessionResponse{Session: *session})
}

// Login authenticates a tenant user by email + password.
func (h *AuthHandler) Login(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Email    string `json:"email"`
		Password string `json:"password"`
	}
	if err := httpx.Decode(r, &body); err != nil {
		httpx.Error(w, http.StatusBadRequest, "invalid body")
		return
	}
	ctx := r.Context()
	user, err := h.Store.Queries.GetUserByEmailAnyTenant(ctx, strings.ToLower(body.Email))
	if err != nil || !authpkg.CheckPassword(user.PasswordHash, body.Password) {
		httpx.Error(w, http.StatusUnauthorized, "invalid credentials")
		return
	}
	if user.Status == "pending_verification" {
		httpx.Error(w, http.StatusForbidden, "please verify your email before signing in")
		return
	}

	token, err := authpkg.GenerateToken(h.JWTSecret, user.ID, user.TenantID, false)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "could not create session")
		return
	}
	authpkg.SetSessionCookie(w, token, h.CookieDomain, h.CookieSecure)

	session, err := h.buildTenantSession(ctx, user.ID)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "could not load session")
		return
	}
	httpx.JSON(w, http.StatusOK, sessionResponse{Session: *session})
}

// PlatformLogin authenticates a platform admin by email + password.
func (h *AuthHandler) PlatformLogin(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Email    string `json:"email"`
		Password string `json:"password"`
	}
	if err := httpx.Decode(r, &body); err != nil {
		httpx.Error(w, http.StatusBadRequest, "invalid body")
		return
	}
	ctx := r.Context()
	admin, err := h.Store.Queries.GetPlatformAdminByEmail(ctx, strings.ToLower(body.Email))
	if err != nil || !authpkg.CheckPassword(admin.PasswordHash, body.Password) {
		httpx.Error(w, http.StatusUnauthorized, "invalid credentials")
		return
	}
	token, err := authpkg.GenerateToken(h.JWTSecret, admin.ID, uuid.Nil, true)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "could not create session")
		return
	}
	authpkg.SetSessionCookie(w, token, h.CookieDomain, h.CookieSecure)

	httpx.JSON(w, http.StatusOK, sessionResponse{Session: sessionView{
		Kind:        "platform",
		User:        UserView{ID: admin.ID, Email: admin.Email, Name: admin.Name, Status: admin.Status, CreatedAt: admin.CreatedAt},
		Permissions: []string{"*"},
	}})
}

func (h *AuthHandler) Logout(w http.ResponseWriter, r *http.Request) {
	authpkg.ClearSessionCookie(w, h.CookieDomain, h.CookieSecure)
	httpx.JSON(w, http.StatusOK, map[string]bool{"ok": true})
}

// Me reads the session cookie directly (rather than via middleware) so it
// can serve both tenant users and platform admins from one endpoint.
func (h *AuthHandler) Me(w http.ResponseWriter, r *http.Request) {
	raw, ok := authpkg.ReadSessionCookie(r)
	if !ok {
		httpx.Error(w, http.StatusUnauthorized, "unauthenticated")
		return
	}
	claims, err := authpkg.ParseToken(h.JWTSecret, raw)
	if err != nil {
		httpx.Error(w, http.StatusUnauthorized, "unauthenticated")
		return
	}
	ctx := r.Context()

	if claims.IsPlatform {
		admin, err := h.Store.Queries.GetPlatformAdminByID(ctx, claims.UserID)
		if err != nil {
			httpx.Error(w, http.StatusUnauthorized, "unauthenticated")
			return
		}
		httpx.JSON(w, http.StatusOK, sessionView{
			Kind:        "platform",
			User:        UserView{ID: admin.ID, Email: admin.Email, Name: admin.Name, Status: admin.Status, CreatedAt: admin.CreatedAt},
			Permissions: []string{"*"},
		})
		return
	}

	session, err := h.buildTenantSession(ctx, claims.UserID)
	if err != nil {
		httpx.Error(w, http.StatusUnauthorized, "unauthenticated")
		return
	}
	httpx.JSON(w, http.StatusOK, session)
}

func (h *AuthHandler) buildTenantSession(ctx context.Context, userID uuid.UUID) (*sessionView, error) {
	row, err := h.Store.Queries.GetUserWithRoleByID(ctx, userID)
	if err != nil {
		return nil, err
	}
	tenant, err := h.Store.Queries.GetTenantByID(ctx, row.TenantID)
	if err != nil {
		return nil, err
	}
	keys, err := h.Store.Queries.GetUserPermissionKeys(ctx, userID)
	if err != nil {
		return nil, err
	}
	uv := userWithRoleView(row.ID, row.TenantID, row.RoleID, row.Email, row.Name, row.Status, row.AvatarUrl, row.CreatedAt, row.RoleName)
	tv := tenantView(tenant)
	return &sessionView{Kind: "tenant", User: uv, Tenant: &tv, Permissions: keys}, nil
}
