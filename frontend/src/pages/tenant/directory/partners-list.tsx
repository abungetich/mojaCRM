import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Building2, Factory, Handshake, MoreHorizontal, Plus, Trash2 } from "lucide-react"
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
import { ModalHeader } from "@/components/modal-header"
import { FilterBar, FilterPill } from "@/components/filter-bar"
import { PageHeader } from "@/components/page-header"
import { StatCard, StatsGrid } from "@/components/stat-card"
import { useDebouncedValue } from "@/hooks/use-debounced-value"
import { partners as partnersApi } from "@/lib/api"
import { useAuth } from "@/lib/auth"
import { partnerTypeLabel } from "@/lib/partner-options"
import type { Partner, PartnerInput, PartnerStatus } from "@/types"
import { PartnerFormSheet } from "@/pages/tenant/directory/partner-form"

export function PartnersListPage() {
  const navigate = useNavigate()
  const { hasPermission } = useAuth()
  const queryClient = useQueryClient()

  const [statusFilter, setStatusFilter] = useState<PartnerStatus | "all">("all")
  const [search, setSearch] = useState("")
  const debouncedSearch = useDebouncedValue(search, 300)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Partner | undefined>()
  const [toDelete, setToDelete] = useState<Partner | undefined>()

  const canWrite = hasPermission("partners:write")
  const canDelete = hasPermission("partners:delete")

  const query = useQuery({
    queryKey: ["partners", { statusFilter, debouncedSearch, page, pageSize }],
    queryFn: () =>
      partnersApi.list({
        page,
        page_size: pageSize,
        status: statusFilter === "all" ? undefined : statusFilter,
        q: debouncedSearch || undefined,
      }),
  })

  const totalQuery = useQuery({
    queryKey: ["partners", "count", "all"],
    queryFn: () => partnersApi.list({ page: 1, page_size: 1 }),
  })
  const activeQuery = useQuery({
    queryKey: ["partners", "count", "active"],
    queryFn: () => partnersApi.list({ page: 1, page_size: 1, status: "active" }),
  })
  const inactiveQuery = useQuery({
    queryKey: ["partners", "count", "inactive"],
    queryFn: () => partnersApi.list({ page: 1, page_size: 1, status: "inactive" }),
  })

  const createMutation = useMutation({
    mutationFn: partnersApi.create,
    onSuccess: () => {
      toast.success("Partner created")
      queryClient.invalidateQueries({ queryKey: ["partners"] })
      setFormOpen(false)
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: PartnerInput }) => partnersApi.update(id, input),
    onSuccess: () => {
      toast.success("Partner updated")
      queryClient.invalidateQueries({ queryKey: ["partners"] })
      setFormOpen(false)
      setEditing(undefined)
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const removeMutation = useMutation({
    mutationFn: (id: string) => partnersApi.remove(id),
    onSuccess: () => {
      toast.success("Partner deleted")
      queryClient.invalidateQueries({ queryKey: ["partners"] })
      setToDelete(undefined)
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const openCreate = () => {
    setEditing(undefined)
    setFormOpen(true)
  }
  const openEdit = (p: Partner) => {
    setEditing(p)
    setFormOpen(true)
  }

  const columns: Column<Partner>[] = [
    {
      key: "name",
      header: "Partner",
      render: (p) => (
        <div className="flex items-center gap-2.5 font-medium">
          {p.logo_url ? (
            <img src={p.logo_url} alt="" className="size-7 shrink-0 rounded-lg border bg-white object-contain p-0.5" />
          ) : (
            <span className="bg-primary/10 text-primary flex size-7 shrink-0 items-center justify-center rounded-lg">
              <Handshake className="size-4" />
            </span>
          )}
          <span className="flex flex-col">
            <span>{p.name}</span>
            {p.type && <span className="text-muted-foreground text-xs font-normal">{partnerTypeLabel(p.type)}</span>}
          </span>
        </div>
      ),
    },
    { key: "industry", header: "Industry", render: (p) => <span className="text-muted-foreground">{p.industry || "—"}</span> },
    {
      key: "partnership_model",
      header: "Model",
      render: (p) =>
        p.partnership_model ? (
          <Badge variant="outline">{p.partnership_model}</Badge>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      key: "status",
      header: "Status",
      render: (p) => <Badge variant={p.status === "active" ? "success" : "secondary"}>{p.status}</Badge>,
    },
  ]

  if (canWrite || canDelete) {
    columns.push({
      key: "actions",
      header: "",
      className: "text-right",
      render: (p) => (
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button variant="ghost" size="icon" onClick={(e) => e.stopPropagation()}>
                <MoreHorizontal />
              </Button>
            }
          />
          <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
            <DropdownMenuItem onClick={() => navigate(`/partners/${p.id}`)}>View</DropdownMenuItem>
            {canWrite && <DropdownMenuItem onClick={() => openEdit(p)}>Edit</DropdownMenuItem>}
            {canDelete && (
              <DropdownMenuItem variant="destructive" onClick={() => setToDelete(p)}>
                Delete
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    })
  }

  const renderCard = (p: Partner) => (
    <div className="space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5">
          {p.logo_url ? (
            <img src={p.logo_url} alt="" className="size-7 shrink-0 rounded-lg border bg-white object-contain p-0.5" />
          ) : (
            <span className="bg-primary/10 text-primary flex size-7 shrink-0 items-center justify-center rounded-lg">
              <Handshake className="size-4" />
            </span>
          )}
          <span className="font-medium">{p.name}</span>
        </div>
        <Badge variant={p.status === "active" ? "success" : "secondary"}>{p.status}</Badge>
      </div>
      <div className="text-muted-foreground text-sm">{p.industry || "No industry set"}</div>
      <div className="text-muted-foreground flex items-center justify-between text-xs">
        <span>{partnerTypeLabel(p.type) || "—"}</span>
        <span>{p.partnership_model || "—"}</span>
      </div>
    </div>
  )

  const activeCount = (statusFilter !== "all" ? 1 : 0) + (search ? 1 : 0)

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[{ label: "Dashboard", to: "/" }, { label: "Partners" }]}
        backTo="/"
        title="Partners"
        description="External organisations you collaborate with"
        actions={
          canWrite && (
            <Button onClick={openCreate}>
              <Plus /> New partner
            </Button>
          )
        }
      />

      <StatsGrid>
        <StatCard
          label="Total partners"
          value={totalQuery.data?.total ?? 0}
          icon={Handshake}
          tone="primary"
          loading={totalQuery.isLoading}
        />
        <StatCard
          label="Active"
          value={activeQuery.data?.total ?? 0}
          icon={Building2}
          tone="green"
          loading={activeQuery.isLoading}
        />
        <StatCard
          label="Inactive"
          value={inactiveQuery.data?.total ?? 0}
          icon={Building2}
          tone="slate"
          loading={inactiveQuery.isLoading}
        />
        <StatCard
          label="Industries"
          value={new Set((query.data?.data ?? []).map((p) => p.industry).filter(Boolean)).size}
          icon={Factory}
          tone="info"
        />
      </StatsGrid>

      <FilterBar
        search={search}
        onSearchChange={(v) => {
          setSearch(v)
          setPage(1)
        }}
        searchPlaceholder="Search name, industry, contact…"
        activeCount={activeCount}
        onClear={() => {
          setStatusFilter("all")
          setSearch("")
          setPage(1)
        }}
        pills={
          <>
            <FilterPill active={statusFilter === "all"} onClick={() => { setStatusFilter("all"); setPage(1) }}>
              All
            </FilterPill>
            <FilterPill active={statusFilter === "active"} onClick={() => { setStatusFilter("active"); setPage(1) }}>
              Active
            </FilterPill>
            <FilterPill active={statusFilter === "inactive"} onClick={() => { setStatusFilter("inactive"); setPage(1) }}>
              Inactive
            </FilterPill>
          </>
        }
      />

      <DataTable
        columns={columns}
        data={query.data?.data ?? []}
        rowKey={(p) => p.id}
        onRowClick={(p) => navigate(`/partners/${p.id}`)}
        loading={query.isLoading}
        renderCard={renderCard}
        emptyIcon={Handshake}
        emptyTitle="No partners yet"
        emptyDescription="Add your first partner organisation to get started."
        page={page}
        pageSize={pageSize}
        total={query.data?.total ?? 0}
        onPageChange={setPage}
        onPageSizeChange={(size) => {
          setPageSize(size)
          setPage(1)
        }}
      />

      <PartnerFormSheet
        open={formOpen}
        onOpenChange={setFormOpen}
        partner={editing}
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
          <ModalHeader
            icon={Trash2}
            title="Delete partner?"
            description={`"${toDelete?.name}" will be permanently removed.`}
          />
          <DialogFooter className="p-4">
            <Button variant="outline" onClick={() => setToDelete(undefined)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={removeMutation.isPending}
              onClick={() => toDelete && removeMutation.mutate(toDelete.id)}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
