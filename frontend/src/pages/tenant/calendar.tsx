import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  Ban,
  Building2,
  Calendar as CalendarIcon,
  Car,
  CheckCircle2,
  Clock,
  LogIn,
  LogOut,
  Mail,
  MoreHorizontal,
  Phone,
} from "lucide-react"
import { useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Skeleton } from "@/components/ui/skeleton"
import { FilterBar, FilterPill } from "@/components/filter-bar"
import { PageHeader } from "@/components/page-header"
import { StatCard, StatsGrid } from "@/components/stat-card"
import { useDebouncedValue } from "@/hooks/use-debounced-value"
import { inspections as inspectionsApi } from "@/lib/api"
import { useAuth } from "@/lib/auth"
import { captureGps, transportModeLabel } from "@/lib/geo"
import type { Inspection, InspectionStatus } from "@/types"

const STATUS_BADGE: Record<InspectionStatus, { label: string; variant: "outline" | "default" | "success" | "destructive" }> = {
  scheduled: { label: "Scheduled", variant: "outline" },
  arrived: { label: "On site", variant: "default" },
  completed: { label: "Completed", variant: "success" },
  cancelled: { label: "Cancelled", variant: "destructive" },
}

function dateKey(iso?: string) {
  return iso ? iso.slice(0, 10) : "unscheduled"
}

function groupLabel(key: string) {
  if (key === "unscheduled") return "Date to be confirmed"
  const date = new Date(`${key}T00:00:00`)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const diffDays = Math.round((date.getTime() - today.getTime()) / 86400000)
  if (diffDays === 0) return "Today"
  if (diffDays === 1) return "Tomorrow"
  if (diffDays === -1) return "Yesterday"
  return date.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long", year: "numeric" })
}

function formatTime(iso?: string) {
  if (!iso) return null
  return new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })
}

