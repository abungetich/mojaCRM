import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  CircleAlert,
  ClipboardList,
  Gavel,
  Layers,
  MoreHorizontal,
  Plus,
  Trash2,
  Trophy,
} from "lucide-react"
import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { Column } from "@/components/data-table"
import { DataTable } from "@/components/data-table"
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ModalHeader } from "@/components/modal-header"
import { FilterBar } from "@/components/filter-bar"
import { PageHeader } from "@/components/page-header"
import { StatCard, StatsGrid } from "@/components/stat-card"
import { useDebouncedValue } from "@/hooks/use-debounced-value"
import { tenders as tendersApi, users as usersApi } from "@/lib/api"
import { useAuth } from "@/lib/auth"
import { cn } from "@/lib/utils"
import type { Tender, TenderInput, TenderListRow, TenderStage } from "@/types"
import { TenderFormSheet } from "@/pages/tenant/tender-form"
import { TenderLetterTemplatesDialog } from "@/pages/tenant/tender-letters"
import { STAGE_LABEL, STAGE_TONE, TENDER_STAGE_OPTIONS, dueTone, isActiveStage, money } from "@/pages/tenant/tender-shared"

export function TendersListPage() {
  const navigate = useNavigate()
  const { hasPermission } = useAuth()
  const queryClient = useQueryClient()

  const [stageFilter, setStageFilter] = useState<TenderStage | "all">("all")
  const [search, setSearch] = useState("")
  const debouncedSearch = useDebouncedValue(search, 300)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Tender | undefined>()
  const [toDelete, setToDelete] = useState<TenderListRow | undefined>()

  const canWrite = hasPermission("tenders:write")

  const query = useQuery({
    queryKey: ["tenders", { stageFilter, debouncedSearch, page, pageSize }],
    queryFn: () =>
      tendersApi.list({
        page,
        page_size: pageSize,
        stage: stageFilter === "all" ? undefined : stageFilter,
        q: debouncedSearch || undefined,
      }),
  })

  // Unfiltered snapshot for stats (deadlines/win-loss), same approach as the
  // stat cards on Clients/Partners but computed client-side since this is a
  // bounded bid register, not a high-volume table.
  const statsQuery = useQuery({
    queryKey: ["tenders", "stats"],
    queryFn: () => tendersApi.list({ page: 1, page_size: 200 }),
  })

  const usersQuery = useQuery({ queryKey: ["users"], queryFn: () => usersApi.list() })

  const createMutation = useMutation({
    mutationFn: tendersApi.create,
    onSuccess: () => {
      toast.success("Tender added")
      queryClient.invalidateQueries({ queryKey: ["tenders"] })
      setFormOpen(false)
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: TenderInput }) => tendersApi.update(id, input),
    onSuccess: () => {
      toast.success("Tender updated")
      queryClient.invalidateQueries({ queryKey: ["tenders"] })
      setFormOpen(false)
      setEditing(undefined)
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const removeMutation = useMutation({
    mutationFn: (id: string) => tendersApi.remove(id),
    onSuccess: () => {
      toast.success("Tender deleted")
      queryClient.invalidateQueries({ queryKey: ["tenders"] })
      setToDelete(undefined)
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const openCreate = () => {
    setEditing(undefined)
    setFormOpen(true)
  }
  const openEdit = async (row: TenderListRow) => {
    try {
      const t = await tendersApi.get(row.id)
      setEditing(t)
      setFormOpen(true)
    } catch {
      toast.error("Could not load tender")
    }
  }

  const rows = query.data?.data ?? []
  const statsRows = statsQuery.data?.data ?? []
  const yr = new Date().getFullYear().toString()
  const stats = {
    open: statsRows.filter((t) => isActiveStage(t.stage)).length,
    dueSoon: statsRows.filter((t) => {
      if (!isActiveStage(t.stage) || !t.submission_deadline) return false
      const days = (Date.parse(t.submission_deadline + "T23:59:59") - Date.now()) / 86_400_000
      return days >= 0 && days <= 7
    }).length,
    overdue: statsRows.filter(
      (t) => isActiveStage(t.stage) && t.submission_deadline && Date.parse(t.submission_deadline + "T23:59:59") < Date.now()
    ).length,
    awarded: statsRows.filter((t) => t.stage === "awarded" && (t.submitted_on || t.created_at).startsWith(yr)).length,
  }

  const columns: Column<TenderListRow>[] = [
    {
      key: "title",
      header: "Tender",
      render: (t) => (
        <div className="flex flex-col">
          <span className="font-medium">{t.title || "—"}</span>
          <span className="text-muted-foreground truncate text-xs">
            {[t.issuer, t.reference].filter(Boolean).join(" · ") || "—"}
          </span>
        </div>
      ),
    },
    {
      key: "stage",
      header: "Stage",
      render: (t) => <Badge className={cn("border-transparent", STAGE_TONE[t.stage])}>{STAGE_LABEL[t.stage]}</Badge>,
    },
    {
      key: "deadline",
      header: "Deadline",
      render: (t) => (
        <span className={cn("text-sm", dueTone(t.submission_deadline, t.stage))}>{t.submission_deadline || "—"}</span>
      ),
    },
    {
      key: "value",
      header: "Value",
      render: (t) => (
        <span className="text-muted-foreground">{t.estimated_value ? money(t.estimated_value, t.currency) : "—"}</span>
      ),
    },
    { key: "owner", header: "Lead", render: (t) => <span className="text-muted-foreground">{t.owner_name || "—"}</span> },
  ]

  columns.push({
    key: "actions",
    header: "",
    className: "text-right",
    render: (t) => (
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button variant="ghost" size="icon" onClick={(e) => e.stopPropagation()}>
              <MoreHorizontal />
            </Button>
          }
        />
        <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
          <DropdownMenuItem onClick={() => navigate(`/tenders/${t.id}`)}>View</DropdownMenuItem>
          {canWrite && <DropdownMenuItem onClick={() => openEdit(t)}>Edit</DropdownMenuItem>}
          {canWrite && (
            <DropdownMenuItem variant="destructive" onClick={() => setToDelete(t)}>
              Delete
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    ),
  })

  const renderCard = (t: TenderListRow) => (
    <div className="space-y-2">
      <div className="flex items-start justify-between gap-2">
        <span className="font-medium">{t.title || "—"}</span>
        <Badge className={cn("border-transparent", STAGE_TONE[t.stage])}>{STAGE_LABEL[t.stage]}</Badge>
      </div>
      <div className="text-muted-foreground text-sm">{[t.issuer, t.reference].filter(Boolean).join(" · ") || "—"}</div>
      <div className="text-muted-foreground flex items-center justify-between text-xs">
        <span className={dueTone(t.submission_deadline, t.stage)}>{t.submission_deadline || "No deadline"}</span>
        <span>{t.owner_name || "Unassigned"}</span>
      </div>
    </div>
  )

  const activeCount = (stageFilter !== "all" ? 1 : 0) + (search ? 1 : 0)

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[{ label: "Dashboard", to: "/" }, { label: "Tenders" }]}
        backTo="/"
        title="Tenders & pre-qualifications"
        description="Track bid opportunities, deadlines, documents and outcomes"
        actions={
          <div className="flex items-center gap-2">
            {canWrite && <TenderLetterTemplatesDialog />}
            {canWrite && (
              <Button onClick={openCreate}>
                <Plus /> New tender
              </Button>
            )}
          </div>
        }
      />

      <StatsGrid>
        <StatCard
          label="Open"
          value={stats.open}
          icon={ClipboardList}
          tone="info"
          subtitle="Watching or preparing"
          loading={statsQuery.isLoading}
        />
        <StatCard label="Due ≤ 7 days" value={stats.dueSoon} icon={Layers} tone="primary" loading={statsQuery.isLoading} />
        <StatCard
          label="Overdue"
          value={stats.overdue}
          icon={CircleAlert}
          tone="coral"
          subtitle="Past deadline, not submitted"
          loading={statsQuery.isLoading}
        />
        <StatCard label={`Awarded ${yr}`} value={stats.awarded} icon={Trophy} tone="green" loading={statsQuery.isLoading} />
      </StatsGrid>

      <FilterBar
        search={search}
        onSearchChange={(v) => {
          setSearch(v)
          setPage(1)
        }}
        searchPlaceholder="Search title, issuer, reference…"
        activeCount={activeCount}
        onClear={() => {
          setStageFilter("all")
          setSearch("")
          setPage(1)
        }}
        extra={
          <Select
            value={stageFilter}
            onValueChange={(v) => {
              setStageFilter((v as TenderStage | "all") || "all")
              setPage(1)
            }}
          >
            <SelectTrigger className="w-full sm:w-44">
              <SelectValue placeholder="All stages" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All stages</SelectItem>
              {TENDER_STAGE_OPTIONS.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
      />

      <DataTable
        columns={columns}
        data={rows}
        rowKey={(t) => t.id}
        onRowClick={(t) => navigate(`/tenders/${t.id}`)}
        loading={query.isLoading}
        renderCard={renderCard}
        emptyIcon={Gavel}
        emptyTitle="No tenders yet"
        emptyDescription="Record a tender or pre-qualification opportunity to track its deadline and documents."
        page={page}
        pageSize={pageSize}
        total={query.data?.total ?? 0}
        onPageChange={setPage}
        onPageSizeChange={(size) => {
          setPageSize(size)
          setPage(1)
        }}
      />

      <TenderFormSheet
        open={formOpen}
        onOpenChange={setFormOpen}
        tender={editing}
        users={usersQuery.data ?? []}
        onSubmit={(input) => {
          if (editing) {
            updateMutation.mutate({ id: editing.id, input })
          } else {
            createMutation.mutate(input)
          }
        }}
        submitting={createMutation.isPending || updateMutation.isPending}
      />

      <Dialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(undefined)}>
        <DialogContent className="gap-0 overflow-hidden p-0">
          <ModalHeader icon={Trash2} title="Delete tender?" description={`"${toDelete?.title}" will be archived.`} />
          <DialogFooter className="p-4">
            <Button variant="outline" onClick={() => setToDelete(undefined)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={removeMutation.isPending}
              onClick={() => toDelete && removeMutation.mutate(toDelete.id)}
            >
              <Trash2 /> Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
