import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { format } from "date-fns"
import { CalendarClock, CheckCircle2, Inbox, MessagesSquare } from "lucide-react"
import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import type { Column } from "@/components/data-table"
import { DataTable } from "@/components/data-table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { FilterBar, FilterPill } from "@/components/filter-bar"
import { PageHeader } from "@/components/page-header"
import { StatCard, StatsGrid } from "@/components/stat-card"
import { COMM_TYPE_ICON, COMM_TYPE_LABEL } from "@/pages/tenant/directory/communication-composer"
import { useDebouncedValue } from "@/hooks/use-debounced-value"
import { communications as commsApi } from "@/lib/api"
import type { Communication, CommunicationType } from "@/types"

const STATUS_OPTIONS = ["draft", "sent", "delivered", "failed", "completed"] as const

const STATUS_BADGE: Record<string, "success" | "secondary" | "destructive" | "outline"> = {
  completed: "success",
  delivered: "success",
  sent: "outline",
  draft: "secondary",
  failed: "destructive",
}

export function CommunicationsCenterPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [followUpFilter, setFollowUpFilter] = useState<"all" | "true">("all")
  const [typeFilter, setTypeFilter] = useState<CommunicationType | "">("")
  const [statusFilter, setStatusFilter] = useState("")
  const [search, setSearch] = useState("")
  const debouncedSearch = useDebouncedValue(search, 300)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)

  const query = useQuery({
    queryKey: ["communications", { followUpFilter, typeFilter, statusFilter, debouncedSearch, page, pageSize }],
    queryFn: () =>
      commsApi.list({
        page,
        page_size: pageSize,
        communication_type: typeFilter || undefined,
        status: statusFilter || undefined,
        follow_up_required: followUpFilter === "true" ? "true" : undefined,
        q: debouncedSearch || undefined,
      }),
  })

  const totalQuery = useQuery({
    queryKey: ["communications", "count", "all"],
    queryFn: () => commsApi.list({ page: 1, page_size: 1 }),
  })
  const completedQuery = useQuery({
    queryKey: ["communications", "count", "completed"],
    queryFn: () => commsApi.list({ page: 1, page_size: 1, status: "completed" }),
  })
  const followUpsQuery = useQuery({
    queryKey: ["communications", "count", "follow-ups"],
    queryFn: () => commsApi.list({ page: 1, page_size: 1, follow_up_required: "true" }),
  })

  const completeMutation = useMutation({
    mutationFn: (id: string) => commsApi.completeFollowUp(id),
    onSuccess: () => {
      toast.success("Follow-up marked complete")
      queryClient.invalidateQueries({ queryKey: ["communications"] })
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const columns: Column<Communication>[] = [
    {
      key: "date",
      header: "Date",
      render: (c) => (
        <span className="text-muted-foreground whitespace-nowrap">
          {format(new Date(c.communication_date), "MMM d, yyyy · h:mm a")}
        </span>
      ),
    },
    { key: "customer", header: "Customer", render: (c) => <span className="font-medium">{c.customer_name}</span> },
    { key: "contact", header: "Contact", render: (c) => c.contact_name || "—" },
    {
      key: "channel",
      header: "Channel",
      render: (c) => {
        const Icon = COMM_TYPE_ICON[c.communication_type]
        return (
          <span className="flex items-center gap-1.5">
            <Icon className="text-muted-foreground size-3.5" />
            {COMM_TYPE_LABEL[c.communication_type]}
          </span>
        )
      },
    },
    { key: "subject", header: "Subject", render: (c) => c.subject || "—" },
    {
      key: "status",
      header: "Status",
      render: (c) => <Badge variant={STATUS_BADGE[c.status] ?? "outline"}>{c.status}</Badge>,
    },
    { key: "owner", header: "Owner", render: (c) => c.created_by_name || "—" },
  ]

  const renderCard = (c: Communication) => {
    const Icon = COMM_TYPE_ICON[c.communication_type]
    return (
      <div className="space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <Icon className="text-muted-foreground size-4 shrink-0" />
            <span className="font-medium">{c.customer_name}</span>
          </div>
          <Badge variant={STATUS_BADGE[c.status] ?? "outline"}>{c.status}</Badge>
        </div>
        <div className="text-sm">{c.subject || COMM_TYPE_LABEL[c.communication_type]}</div>
        <div className="text-muted-foreground flex items-center justify-between text-xs">
          <span>{format(new Date(c.communication_date), "MMM d, h:mm a")}</span>
          <span>{c.created_by_name || "—"}</span>
        </div>
        {c.follow_up_required && (
          <button
            className="text-primary text-xs underline-offset-4 hover:underline"
            onClick={(e) => {
              e.stopPropagation()
              completeMutation.mutate(c.id)
            }}
          >
            Mark follow-up complete
          </button>
        )}
      </div>
    )
  }

  const activeCount = (followUpFilter === "true" ? 1 : 0) + (typeFilter ? 1 : 0) + (statusFilter ? 1 : 0) + (search ? 1 : 0)

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[{ label: "Directory", to: "/customers" }, { label: "Communications" }]}
        backTo="/customers"
        title="Communications"
        description="Every logged interaction across your customers"
      />

      <StatsGrid>
        <StatCard
          label="Total logged"
          value={totalQuery.data?.total ?? 0}
          icon={MessagesSquare}
          tone="primary"
          loading={totalQuery.isLoading}
        />
        <StatCard
          label="Completed"
          value={completedQuery.data?.total ?? 0}
          icon={CheckCircle2}
          tone="green"
          loading={completedQuery.isLoading}
        />
        <StatCard
          label="Follow-ups due"
          value={followUpsQuery.data?.total ?? 0}
          icon={CalendarClock}
          tone="coral"
          loading={followUpsQuery.isLoading}
        />
      </StatsGrid>

      <FilterBar
        search={search}
        onSearchChange={(v) => {
          setSearch(v)
          setPage(1)
        }}
        searchPlaceholder="Search customer, subject, message…"
        activeCount={activeCount}
        onClear={() => {
          setFollowUpFilter("all")
          setTypeFilter("")
          setStatusFilter("")
          setSearch("")
          setPage(1)
        }}
        pills={
          <>
            <FilterPill active={followUpFilter === "all"} onClick={() => { setFollowUpFilter("all"); setPage(1) }}>
              All
            </FilterPill>
            <FilterPill active={followUpFilter === "true"} onClick={() => { setFollowUpFilter("true"); setPage(1) }}>
              Follow-ups due
            </FilterPill>
          </>
        }
        extra={
          <div className="flex gap-2">
            <Select
              items={[{ value: "__all", label: "All channels" }, ...Object.entries(COMM_TYPE_LABEL).map(([value, label]) => ({ value, label }))]}
              value={typeFilter || "__all"}
              onValueChange={(v) => {
                setTypeFilter(!v || v === "__all" ? "" : (v as CommunicationType))
                setPage(1)
              }}
            >
              <SelectTrigger className="w-full sm:w-36">
                <SelectValue placeholder="Channel" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all">All channels</SelectItem>
                {Object.entries(COMM_TYPE_LABEL).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              items={[{ value: "__all", label: "All statuses" }, ...STATUS_OPTIONS.map((s) => ({ value: s, label: s }))]}
              value={statusFilter || "__all"}
              onValueChange={(v) => {
                setStatusFilter(!v || v === "__all" ? "" : v)
                setPage(1)
              }}
            >
              <SelectTrigger className="w-full sm:w-36">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all">All statuses</SelectItem>
                {STATUS_OPTIONS.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        }
      />

      <DataTable
        columns={columns}
        data={query.data?.data ?? []}
        rowKey={(c) => c.id}
        onRowClick={(c) => navigate(`/customers/${c.customer_id}`)}
        loading={query.isLoading}
        renderCard={renderCard}
        emptyIcon={Inbox}
        emptyTitle="No communications logged"
        emptyDescription="Interactions logged from a customer's Activity tab will show up here."
        page={page}
        pageSize={pageSize}
        total={query.data?.total ?? 0}
        onPageChange={setPage}
        onPageSizeChange={(size) => {
          setPageSize(size)
          setPage(1)
        }}
      />
    </div>
  )
}
