import {
  BookUser,
  Building2,
  CalendarClock,
  FileText,
  Gavel,
  Handshake,
  Inbox,
  KanbanSquare,
  LandPlot,
  LayoutDashboard,
  ListTodo,
  Settings,
  ShieldCheck,
  Users as UsersIcon,
} from "lucide-react"
import { Navigate, Outlet, useLocation, useNavigate } from "react-router-dom"

import { AppShell, type NavGroup } from "@/components/layout/app-shell"
import { PageLoader } from "@/components/ui/spinner"
import { useAuth } from "@/lib/auth"

export function TenantLayout() {
  const { session, loading, logout, hasPermission } = useAuth()
  const navigate = useNavigate()
  const { pathname } = useLocation()

  if (loading) {
    return <div className="flex min-h-svh items-center justify-center"><PageLoader /></div>
  }
  if (!session || session.kind !== "tenant") return <Navigate to="/login" replace />

  const item = (label: string, icon: NavGroup["items"][number]["icon"], path: string, perm?: string) => ({
    label,
    icon,
    active: path === "/" ? pathname === "/" : pathname.startsWith(path),
    onClick: () => navigate(path),
    _show: !perm || hasPermission(perm),
  })

  const canSeeSettings = ["settings:read", "users:read", "roles:read"].some(hasPermission)

  const groups: NavGroup[] = [
    { items: [item("Dashboard", LayoutDashboard, "/")] },
    {
      title: "CRM",
      items: [
        item("Directory", BookUser, "/customers", "customers:read"),
        item("Clients", Building2, "/clients", "clients:read"),
        item("Partners", Handshake, "/partners", "partners:read"),
        item("Tenders", Gavel, "/tenders", "tenders:read"),
        item("Comparables", LandPlot, "/comparables", "comparables:read"),
        item("Calendar", CalendarClock, "/calendar", "inspections:read"),
        item("Communications", Inbox, "/communications", "communications:read"),
        item("Pipeline", KanbanSquare, "/pipeline", "deals:read"),
        item("Tasks", ListTodo, "/tasks", "tasks:read"),
      ].filter((i) => i._show),
    },
    {
      title: "System",
      items: [
        { ...item("Users", UsersIcon, "/users"), _show: hasPermission("users:read") },
        { ...item("Roles & Permissions", ShieldCheck, "/roles"), _show: hasPermission("roles:read") },
        item("Document Vault", FileText, "/documents", "documents:read"),
        { ...item("Settings", Settings, "/settings"), _show: canSeeSettings },
      ].filter((i) => i._show),
    },
  ]

  return (
    <AppShell
      appName={session.tenant?.name ?? "MojaCRM"}
      appTagline="Your workspace"
      shortName={(session.tenant?.name ?? "MC").slice(0, 2).toUpperCase()}
      badge="Protected"
      statusLabel="Workspace active"
      nav={groups}
      user={{ name: session.user.name, email: session.user.email, avatarUrl: session.user.avatar_url }}
      onLogout={logout}
      onProfile={() => navigate("/profile")}
    >
      <Outlet />
    </AppShell>
  )
}
