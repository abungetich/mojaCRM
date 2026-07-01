import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { KeyRound, Plus, ShieldCheck, ShieldPlus } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { z } from "zod"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
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
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { ModalHeader } from "@/components/modal-header"
import { PageHeader } from "@/components/page-header"
import { StatCard, StatsGrid } from "@/components/stat-card"
import { roles as rolesApi } from "@/lib/api"
import { useAuth } from "@/lib/auth"

const schema = z.object({
  name: z.string().min(2, "Name is required"),
  description: z.string().optional(),
  permission_keys: z.array(z.string()).min(1, "Select at least one permission"),
})
type FormValues = z.infer<typeof schema>

export function RolesPage() {
  const { hasPermission } = useAuth()
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)

  const rolesQuery = useQuery({ queryKey: ["roles"], queryFn: rolesApi.list })
  const permissionsQuery = useQuery({ queryKey: ["permissions"], queryFn: rolesApi.permissions })

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", description: "", permission_keys: [] },
  })

  useEffect(() => {
    if (open) form.reset({ name: "", description: "", permission_keys: [] })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const selectedKeys = form.watch("permission_keys")

  const grouped = useMemo(() => {
    const groups: Record<string, typeof permissionsQuery.data> = {}
    for (const p of permissionsQuery.data ?? []) {
      const resource = p.key.split(":")[0]
      groups[resource] = [...(groups[resource] ?? []), p]
    }
    return groups
  }, [permissionsQuery.data])

  const createRole = useMutation({
    mutationFn: rolesApi.create,
    onSuccess: () => {
      toast.success("Role created")
      queryClient.invalidateQueries({ queryKey: ["roles"] })
      setOpen(false)
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const toggleKey = (key: string) => {
    const next = selectedKeys.includes(key)
      ? selectedKeys.filter((k) => k !== key)
      : [...selectedKeys, key]
    form.setValue("permission_keys", next, { shouldValidate: true })
  }

  const canWrite = hasPermission("roles:write")

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[{ label: "Dashboard", to: "/" }, { label: "Roles & Permissions" }]}
        backTo="/"
        title="Roles & Permissions"
        description="Control what each role can see and do"
        actions={
          canWrite && (
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger
                render={
                  <Button>
                    <Plus /> New role
                  </Button>
                }
              />
              <DialogContent className="max-h-[80vh] max-w-lg gap-0 overflow-y-auto p-0">
                <ModalHeader icon={ShieldPlus} title="Create role" description="Define a custom permission set" />
                <Form {...form}>
                  <form
                    onSubmit={form.handleSubmit((values) => createRole.mutate(values))}
                    className="space-y-4 p-4"
                  >
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Name</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g. Sales Manager" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Description</FormLabel>
                          <FormControl>
                            <Input placeholder="Optional" {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <div className="space-y-3">
                      <Label>Permissions</Label>
                      {Object.entries(grouped).map(([resource, perms]) => (
                        <div key={resource} className="space-y-1.5 rounded-lg border p-3">
                          <div className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
                            {resource}
                          </div>
                          {perms?.map((p) => (
                            <label key={p.key} className="flex items-center gap-2 text-sm">
                              <Checkbox
                                checked={selectedKeys.includes(p.key)}
                                onCheckedChange={() => toggleKey(p.key)}
                              />
                              {p.description || p.key}
                            </label>
                          ))}
                        </div>
                      ))}
                      {form.formState.errors.permission_keys && (
                        <p className="text-destructive text-sm">
                          {form.formState.errors.permission_keys.message}
                        </p>
                      )}
                    </div>
                    <DialogFooter className="p-0">
                      <Button type="submit" disabled={createRole.isPending}>
                        Create role
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
          label="Total roles"
          value={rolesQuery.data?.length ?? 0}
          icon={ShieldCheck}
          tone="primary"
          loading={rolesQuery.isLoading}
        />
        <StatCard
          label="System roles"
          value={rolesQuery.data?.filter((r) => r.is_system).length ?? 0}
          icon={ShieldPlus}
          tone="info"
          loading={rolesQuery.isLoading}
        />
        <StatCard
          label="Permissions"
          value={permissionsQuery.data?.length ?? 0}
          icon={KeyRound}
          tone="teal"
          loading={permissionsQuery.isLoading}
        />
      </StatsGrid>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {rolesQuery.isLoading &&
          Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-32 w-full rounded-lg" />)}
        {rolesQuery.data?.map((role) => (
          <Card key={role.id}>
            <CardHeader className="flex-row items-center gap-2 space-y-0">
              <ShieldCheck className="text-primary size-4" />
              <CardTitle className="text-base">{role.name}</CardTitle>
              {role.is_system && (
                <Badge variant="secondary" className="ml-auto">
                  System
                </Badge>
              )}
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-2 text-sm">{role.description || "No description"}</p>
              <p className="text-xs text-muted-foreground">{role.permission_keys.length} permissions</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
