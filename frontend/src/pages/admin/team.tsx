import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Plus, UserCheck, UserPlus, Users as UsersIcon } from "lucide-react"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { z } from "zod"

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
import type { User } from "@/types"

const schema = z.object({
  name: z.string().min(2, "Name is required"),
  email: z.string().email("Enter a valid email"),
  password: z.string().min(8, "At least 8 characters"),
})
type FormValues = z.infer<typeof schema>

export function AdminTeamPage() {
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)
  const teamQuery = useQuery({ queryKey: ["admin", "team"], queryFn: platform.team.list })

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", email: "", password: "" },
  })

  const createMember = useMutation({
    mutationFn: platform.team.create,
    onSuccess: () => {
      toast.success("Team member added")
      queryClient.invalidateQueries({ queryKey: ["admin", "team"] })
      form.reset()
      setOpen(false)
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const columns: Column<User>[] = [
    { key: "name", header: "Name", render: (u) => <span className="font-medium">{u.name}</span> },
    { key: "email", header: "Email", render: (u) => <span className="text-muted-foreground">{u.email}</span> },
    { key: "status", header: "Status", render: (u) => u.status },
  ]

  const renderCard = (u: User) => (
    <div className="space-y-2">
      <div className="flex items-start justify-between gap-2">
        <span className="font-medium">{u.name}</span>
        <span className="text-muted-foreground text-sm">{u.status}</span>
      </div>
      <div className="text-muted-foreground text-sm">{u.email}</div>
    </div>
  )

  const allMembers = teamQuery.data ?? []
  const pagedMembers = allMembers.slice((page - 1) * pageSize, page * pageSize)

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[{ label: "Platform", to: "/admin" }, { label: "Team" }]}
        backTo="/admin"
        title="Platform team"
        description="Internal staff with platform admin access"
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger
              render={
                <Button>
                  <Plus /> Add member
                </Button>
              }
            />
            <DialogContent className="gap-0 overflow-hidden p-0">
              <ModalHeader icon={UserPlus} title="Add team member" description="Grant platform admin access" />
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit((values) => createMember.mutate(values))}
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
                          <Input type="email" placeholder="jane@mojacrm.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Temporary password</FormLabel>
                        <FormControl>
                          <Input type="password" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <DialogFooter className="p-0">
                    <Button type="submit" disabled={createMember.isPending}>
                      Add member
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
          label="Total members"
          value={teamQuery.data?.length ?? 0}
          icon={UsersIcon}
          tone="primary"
          loading={teamQuery.isLoading}
        />
        <StatCard
          label="Active"
          value={teamQuery.data?.filter((u) => u.status === "active").length ?? 0}
          icon={UserCheck}
          tone="green"
          loading={teamQuery.isLoading}
        />
      </StatsGrid>

      <DataTable
        columns={columns}
        data={pagedMembers}
        rowKey={(u) => u.id}
        loading={teamQuery.isLoading}
        renderCard={renderCard}
        emptyIcon={UsersIcon}
        emptyTitle="No team members yet"
        emptyDescription="Add a platform admin to get started."
        page={page}
        pageSize={pageSize}
        total={allMembers.length}
        onPageChange={setPage}
        onPageSizeChange={(size) => {
          setPageSize(size)
          setPage(1)
        }}
      />
    </div>
  )
}
