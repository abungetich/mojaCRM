package appctx

import (
	"context"

	"github.com/google/uuid"
)

type ctxKey string

const (
	userIDKey     ctxKey = "user_id"
	tenantIDKey   ctxKey = "tenant_id"
	adminIDKey    ctxKey = "admin_id"
	isPlatformKey ctxKey = "is_platform"
)

func WithUser(ctx context.Context, userID uuid.UUID) context.Context {
	return context.WithValue(ctx, userIDKey, userID)
}

func UserID(ctx context.Context) (uuid.UUID, bool) {
	v, ok := ctx.Value(userIDKey).(uuid.UUID)
	return v, ok
}

func WithTenant(ctx context.Context, tenantID uuid.UUID) context.Context {
	return context.WithValue(ctx, tenantIDKey, tenantID)
}

func TenantID(ctx context.Context) (uuid.UUID, bool) {
	v, ok := ctx.Value(tenantIDKey).(uuid.UUID)
	return v, ok
}

func WithPlatformAdmin(ctx context.Context, adminID uuid.UUID) context.Context {
	ctx = context.WithValue(ctx, adminIDKey, adminID)
	return context.WithValue(ctx, isPlatformKey, true)
}

func PlatformAdminID(ctx context.Context) (uuid.UUID, bool) {
	v, ok := ctx.Value(adminIDKey).(uuid.UUID)
	return v, ok
}

func IsPlatform(ctx context.Context) bool {
	v, _ := ctx.Value(isPlatformKey).(bool)
	return v
}
