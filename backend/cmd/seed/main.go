// Command seed creates a demo tenant with an Owner user and a platform
// admin account, so the app has something to log into right after
// `docker compose up`.
package main

import (
	"context"
	"log"
	"os"

	"github.com/jackc/pgx/v5/pgtype"

	"mojacrm/backend/internal/auth"
	"mojacrm/backend/internal/config"
	"mojacrm/backend/internal/database"
	"mojacrm/backend/internal/database/db"
	"mojacrm/backend/internal/rbac"
)

const (
	demoTenantName = "Acme Inc"
	demoTenantSlug = "acme"
	demoOwnerEmail = "owner@acme.test"
	demoOwnerName  = "Ada Owner"
	demoOwnerPass  = "password123"
)

// The platform admin's identity is overridable via env vars so production
// can seed a real account instead of the demo one; SEED_DEMO_TENANT lets
// production skip the fake Acme tenant entirely.
func main() {
	cfg := config.Load()
	ctx := context.Background()

	platformEmail := getenv("PLATFORM_ADMIN_EMAIL", "admin@mojacrm.test")
	platformName := getenv("PLATFORM_ADMIN_NAME", "Platform Admin")
	platformPass := getenv("PLATFORM_ADMIN_PASSWORD", "password123")
	seedDemoTenant := getenv("SEED_DEMO_TENANT", "true") == "true"

	store, err := database.New(ctx, cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("connect: %v", err)
	}
	defer store.Close()

	if err := store.Migrate(ctx); err != nil {
		log.Fatalf("migrate: %v", err)
	}

	if !seedDemoTenant {
		log.Println("SEED_DEMO_TENANT=false, skipping demo tenant seed")
	} else if _, err := store.Queries.GetTenantBySlug(ctx, demoTenantSlug); err == nil {
		log.Println("demo tenant already exists, skipping tenant seed")
	} else {
		seedTenant(ctx, store)
	}

	if _, err := store.Queries.GetPlatformAdminByEmail(ctx, platformEmail); err == nil {
		log.Println("platform admin already exists, skipping")
	} else {
		hash, err := auth.HashPassword(platformPass)
		if err != nil {
			log.Fatalf("hash: %v", err)
		}
		if _, err := store.Queries.CreatePlatformAdmin(ctx, db.CreatePlatformAdminParams{
			Email:        platformEmail,
			Name:         platformName,
			PasswordHash: hash,
		}); err != nil {
			log.Fatalf("create platform admin: %v", err)
		}
		log.Printf("created platform admin %s / %s", platformEmail, platformPass)
	}
}

func getenv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func seedTenant(ctx context.Context, store *database.Store) {
	tenant, err := store.Queries.CreateTenant(ctx, db.CreateTenantParams{Name: demoTenantName, Slug: demoTenantSlug, Plan: "pro"})
	if err != nil {
		log.Fatalf("create tenant: %v", err)
	}

	ownerRole, err := store.Queries.CreateRole(ctx, db.CreateRoleParams{TenantID: tenant.ID, Name: rbac.RoleOwner, Description: "Full access to everything", IsSystem: true})
	if err != nil {
		log.Fatalf("create owner role: %v", err)
	}
	for _, key := range rbac.AllPermissions {
		if err := store.Queries.AddPermissionToRole(ctx, db.AddPermissionToRoleParams{RoleID: ownerRole.ID, PermissionKey: key}); err != nil {
			log.Fatalf("grant permission: %v", err)
		}
	}

	adminRole, err := store.Queries.CreateRole(ctx, db.CreateRoleParams{TenantID: tenant.ID, Name: rbac.RoleAdmin, Description: "Manage the workspace", IsSystem: true})
	if err == nil {
		for _, key := range rbac.AdminPermissions {
			_ = store.Queries.AddPermissionToRole(ctx, db.AddPermissionToRoleParams{RoleID: adminRole.ID, PermissionKey: key})
		}
	}
	memberRole, err := store.Queries.CreateRole(ctx, db.CreateRoleParams{TenantID: tenant.ID, Name: rbac.RoleMember, Description: "Standard workspace member", IsSystem: true})
	if err == nil {
		for _, key := range rbac.MemberPermissions {
			_ = store.Queries.AddPermissionToRole(ctx, db.AddPermissionToRoleParams{RoleID: memberRole.ID, PermissionKey: key})
		}
	}

	hash, err := auth.HashPassword(demoOwnerPass)
	if err != nil {
		log.Fatalf("hash: %v", err)
	}
	if _, err := store.Queries.CreateUser(ctx, db.CreateUserParams{
		TenantID:     tenant.ID,
		RoleID:       pgtype.UUID{Bytes: ownerRole.ID, Valid: true},
		Email:        demoOwnerEmail,
		Name:         demoOwnerName,
		PasswordHash: hash,
		Status:       "active",
	}); err != nil {
		log.Fatalf("create owner user: %v", err)
	}
	log.Printf("created demo tenant %q with owner %s / %s", demoTenantName, demoOwnerEmail, demoOwnerPass)
}
