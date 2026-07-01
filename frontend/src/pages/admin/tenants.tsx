import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Building2, CircleCheck, CircleSlash, Plus } from "lucide-react"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { z } from "zod"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { Column } from "@/components/data-table"
import { DataTable } from "@/components/data-table"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { ModalHeader } from "@/components/modal-header"
import { PageHeader } from "@/components/page-header"
import { StatCard, StatsGrid } from "@/components/stat-card"
import { platform } from "@/lib/api"
import type { Tenant } from "@/types"

const schema = z.object({
  name: z.string().min(2, "Name is required"),
  slug: z
    .string()
    .min(2, "Slug is required")
    .regex(/^[a-z0-9-]+$/, "Lowercase letters, numbers, and hyphens only"),
})
type FormValues = z.infer<typeof schema>

export function AdminTenantsPage() {
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)
  const tenantsQuery = useQuery({ queryKey: ["admin", "tenants"], queryFn: platform.tenants.list })

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", slug: "" },
  })

  const createTenant = useMutation({
    mutationFn: platform.tenants.create,
    onSuccess: () => {
      toast.success("Tenant created")
      queryClient.invalidateQueries({ queryKey: ["admin", "tenants"] })
      form.reset()
      setOpen(false)
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const suspend = useMutation({
    mutationFn: platform.tenants.suspend,
    onSuccess: () => {
      toast.success("Tenant suspended")
      queryClient.invalidateQueries({ queryKey: ["admin", "tenants"] })
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const activate = useMutation({
    mutationFn: platform.tenants.activate,
    onSuccess: () => {
      toast.success("Tenant activated")
      queryClient.invalidateQueries({ queryKey: ["admin", "tenants"] })
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const columns: Column<Tenant>[] = [
    { key: "name", header: "Name", render: (t) => <span className="font-medium">{t.name}</span> },
    { key: "slug", header: "Slug", render: (t) => <span className="text-muted-foreground">{t.slug}</span> },
    { key: "plan", header: "Plan", render: (t) => t.plan ?? "—" },
    {
      key: "status",
      header: "Status",
      render: (t) => <Badge variant={t.status === "active" ? "success" : "secondary"}>{t.status}</Badge>,
    },
    {
      key: "actions",
      header: "Actions",
      className: "text-right",
      render: (t) =>
        t.status === "active" ? (
          <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); suspend.mutate(t.id) }}>
            Suspend
          </Button>
        ) : (
          <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); activate.mutate(t.id) }}>
            Activate
          </Button>
        ),
    },
  ]

  const renderCard = (t: Tenant) => (
    <div className="space-y-2">
      <div className="flex items-start justify-between gap-2">
        <span className="font-medium">{t.name}</span>
        <Badge variant={t.status === "active" ? "success" : "secondary"}>{t.status}</Badge>
      </div>
      <div className="text-muted-foreground text-sm">{t.slug}</div>
      <div className="text-muted-foreground flex items-center justify-between text-xs">
        <span>{t.plan ?? "No plan"}</span>
        {t.status === "active" ? (
          <button
            className="text-foreground underline-offset-4 hover:underline"
            onClick={(e) => { e.stopPropagation(); suspend.mutate(t.id) }}
          >
            Suspend
          </button>
        ) : (
          <button
            className="text-foreground underline-offset-4 hover:underline"
            onClick={(e) => { e.stopPropagation(); activate.mutate(t.id) }}
          >
            Activate
          </button>
        )}
      </div>
    </div>
  )

  const allTenants = tenantsQuery.data ?? []
  const pagedTenants = allTenants.slice((page - 1) * pageSize, page * pageSize)

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[{ label: "Platform", to: "/admin" }, { label: "Tenants" }]}
        backTo="/admin"
        title="Tenants"
        description="Every workspace on the platform"
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger
              render={
                <Button>
                  <Plus /> New tenant
                </Button>
              }
            />
            <DialogContent className="gap-0 overflow-hidden p-0">
              <ModalHeader icon={Building2} title="New tenant" description="Create a new workspace" />
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit((values) => createTenant.mutate(values))}
                  className="space-y-4 p-4"
                >
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Acme Inc" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="slug"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Slug</FormLabel>
                        <FormControl>
                          <Input placeholder="acme" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <DialogFooter className="p-0">
                    <Button type="submit" disabled={createTenant.isPending}>
                      Create tenant
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        }
      />

      <StatsGrid>
        <StatCard
          label="Total tenants"
          value={tenantsQuery.data?.length ?? 0}
          icon={Building2}
          tone="primary"
          loading={tenantsQuery.isLoading}
        />
        <StatCard
          label="Active"
          value={tenantsQuery.data?.filter((t) => t.status === "active").length ?? 0}
          icon={CircleCheck}
          tone="green"
          loading={tenantsQuery.isLoading}
        />
        <StatCard
          label="Suspended"
          value={tenantsQuery.data?.filter((t) => t.status !== "active").length ?? 0}
          icon={CircleSlash}
          tone="coral"
          loading={tenantsQuery.isLoading}
        />
      </StatsGrid>

      <DataTable
        columns={columns}
        data={pagedTenants}
        rowKey={(t) => t.id}
        loading={tenantsQuery.isLoading}
        renderCard={renderCard}
        emptyIcon={Building2}
        emptyTitle="No tenants yet"
        emptyDescription="Create the first workspace to get started."
        page={page}
        pageSize={pageSize}
        total={allTenants.length}
        onPageChange={setPage}
        onPageSizeChange={(size) => {
          setPageSize(size)
          setPage(1)
        }}
      />
    </div>
  )
}
