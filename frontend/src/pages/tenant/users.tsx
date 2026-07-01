import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { MailQuestion, MoreHorizontal, Plus, UserCheck, UserPlus, Users as UsersIcon } from "lucide-react"
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
import { ModalHeader } from "@/components/modal-header"
import { PageHeader } from "@/components/page-header"
import { StatCard, StatsGrid } from "@/components/stat-card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { roles as rolesApi, users as usersApi } from "@/lib/api"
import { useAuth } from "@/lib/auth"
import type { User } from "@/types"

const schema = z.object({
  name: z.string().min(2, "Name is required"),
  email: z.string().email("Enter a valid email"),
  role_id: z.string().min(1, "Select a role"),
})
type FormValues = z.infer<typeof schema>

export function UsersPage() {
  const { hasPermission } = useAuth()
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)

  const usersQuery = useQuery({ queryKey: ["users"], queryFn: usersApi.list })
  const rolesQuery = useQuery({ queryKey: ["roles"], queryFn: rolesApi.list })

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", email: "", role_id: "" },
  })

  const createUser = useMutation({
    mutationFn: usersApi.create,
    onSuccess: () => {
      toast.success("User invited")
      queryClient.invalidateQueries({ queryKey: ["users"] })
      form.reset()
      setOpen(false)
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const removeUser = useMutation({
    mutationFn: usersApi.remove,
    onSuccess: () => {
      toast.success("User removed")
      queryClient.invalidateQueries({ queryKey: ["users"] })
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const canWrite = hasPermission("users:write")
  const activeCount = usersQuery.data?.filter((u) => u.status === "active").length ?? 0
  const pendingCount = usersQuery.data?.filter((u) => u.status !== "active").length ?? 0

  const columns: Column<User>[] = [
    { key: "name", header: "Name", render: (u) => <span className="font-medium">{u.name}</span> },
    { key: "email", header: "Email", render: (u) => <span className="text-muted-foreground">{u.email}</span> },
    { key: "role", header: "Role", render: (u) => u.role_name ?? "—" },
    {
      key: "status",
      header: "Status",
      render: (u) => <Badge variant={u.status === "active" ? "success" : "secondary"}>{u.status}</Badge>,
    },
  ]

  if (canWrite) {
    columns.push({
      key: "actions",
      header: "",
      className: "text-right",
      render: (u) => (
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button variant="ghost" size="icon" onClick={(e) => e.stopPropagation()}>
                <MoreHorizontal />
              </Button>
            }
          />
          <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
            <DropdownMenuItem variant="destructive" onClick={() => removeUser.mutate(u.id)}>
              Remove
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    })
  }

  const renderCard = (u: User) => (
    <div className="space-y-2">
      <div className="flex items-start justify-between gap-2">
        <span className="font-medium">{u.name}</span>
        <Badge variant={u.status === "active" ? "success" : "secondary"}>{u.status}</Badge>
      </div>
      <div className="text-muted-foreground text-sm">{u.email}</div>
      <div className="text-muted-foreground flex items-center justify-between text-xs">
        <span>{u.role_name ?? "No role"}</span>
        {canWrite && (
          <button
            className="text-destructive underline-offset-4 hover:underline"
            onClick={(e) => {
              e.stopPropagation()
              removeUser.mutate(u.id)
            }}
          >
            Remove
          </button>
        )}
      </div>
    </div>
  )

  const allUsers = usersQuery.data ?? []
  const pagedUsers = allUsers.slice((page - 1) * pageSize, page * pageSize)

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[{ label: "Dashboard", to: "/" }, { label: "Users" }]}
        backTo="/"
        title="Users"
        description="Manage who has access to this workspace"
        actions={
          canWrite && (
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger
                render={
                  <Button>
                    <Plus /> Invite user
                  </Button>
                }
              />
              <DialogContent className="gap-0 overflow-hidden p-0">
                <ModalHeader icon={UserPlus} title="Invite user" description="Send a workspace invitation" />
                <Form {...form}>
                  <form
                    onSubmit={form.handleSubmit((values) => createUser.mutate(values))}
                    className="space-y-4 p-4"
                  >
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Full name</FormLabel>
                        <FormControl>
                          <Input placeholder="Jane Doe" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="jane@company.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="role_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Role</FormLabel>
                        <Select
                          items={rolesQuery.data?.map((r) => ({ value: r.id, label: r.name })) ?? []}
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select a role" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {rolesQuery.data?.map((r) => (
                              <SelectItem key={r.id} value={r.id}>
                                {r.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <DialogFooter className="p-0">
                    <Button type="submit" disabled={createUser.isPending}>
                      Send invite
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
          )
        }
      />

      <StatsGrid>
        <StatCard
          label="Total users"
          value={usersQuery.data?.length ?? 0}
          icon={UsersIcon}
          tone="primary"
          loading={usersQuery.isLoading}
        />
        <StatCard label="Active" value={activeCount} icon={UserCheck} tone="green" loading={usersQuery.isLoading} />
        <StatCard
          label="Pending"
          value={pendingCount}
          icon={MailQuestion}
          tone="coral"
          loading={usersQuery.isLoading}
        />
      </StatsGrid>

      <DataTable
        columns={columns}
        data={pagedUsers}
        rowKey={(u) => u.id}
        loading={usersQuery.isLoading}
        renderCard={renderCard}
        emptyIcon={UsersIcon}
        emptyTitle="No users yet"
        emptyDescription="Invite a teammate to get them access to this workspace."
        page={page}
        pageSize={pageSize}
        total={allUsers.length}
        onPageChange={setPage}
        onPageSizeChange={(size) => {
          setPageSize(size)
          setPage(1)
        }}
      />
    </div>
  )
}
