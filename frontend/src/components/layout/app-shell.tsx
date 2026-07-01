import { useEffect, useState, type ReactNode } from "react"
import {
  ChevronDown,
  LogOut,
  Menu,
  PanelLeft,
  ShieldCheck,
  User,
  type LucideIcon,
} from "lucide-react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

export interface NavItem {
  label: string
  icon: LucideIcon
  onClick?: () => void
  active?: boolean
  badge?: string | number
  children?: NavItem[]
}
export interface NavGroup {
  title?: string
  items: NavItem[]
}

interface AppShellProps {
  appName: string
  appTagline?: string
  logoUrl?: string
  iconUrl?: string
  shortName?: string
  badge?: string
  nav: NavGroup[]
  header?: ReactNode
  statusLabel?: string
  user?: { name: string; email: string; role?: string; avatarUrl?: string }
  onLogout?: () => void
  onProfile?: () => void
  children: ReactNode
}

const COLLAPSE_KEY = "mojacrm.sidebar.collapsed"

export function AppShell({
  appName,
  appTagline,
  logoUrl,
  iconUrl,
  shortName,
  badge,
  nav,
  header,
  statusLabel,
  user,
  onLogout,
  onProfile,
  children,
}: AppShellProps) {
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem(COLLAPSE_KEY) === "1")
  const [mobileOpen, setMobileOpen] = useState(false)
  const [closedGroups, setClosedGroups] = useState<Set<number>>(new Set())
  const [navOpen, setNavOpen] = useState<Record<string, boolean>>({})

  useEffect(() => {
    localStorage.setItem(COLLAPSE_KEY, collapsed ? "1" : "0")
  }, [collapsed])

  const initials = (user?.name || user?.email || "?")
    .split(" ")
    .map((s) => s[0])
    .slice(0, 2)
    .join("")
    .toUpperCase()

  const toggleGroup = (i: number) =>
    setClosedGroups((prev) => {
      const next = new Set(prev)
      next.has(i) ? next.delete(i) : next.add(i)
      return next
    })

  const mark = iconUrl || logoUrl
  const BrandMark = () =>
    mark ? (
      <img src={mark} alt={appName} className="size-9 shrink-0 rounded-xl object-contain" />
    ) : (
      <div className="brand-mark flex size-9 shrink-0 items-center justify-center rounded-xl text-sm font-bold text-white">
        {(shortName || appName).slice(0, 2).toUpperCase()}
      </div>
    )

  return (
    <div className="bg-background flex h-svh overflow-hidden">
      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-black/40 lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "bg-sidebar text-sidebar-foreground border-sidebar-border fixed inset-y-0 left-0 z-50 flex flex-col border-r transition-all duration-200 lg:static",
          collapsed ? "w-[4.5rem]" : "w-72",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Brand */}
        <div className="flex items-center gap-3 px-4 py-4">
          <BrandMark />
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="truncate text-sm font-semibold leading-tight">{appName}</span>
                {badge && (
                  <span className="bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400 rounded-full px-2 py-0.5 text-[10px] font-medium">
                    {badge}
                  </span>
                )}
              </div>
              {appTagline && <div className="text-muted-foreground truncate text-xs">{appTagline}</div>}
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 space-y-2 overflow-y-auto px-3 py-2">
          {nav.map((group, gi) => {
            const closed = closedGroups.has(gi)
            return (
              <div key={gi} className="space-y-1">
                {group.title && !collapsed && (
                  <button
                    onClick={() => toggleGroup(gi)}
                    className="text-muted-foreground hover:text-foreground flex w-full items-center justify-between px-2 py-1.5 text-[11px] font-semibold tracking-wider uppercase"
                  >
                    {group.title}
                    <ChevronDown className={cn("size-3.5 transition-transform", closed && "-rotate-90")} />
                  </button>
                )}
                {(!closed || collapsed) &&
                  group.items.map((item) => {
                    const hasChildren = !collapsed && !!item.children?.length
                    const autoOpen = hasChildren && (item.active || item.children!.some((c) => c.active))
                    const isOpen = hasChildren && (navOpen[item.label] ?? autoOpen)
                    const btn = (
                      <button
                        key={item.label}
                        onClick={() => {
                          if (hasChildren) {
                            const willOpen = !isOpen
                            setNavOpen((p) => ({ ...p, [item.label]: willOpen }))
                            if (willOpen) item.onClick?.()
                          } else {
                            item.onClick?.()
                            setMobileOpen(false)
                          }
                        }}
                        className={cn(
                          "group relative flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                          collapsed && "justify-center px-0",
                          item.active
                            ? "border-sidebar-ring/40 bg-sidebar-accent text-sidebar-primary border font-medium"
                            : "text-sidebar-foreground hover:bg-sidebar-accent/60"
                        )}
                      >
                        {item.active && (
                          <span className="bg-sidebar-primary absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r" />
                        )}
                        <item.icon className={cn("size-4 shrink-0", item.active && "text-sidebar-primary")} />
                        {!collapsed && <span className="flex-1 text-left">{item.label}</span>}
                        {!collapsed && item.badge != null && (
                          <span className="bg-sidebar-accent text-sidebar-accent-foreground rounded-full px-1.5 text-xs">
                            {item.badge}
                          </span>
                        )}
                        {hasChildren && (
                          <ChevronDown
                            className={cn("size-3.5 shrink-0 transition-transform", !isOpen && "-rotate-90")}
                            onClick={(e) => {
                              e.stopPropagation()
                              setNavOpen((p) => ({ ...p, [item.label]: !isOpen }))
                            }}
                          />
                        )}
                      </button>
                    )
                    const wrapped = collapsed ? (
                      <Tooltip key={item.label}>
                        <TooltipTrigger render={btn} />
                        <TooltipContent side="right">{item.label}</TooltipContent>
                      </Tooltip>
                    ) : (
                      btn
                    )
                    if (!hasChildren) return wrapped
                    return (
                      <div key={item.label}>
                        {wrapped}
                        {isOpen && (
                          <div className="border-sidebar-border mt-1 ml-5 space-y-1 border-l pl-2">
                            {item.children!.map((child) => (
                              <button
                                key={child.label}
                                onClick={() => {
                                  child.onClick?.()
                                  setMobileOpen(false)
                                }}
                                className={cn(
                                  "flex w-full items-center gap-2.5 rounded-lg px-3 py-1.5 text-sm transition-colors",
                                  child.active
                                    ? "bg-sidebar-accent text-sidebar-primary font-medium"
                                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60"
                                )}
                              >
                                <child.icon className={cn("size-3.5 shrink-0", child.active && "text-sidebar-primary")} />
                                <span className="flex-1 text-left">{child.label}</span>
                                {child.badge != null && (
                                  <span className="bg-sidebar-accent text-sidebar-accent-foreground rounded-full px-1.5 text-xs">
                                    {child.badge}
                                  </span>
                                )}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  })}
              </div>
            )
          })}
        </nav>

        {/* Footer user card */}
        {user && !collapsed && (
          <div className="p-3">
            <div className="bg-card border-sidebar-border rounded-xl border p-3">
              {statusLabel && (
                <div className="text-muted-foreground mb-1 text-[10px] font-semibold tracking-wider uppercase">
                  {statusLabel}
                </div>
              )}
              <div className="mb-2 truncate text-sm font-medium">{user.name || user.email}</div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="flex-1" onClick={onProfile}>
                  <User /> Account
                </Button>
                {onLogout && (
                  <Button variant="outline" size="sm" className="flex-1" onClick={onLogout}>
                    <LogOut /> Log out
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
        {user && collapsed && (
          <div className="flex flex-col items-center gap-2 p-3">
            <Avatar className="size-8">
              {user.avatarUrl && <AvatarImage src={user.avatarUrl} />}
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            {onLogout && (
              <Button variant="ghost" size="icon" onClick={onLogout} aria-label="Sign out"><LogOut /></Button>
            )}
          </div>
        )}
      </aside>

      {/* Right column */}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <header className="app-header border-border sticky top-0 z-30 flex h-16 items-center gap-3 border-b px-4">
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setMobileOpen(true)} aria-label="Open menu">
            <Menu />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="hidden lg:inline-flex"
            onClick={() => setCollapsed((c) => !c)}
            aria-label="Toggle sidebar"
          >
            <PanelLeft />
          </Button>

          <div className="hidden items-center gap-2 sm:flex">
            <ShieldCheck className="text-primary size-4" />
            <span className="text-sm font-semibold">{appName}</span>
          </div>

          <div className="flex-1" />
          {header}
          {user && (
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <button className="ring-background rounded-full ring-2" aria-label="Account menu">
                    <Avatar className="size-9">
                      {user.avatarUrl && <AvatarImage src={user.avatarUrl} />}
                      <AvatarFallback>{initials}</AvatarFallback>
                    </Avatar>
                  </button>
                }
              />
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuLabel>
                  <div className="truncate font-medium">{user.name || user.email}</div>
                  <div className="text-muted-foreground truncate text-xs font-normal">{user.email}</div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {onProfile && <DropdownMenuItem onClick={onProfile}><User /> Profile</DropdownMenuItem>}
                {onLogout && <DropdownMenuItem variant="destructive" onClick={onLogout}><LogOut /> Log out</DropdownMenuItem>}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </header>

        <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  )
}
