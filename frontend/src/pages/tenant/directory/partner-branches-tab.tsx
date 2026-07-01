import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Building2, Mail, MapPin, MoreHorizontal, Phone, Plus } from "lucide-react"
import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { z } from "zod"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog"
import { ModalHeader } from "@/components/modal-header"
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
import { Skeleton } from "@/components/ui/skeleton"
import { partners as partnersApi } from "@/lib/api"
import { useAuth } from "@/lib/auth"
import type { PartnerBranch, PartnerBranchInput } from "@/types"

const schema = z.object({
  name: z.string().min(1, "Required"),
  town: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().optional(),
})
type FormValues = z.infer<typeof schema>

const empty: FormValues = { name: "", town: "", phone: "", email: "" }

export function PartnerBranchesTab({ partnerId }: { partnerId: string }) {
  const { hasPermission } = useAuth()
  const canWrite = hasPermission("partners:write")
  const canDelete = hasPermission("partners:delete")
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<PartnerBranch | undefined>()

  const branchesQuery = useQuery({
    queryKey: ["partners", partnerId, "branches"],
    queryFn: () => partnersApi.branches.list(partnerId),
  })

  const form = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: empty })

  useEffect(() => {
    if (open) {
      form.reset(editing ? { name: editing.name, town: editing.town, phone: editing.phone, email: editing.email } : empty)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editing])

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["partners", partnerId, "branches"] })

  const createMutation = useMutation({
    mutationFn: (input: PartnerBranchInput) => partnersApi.branches.create(partnerId, input),
    onSuccess: () => {
      toast.success("Branch added")
      invalidate()
      setOpen(false)
    },
    onError: (err: Error) => toast.error(err.message),
  })
  const updateMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: PartnerBranchInput }) =>
      partnersApi.branches.update(partnerId, id, input),
    onSuccess: () => {
      toast.success("Branch updated")
      invalidate()
      setOpen(false)
      setEditing(undefined)
    },
    onError: (err: Error) => toast.error(err.message),
  })
  const removeMutation = useMutation({
    mutationFn: (id: string) => partnersApi.branches.remove(partnerId, id),
    onSuccess: () => {
      toast.success("Branch removed")
      invalidate()
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const openCreate = () => {
    setEditing(undefined)
    setOpen(true)
  }
  const openEdit = (b: PartnerBranch) => {
    setEditing(b)
    setOpen(true)
  }

  const branches = branchesQuery.data ?? []

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Branches</h3>
        {canWrite && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger
              render={
                <Button size="sm" onClick={openCreate}>
                  <Plus /> New branch
                </Button>
              }
            />
            <DialogContent className="gap-0 overflow-hidden p-0">
              <ModalHeader
                icon={Building2}
                title={editing ? "Edit branch" : "New branch"}
                description="A branch or office location for this partner"
              />
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit((values) => {
                    if (editing) {
                      updateMutation.mutate({ id: editing.id, input: values })
                    } else {
                      createMutation.mutate(values)
                    }
                  })}
                  className="space-y-4 p-4"
                >
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Branch name</FormLabel>
                        <FormControl>
                          <Input placeholder="Kisumu Branch" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <FormField
                      control={form.control}
                      name="town"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Town</FormLabel>
                          <FormControl>
                            <Input placeholder="Kisumu" {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone</FormLabel>
                          <FormControl>
                            <Input placeholder="0xx" {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="branch@partner.com" {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <DialogFooter className="p-0">
                    <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                      {editing ? "Save changes" : "Add branch"}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {branchesQuery.isLoading && (
        <div className="space-y-2">
          <Skeleton className="h-16 w-full rounded-lg" />
          <Skeleton className="h-16 w-full rounded-lg" />
        </div>
      )}

      {!branchesQuery.isLoading && branches.length === 0 && (
        <div className="text-muted-foreground rounded-lg border border-dashed py-8 text-center text-sm">
          No branches yet.
        </div>
      )}

      <div className="space-y-2">
        {branches.map((b) => (
          <div key={b.id} className="flex items-start justify-between gap-3 rounded-lg border p-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 font-medium">
                <Building2 className="text-muted-foreground size-4" />
                {b.name}
              </div>
              <div className="text-muted-foreground mt-0.5 flex flex-wrap gap-x-4 text-xs">
                {b.town && (
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="size-3" />
                    {b.town}
                  </span>
                )}
                {b.phone && (
                  <span className="inline-flex items-center gap-1">
                    <Phone className="size-3" />
                    {b.phone}
                  </span>
                )}
                {b.email && (
                  <span className="inline-flex items-center gap-1">
                    <Mail className="size-3" />
                    {b.email}
                  </span>
                )}
              </div>
            </div>
            {(canWrite || canDelete) && (
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button variant="ghost" size="icon">
                      <MoreHorizontal />
                    </Button>
                  }
                />
                <DropdownMenuContent align="end">
                  {canWrite && <DropdownMenuItem onClick={() => openEdit(b)}>Edit</DropdownMenuItem>}
                  {canDelete && (
                    <DropdownMenuItem variant="destructive" onClick={() => removeMutation.mutate(b.id)}>
                      Delete
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
