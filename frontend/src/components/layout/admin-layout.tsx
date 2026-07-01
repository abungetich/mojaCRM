import { Building2, CreditCard, LayoutDashboard, Settings, Users } from "lucide-react"
import { Navigate, Outlet, useLocation, useNavigate } from "react-router-dom"

import { AppShell, type NavGroup } from "@/components/layout/app-shell"
import { PageLoader } from "@/components/ui/spinner"
import { useAuth } from "@/lib/auth"
import { useBranding } from "@/hooks/use-branding"

export function AdminLayout() {
  const { session, loading, logout } = useAuth()
  const { data: branding } = useBranding()
  const navigate = useNavigate()
  const { pathname } = useLocation()

  if (loading) {
    return <div className="flex min-h-svh items-center justify-center"><PageLoader /></div>
  }
  if (!session || session.kind !== "platform") return <Navigate to="/login" replace />

  const item = (label: string, icon: NavGroup["items"][number]["icon"], path: string) => ({
    label,
    icon,
    active: path === "/admin" ? pathname === "/admin" : pathname.startsWith(path),
    onClick: () => navigate(path),
  })

  const groups: NavGroup[] = [
    { items: [item("Dashboard", LayoutDashboard, "/admin")] },
    {
      title: "Customers",
      items: [
        item("Tenants", Building2, "/admin/tenants"),
        item("Plans & Billing", CreditCard, "/admin/plans"),
      ],
    },
    {
      title: "System",
      items: [
        item("Platform Team", Users, "/admin/team"),
        item("Settings", Settings, "/admin/settings"),
      ],
    },
  ]

  return (
    <AppShell
      appName={branding?.app_name ?? "MojaCRM"}
      appTagline={branding?.tagline ?? "Platform console"}
      logoUrl={branding?.logo_url}
      iconUrl={branding?.icon_url}
      shortName={(branding?.app_name ?? "MojaCRM").slice(0, 2).toUpperCase()}
      badge="Admin"
      statusLabel="Platform access"
      nav={groups}
      user={{ name: session.user.name, email: session.user.email, avatarUrl: session.user.avatar_url }}
      onLogout={logout}
      onProfile={() => navigate("/admin/profile")}
    >
      <Outlet />
    </AppShell>
  )
}
