// Package rbac defines the default tenant roles and their permission sets.
// These are created automatically for every new tenant at registration time.
package rbac

const (
	RoleOwner  = "Owner"
	RoleAdmin  = "Admin"
	RoleMember = "Member"
)

// AllPermissions is the full permission catalog (kept in sync with the
// permissions table seeded by migration 0001_init).
var AllPermissions = []string{
	"users:read", "users:write",
	"roles:read", "roles:write",
	"customers:read", "customers:write", "customers:delete",
	"communications:read", "communications:write",
	"deals:read", "deals:write",
	"tasks:read", "tasks:write",
	"settings:read", "settings:write",
	"clients:read", "clients:write", "clients:delete",
	"partners:read", "partners:write", "partners:delete",
	"documents:read", "documents:write", "documents:delete",
	"tenders:read", "tenders:write",
	"departments:read", "departments:write",
	"archive:read", "archive:write",
	"comparables:read", "comparables:write",
	"inspections:read", "inspections:write",
}

// AdminPermissions is granted to the Admin system role. (Owner always gets
// every permission via the wildcard "*" check in the auth layer.)
var AdminPermissions = []string{
	"users:read", "users:write",
	"roles:read", "roles:write",
	"customers:read", "customers:write", "customers:delete",
	"communications:read", "communications:write",
	"deals:read", "deals:write",
	"tasks:read", "tasks:write",
	"settings:read", "settings:write",
	"clients:read", "clients:write", "clients:delete",
	"partners:read", "partners:write", "partners:delete",
	"documents:read", "documents:write", "documents:delete",
	"tenders:read", "tenders:write",
	"departments:read", "departments:write",
	"archive:read", "archive:write",
	"comparables:read", "comparables:write",
	"inspections:read", "inspections:write",
}

// MemberPermissions is granted to the Member system role.
var MemberPermissions = []string{
	"users:read",
	"customers:read", "customers:write",
	"communications:read", "communications:write",
	"deals:read", "deals:write",
	"tasks:read", "tasks:write",
	"clients:read", "clients:write",
	"partners:read", "partners:write",
	"documents:read", "documents:write",
	"tenders:read", "tenders:write",
	"departments:read",
	"comparables:read", "comparables:write",
	"inspections:read", "inspections:write",
}
