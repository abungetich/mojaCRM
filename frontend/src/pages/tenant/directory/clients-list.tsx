import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Building2, Mail, MoreHorizontal, Plus, Trash2, User, UsersRound } from "lucide-react"
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
import { clients as clientsApi } from "@/lib/api"
import { useAuth } from "@/lib/auth"
import type { Client, ClientInput, ClientType } from "@/types"
import { ClientFormSheet } from "@/pages/tenant/directory/client-form"

function ClientAvatar({ client }: { client: Client }) {
  const initials =
    client.client_type === "company"
      ? (client.company_name || client.display_name).slice(0, 2).toUpperCase()
      : `${client.first_name?.[0] ?? ""}${client.last_name?.[0] ?? ""}`.toUpperCase() ||
        client.display_name.slice(0, 2).toUpperCase()

  return (
    <span className="bg-primary/10 text-primary flex size-7 shrink-0 items-center justify-center rounded-lg text-[10px] font-bold">
      {initials}
    </span>
  )
}

export function ClientsListPage() {
  const navigate = useNavigate()
  const { hasPermission } = useAuth()
  const queryClient = useQueryClient()

  const [typeFilter, setTypeFilter] = useState<ClientType | "all">("all")
  const [search, setSearch] = useState("")
  const debouncedSearch = useDebouncedValue(search, 300)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Client | undefined>()
  const [toDelete, setToDelete] = useState<Client | undefined>()

  const canWrite = hasPermission("clients:write")
  const canDelete = hasPermission("clients:delete")

  const query = useQuery({
    queryKey: ["clients", { typeFilter, debouncedSearch, page, pageSize }],
    queryFn: () =>
      clientsApi.list({
        page,
        page_size: pageSize,
        client_type: typeFilter === "all" ? undefined : typeFilter,
        q: debouncedSearch || undefined,
      }),
  })

  // Companies-only list, used to let a person link to the company they represent.
  const companiesQuery = useQuery({
    queryKey: ["clients", "companies"],
    queryFn: () => clientsApi.list({ page: 1, page_size: 200, client_type: "company" }),
  })

  const totalQuery = useQuery({
    queryKey: ["clients", "count", "all"],
    queryFn: () => clientsApi.list({ page: 1, page_size: 1 }),
  })
  const personsQuery = useQuery({
    queryKey: ["clients", "count", "person"],
    queryFn: () => clientsApi.list({ page: 1, page_size: 1, client_type: "person" }),
  })
  const companiesCountQuery = useQuery({
    queryKey: ["clients", "count", "company"],
    queryFn: () => clientsApi.list({ page: 1, page_size: 1, client_type: "company" }),
  })

  const createMutation = useMutation({
    mutationFn: clientsApi.create,
    onSuccess: () => {
      toast.success("Client created")
      queryClient.invalidateQueries({ queryKey: ["clients"] })
      setFormOpen(false)
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: ClientInput }) => clientsApi.update(id, input),
    onSuccess: () => {
      toast.success("Client updated")
      queryClient.invalidateQueries({ queryKey: ["clients"] })
      setFormOpen(false)
      setEditing(undefined)
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const removeMutation = useMutation({
    mutationFn: (id: string) => clientsApi.remove(id),
    onSuccess: () => {
      toast.success("Client deleted")
      queryClient.invalidateQueries({ queryKey: ["clients"] })
      setToDelete(undefined)
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const openCreate = () => {
    setEditing(undefined)
    setFormOpen(true)
  }
  const openEdit = (c: Client) => {
    setEditing(c)
    setFormOpen(true)
  }

  const columns: Column<Client>[] = [
    {
      key: "name",
      header: "Name",
      render: (c) => (
        <div className="flex items-center gap-2.5 font-medium">
          <ClientAvatar client={c} />
          {c.display_name}
        </div>
      ),
    },
    {
      key: "type",
      header: "Type",
      render: (c) => <Badge variant="outline" className="capitalize">{c.client_type}</Badge>,
    },
    {
      key: "contact",
      header: "Contact",
      render: (c) => <span className="text-muted-foreground">{c.email || c.phone || "—"}</span>,
    },
    {
      key: "code",
      header: "Ref. code",
      render: (c) => <span className="text-muted-foreground">{c.code || "—"}</span>,
    },
  ]

  if (canWrite || canDelete) {
    columns.push({
      key: "actions",
      header: "",
      className: "text-right",
      render: (c) => (
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button variant="ghost" size="icon" onClick={(e) => e.stopPropagation()}>
                <MoreHorizontal />
              </Button>
            }
          />
          <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
            <DropdownMenuItem onClick={() => navigate(`/clients/${c.id}`)}>View</DropdownMenuItem>
            {canWrite && <DropdownMenuItem onClick={() => openEdit(c)}>Edit</DropdownMenuItem>}
            {canDelete && (
              <DropdownMenuItem variant="destructive" onClick={() => setToDelete(c)}>
                Delete
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    })
  }

  const renderCard = (c: Client) => (
    <div className="space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <ClientAvatar client={c} />
          <span className="font-medium">{c.display_name}</span>
        </div>
        <Badge variant="outline" className="capitalize">{c.client_type}</Badge>
      </div>
      <div className="text-muted-foreground text-sm">{c.email || c.phone || "No contact info"}</div>
      <div className="text-muted-foreground flex items-center justify-between text-xs">
        <span>{c.code || "No ref. code"}</span>
      </div>
    </div>
  )

  const activeCount = (typeFilter !== "all" ? 1 : 0) + (search ? 1 : 0)

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[{ label: "Dashboard", to: "/" }, { label: "Clients" }]}
        backTo="/"
        title="Clients"
        description="People and companies you work for"
        actions={
          canWrite && (
            <Button onClick={openCreate}>
              <Plus /> New client
            </Button>
          )
        }
      />

      <StatsGrid>
        <StatCard
          label="Total clients"
          value={totalQuery.data?.total ?? 0}
          icon={UsersRound}
          tone="primary"
          loading={totalQuery.isLoading}
        />
        <StatCard
          label="Persons"
          value={personsQuery.data?.total ?? 0}
          icon={User}
          tone="teal"
          loading={personsQuery.isLoading}
        />
        <StatCard
          label="Companies"
          value={companiesCountQuery.data?.total ?? 0}
          icon={Building2}
          tone="info"
          loading={companiesCountQuery.isLoading}
        />
        <StatCard
          label="With email"
          value={(query.data?.data ?? []).filter((c) => c.email).length}
          icon={Mail}
          tone="green"
        />
      </StatsGrid>

      <FilterBar
        search={search}
        onSearchChange={(v) => {
          setSearch(v)
          setPage(1)
        }}
        searchPlaceholder="Search name, email, phone…"
        activeCount={activeCount}
        onClear={() => {
          setTypeFilter("all")
          setSearch("")
          setPage(1)
        }}
        pills={
          <>
            <FilterPill active={typeFilter === "all"} onClick={() => { setTypeFilter("all"); setPage(1) }}>
              All
            </FilterPill>
            <FilterPill active={typeFilter === "person"} onClick={() => { setTypeFilter("person"); setPage(1) }}>
              Persons
            </FilterPill>
            <FilterPill active={typeFilter === "company"} onClick={() => { setTypeFilter("company"); setPage(1) }}>
              Companies
            </FilterPill>
          </>
        }
      />

      <DataTable
        columns={columns}
        data={query.data?.data ?? []}
        rowKey={(c) => c.id}
        onRowClick={(c) => navigate(`/clients/${c.id}`)}
        loading={query.isLoading}
        renderCard={renderCard}
        emptyIcon={UsersRound}
        emptyTitle="No clients yet"
        emptyDescription="Add your first person or company client to get started."
        page={page}
        pageSize={pageSize}
        total={query.data?.total ?? 0}
        onPageChange={setPage}
        onPageSizeChange={(size) => {
          setPageSize(size)
          setPage(1)
        }}
      />

      <ClientFormSheet
        open={formOpen}
        onOpenChange={setFormOpen}
        client={editing}
        companyOptions={(companiesQuery.data?.data ?? []).map((c) => ({ value: c.id, label: c.display_name }))}
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
            title="Delete client?"
            description={`"${toDelete?.display_name}" will be permanently removed.`}
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