export function CalendarPage() {
  const { hasPermission } = useAuth()
  const canWrite = hasPermission("inspections:write")
  const queryClient = useQueryClient()
  const [search, setSearch] = useState("")
  const debouncedSearch = useDebouncedValue(search, 300)
  const [statusFilter, setStatusFilter] = useState<InspectionStatus | "all">("all")

  const query = useQuery({
    queryKey: ["inspections", "all"],
    queryFn: () => inspectionsApi.listAll(),
  })

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["inspections"] })

  const arriveMutation = useMutation({
    mutationFn: async (id: string) => inspectionsApi.arrive(id, await captureGps()),
    onSuccess: () => {
      toast.success("Logged arrival on site")
      invalidate()
    },
    onError: (err: Error) => toast.error(err.message),
  })
  const departMutation = useMutation({
    mutationFn: async (id: string) => inspectionsApi.depart(id, await captureGps()),
    onSuccess: () => {
      toast.success("Visit completed")
      invalidate()
    },
    onError: (err: Error) => toast.error(err.message),
  })
  const cancelMutation = useMutation({
    mutationFn: (id: string) => inspectionsApi.cancel(id),
    onSuccess: () => {
      toast.success("Visit cancelled")
      invalidate()
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const all = query.data ?? []

  const stats = useMemo(() => {
    const todayKey = new Date().toISOString().slice(0, 10)
    return {
      today: all.filter((i) => dateKey(i.scheduled_at) === todayKey && i.status !== "cancelled").length,
      upcoming: all.filter((i) => i.scheduled_at && i.scheduled_at.slice(0, 10) > todayKey && i.status === "scheduled").length,
      onSite: all.filter((i) => i.status === "arrived").length,
      completed: all.filter((i) => i.status === "completed").length,
    }
  }, [all])

  const filtered = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase()
    return all.filter((i) => {
      if (statusFilter !== "all" && i.status !== statusFilter) return false
      if (!q) return true
      return [i.client_name, i.contact_name, i.contact_phone, i.notes]
        .filter(Boolean)
        .some((v) => v!.toLowerCase().includes(q))
    })
  }, [all, statusFilter, debouncedSearch])

  const groups = useMemo(() => {
    const map = new Map<string, Inspection[]>()
    for (const i of filtered) {
      const key = dateKey(i.scheduled_at)
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(i)
    }
    return [...map.entries()].sort(([a], [b]) => {
      if (a === "unscheduled") return 1
      if (b === "unscheduled") return -1
      return a.localeCompare(b)
    })
  }, [filtered])

  const activeCount = (statusFilter !== "all" ? 1 : 0) + (search ? 1 : 0)

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[{ label: "Dashboard", to: "/" }, { label: "Calendar" }]}
        backTo="/"
        title="Calendar"
        description="Field visits scheduled across every client"
      />

      <StatsGrid>
        <StatCard label="Today" value={stats.today} icon={CalendarIcon} tone="primary" loading={query.isLoading} />
        <StatCard label="Upcoming" value={stats.upcoming} icon={Clock} tone="info" loading={query.isLoading} />
        <StatCard label="On site now" value={stats.onSite} icon={LogIn} tone="coral" loading={query.isLoading} />
        <StatCard label="Completed" value={stats.completed} icon={CheckCircle2} tone="green" loading={query.isLoading} />
      </StatsGrid>

      <FilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search client, contact, notes…"
        activeCount={activeCount}
        onClear={() => {
          setSearch("")
          setStatusFilter("all")
        }}
        pills={
          <>
            <FilterPill active={statusFilter === "all"} onClick={() => setStatusFilter("all")}>
              All
            </FilterPill>
            <FilterPill active={statusFilter === "scheduled"} onClick={() => setStatusFilter("scheduled")}>
              Scheduled
            </FilterPill>
            <FilterPill active={statusFilter === "arrived"} onClick={() => setStatusFilter("arrived")}>
              On site
            </FilterPill>
            <FilterPill active={statusFilter === "completed"} onClick={() => setStatusFilter("completed")}>
              Completed
            </FilterPill>
            <FilterPill active={statusFilter === "cancelled"} onClick={() => setStatusFilter("cancelled")}>
              Cancelled
            </FilterPill>
          </>
        }
      />

      {query.isLoading && (
        <div className="space-y-2">
          <Skeleton className="h-24 w-full rounded-lg" />
          <Skeleton className="h-24 w-full rounded-lg" />
          <Skeleton className="h-24 w-full rounded-lg" />
        </div>
      )}

      {!query.isLoading && groups.length === 0 && (
        <div className="text-muted-foreground flex min-h-[40vh] flex-col items-center justify-center gap-3 rounded-lg border border-dashed text-center">
          <div className="bg-muted flex size-12 items-center justify-center rounded-xl">
            <CalendarIcon className="text-muted-foreground size-6" />
          </div>
          <h3 className="text-foreground text-lg font-semibold">No field visits</h3>
          <p className="max-w-sm px-4 text-sm">
            Schedule a visit from a client's Field visits tab and it'll show up here.
          </p>
        </div>
      )}

      <div className="space-y-6">
        {groups.map(([key, items]) => (
          <div key={key} className="space-y-2">
            <h3 className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
              {groupLabel(key)}
            </h3>
            <div className="space-y-2">
              {items.map((v) => {
                const badge = STATUS_BADGE[v.status]
                const time = formatTime(v.scheduled_at)
                return (
                  <div key={v.id} className="bg-card flex items-start justify-between gap-3 rounded-lg border p-3">
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2 font-medium">
                        {time && <span className="text-muted-foreground tabular-nums">{time}</span>}
                        <Link to={`/clients/${v.client_id}`} className="hover:underline">
                          {v.client_name || "Client"}
                        </Link>
                        <Badge variant={badge.variant}>{badge.label}</Badge>
                      </div>
                      <div className="text-muted-foreground flex flex-wrap gap-x-4 text-xs">
                        <span className="inline-flex items-center gap-1">
                          <Building2 className="size-3" />
                          View client
                        </span>
                        {v.contact_name && (
                          <span className="inline-flex items-center gap-1">
                            <Mail className="size-3" />
                            {v.contact_name}
                          </span>
                        )}
                        {v.contact_phone && (
                          <span className="inline-flex items-center gap-1">
                            <Phone className="size-3" />
                            {v.contact_phone}
                          </span>
                        )}
                        {v.transport_mode && (
                          <span className="inline-flex items-center gap-1">
                            <Car className="size-3" />
                            {transportModeLabel(v.transport_mode)}
                          </span>
                        )}
                      </div>
                      {v.notes && <p className="text-muted-foreground text-sm">{v.notes}</p>}
                    </div>
                    {canWrite && (v.status === "scheduled" || v.status === "arrived") && (
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          render={
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal />
                            </Button>
                          }
                        />
                        <DropdownMenuContent align="end">
                          {v.status === "scheduled" && (
                            <DropdownMenuItem onClick={() => arriveMutation.mutate(v.id)}>
                              <LogIn /> Log arrival
                            </DropdownMenuItem>
                          )}
                          {v.status === "arrived" && (
                            <DropdownMenuItem onClick={() => departMutation.mutate(v.id)}>
                              <LogOut /> Log departure
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem onClick={() => cancelMutation.mutate(v.id)}>
                            <Ban /> Cancel
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
