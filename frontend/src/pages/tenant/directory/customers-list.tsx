import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Building2, CircleCheck, MoreHorizontal, Plus, Sprout, UsersRound } from "lucide-react"
import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { Column } from "@/components/data-table"
import { DataTable } from "@/components/data-table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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
import { useDebouncedValue } from "@/hooks/use-debounced-value"
import { customers as customersApi } from "@/lib/api"
import { useAuth } from "@/lib/auth"
import type { Customer, CustomerInput, CustomerType } from "@/types"
import { CustomerFormSheet } from "@/pages/tenant/directory/customer-form"

const STATUS_OPTIONS = ["prospect", "active", "dormant", "archived", "blacklisted"] as const

const STATUS_BADGE: Record<string, "success" | "secondary" | "destructive" | "outline"> = {
  active: "success",
  prospect: "outline",
  dormant: "secondary",
  archived: "secondary",
  blacklisted: "destructive",
}

export function CustomersListPage() {
  const navigate = useNavigate()
  const { hasPermission } = useAuth()
  const queryClient = useQueryClient()

  const [typeFilter, setTypeFilter] = useState<CustomerType | "all">("all")
  const [statusFilter, setStatusFilter] = useState<string>("")
  const [search, setSearch] = useState("")
  const debouncedSearch = useDebouncedValue(search, 300)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Customer | undefined>()

  const canWrite = hasPermission("customers:write")
  const canDelete = hasPermission("customers:delete")

  const query = useQuery({
    queryKey: ["customers", { typeFilter, statusFilter, debouncedSearch, page, pageSize }],
    queryFn: () =>
      customersApi.list({
        page,
        page_size: pageSize,
        customer_type: typeFilter === "all" ? undefined : typeFilter,
        status: statusFilter || undefined,
        q: debouncedSearch || undefined,
      }),
  })

  const totalQuery = useQuery({
    queryKey: ["customers", "count", "all"],
    queryFn: () => customersApi.list({ page: 1, page_size: 1 }),
  })
  const activeQuery = useQuery({
    queryKey: ["customers", "count", "active"],
    queryFn: () => customersApi.list({ page: 1, page_size: 1, status: "active" }),
  })
  const prospectQuery = useQuery({
    queryKey: ["customers", "count", "prospect"],
    queryFn: () => customersApi.list({ page: 1, page_size: 1, status: "prospect" }),
  })
  const orgQuery = useQuery({
    queryKey: ["customers", "count", "organization"],
    queryFn: () => customersApi.list({ page: 1, page_size: 1, customer_type: "organization" }),
  })

  const createMutation = useMutation({
    mutationFn: customersApi.create,
    onSuccess: () => {
      toast.success("Customer created")
      queryClient.invalidateQueries({ queryKey: ["customers"] })
      setFormOpen(false)
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: CustomerInput }) => customersApi.update(id, input),
    onSuccess: () => {
      toast.success("Customer updated")
      queryClient.invalidateQueries({ queryKey: ["customers"] })
      setFormOpen(false)
      setEditing(undefined)
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const archiveMutation = useMutation({
    mutationFn: (id: string) => customersApi.archive(id, "Archived from directory list"),
    onSuccess: () => {
      toast.success("Customer archived")
      queryClient.invalidateQueries({ queryKey: ["customers"] })
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const openCreate = () => {
    setEditing(undefined)
    setFormOpen(true)
  }
  const openEdit = (c: Customer) => {
    setEditing(c)
    setFormOpen(true)
  }

  const columns: Column<Customer>[] = [
    {
      key: "name",
      header: "Name",
      render: (c) => (
        <div className="flex items-center gap-2.5 font-medium">
          {c.customer_type === "organization" ? (
            <Building2 className="text-muted-foreground size-4 shrink-0" />
          ) : (
            <UsersRound className="text-muted-foreground size-4 shrink-0" />
          )}
          {c.display_name}
        </div>
      ),
    },
    {
      key: "contact",
      header: "Contact",
      render: (c) => (
        <span className="text-muted-foreground">{c.primary_email || c.primary_phone || "—"}</span>
      ),
    },
    { key: "segment", header: "Segment", render: (c) => c.segment || "—" },
    {
      key: "status",
      header: "Status",
      render: (c) => <Badge variant={STATUS_BADGE[c.status] ?? "outline"}>{c.status}</Badge>,
    },
    {
      key: "owner",
      header: "Owner",
      render: (c) => <span className="text-muted-foreground">{c.account_owner_name || "Unassigned"}</span>,
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
            <DropdownMenuItem onClick={() => navigate(`/customers/${c.id}`)}>View</DropdownMenuItem>
            {canWrite && <DropdownMenuItem onClick={() => openEdit(c)}>Edit</DropdownMenuItem>}
            {canDelete && c.status !== "archived" && (
              <DropdownMenuItem variant="destructive" onClick={() => archiveMutation.mutate(c.id)}>
                Archive
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    })
  }

  const renderCard = (c: Customer) => (
    <div className="space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5">
          {c.customer_type === "organization" ? (
            <Building2 className="text-muted-foreground size-4 shrink-0" />
          ) : (
            <UsersRound className="text-muted-foreground size-4 shrink-0" />
          )}
          <span className="font-medium">{c.display_name}</span>
        </div>
        <Badge variant={STATUS_BADGE[c.status] ?? "outline"}>{c.status}</Badge>
      </div>
      <div className="text-muted-foreground text-sm">{c.primary_email || c.primary_phone || "No contact info"}</div>
      <div className="text-muted-foreground flex items-center justify-between text-xs">
        <span>{c.segment || "No segment"}</span>
        <span>{c.account_owner_name || "Unassigned"}</span>
      </div>
    </div>
  )

  const activeCount = (typeFilter !== "all" ? 1 : 0) + (statusFilter ? 1 : 0) + (search ? 1 : 0)

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[{ label: "Dashboard", to: "/" }, { label: "Directory" }]}
        backTo="/"
        title="Directory"
        description="Customers, organizations and individuals"
        actions={
          canWrite && (
            <Button onClick={openCreate}>
              <Plus /> New customer
            </Button>
          )
        }
      />

      <StatsGrid>
        <StatCard
          label="Total customers"
          value={totalQuery.data?.total ?? 0}
          icon={UsersRound}
          tone="primary"
          loading={totalQuery.isLoading}
        />
        <StatCard
          label="Active"
          value={activeQuery.data?.total ?? 0}
          icon={CircleCheck}
          tone="green"
          loading={activeQuery.isLoading}
        />
        <StatCard
          label="Prospects"
          value={prospectQuery.data?.total ?? 0}
          icon={Sprout}
          tone="teal"
          loading={prospectQuery.isLoading}
        />
        <StatCard
          label="Organizations"
          value={orgQuery.data?.total ?? 0}
          icon={Building2}
          tone="info"
          loading={orgQuery.isLoading}
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
          setStatusFilter("")
          setSearch("")
          setPage(1)
        }}
        pills={
          <>
            <FilterPill active={typeFilter === "all"} onClick={() => { setTypeFilter("all"); setPage(1) }}>
              All
            </FilterPill>
            <FilterPill active={typeFilter === "organization"} onClick={() => { setTypeFilter("organization"); setPage(1) }}>
              Organizations
            </FilterPill>
            <FilterPill active={typeFilter === "individual"} onClick={() => { setTypeFilter("individual"); setPage(1) }}>
              Individuals
            </FilterPill>
          </>
        }
        extra={
          <Select
            items={[{ value: "__all", label: "All statuses" }, ...STATUS_OPTIONS.map((s) => ({ value: s, label: s }))]}
            value={statusFilter || "__all"}
            onValueChange={(v) => {
              setStatusFilter(!v || v === "__all" ? "" : v)
              setPage(1)
            }}
          >
            <SelectTrigger className="w-full sm:w-40">
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
        }
      />

      <DataTable
        columns={columns}
        data={query.data?.data ?? []}
        rowKey={(c) => c.id}
        onRowClick={(c) => navigate(`/customers/${c.id}`)}
        loading={query.isLoading}
        renderCard={renderCard}
        emptyIcon={UsersRound}
        emptyTitle="No customers yet"
        emptyDescription="Add your first organization or individual to start building your directory."
        page={page}
        pageSize={pageSize}
        total={query.data?.total ?? 0}
        onPageChange={setPage}
        onPageSizeChange={(size) => {
          setPageSize(size)
          setPage(1)
        }}
      />

      <CustomerFormSheet
        open={formOpen}
        onOpenChange={setFormOpen}
        customer={editing}
        onSubmit={(input) => {
          if (editing) {
            updateMutation.mutate({ id: editing.id, input })
          } else {
            createMutation.mutate(input)
          }
        }}
        submitting={createMutation.isPending || updateMutation.isPending}
      />
    </div>
  )
}
