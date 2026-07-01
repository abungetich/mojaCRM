import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { CheckSquare, ListChecks, MoreHorizontal, Paperclip, Plus } from "lucide-react"
import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { z } from "zod"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { partners as partnersApi } from "@/lib/api"
import { useAuth } from "@/lib/auth"
import type { PartnerRequirement, PartnerRequirementInput } from "@/types"

const schema = z.object({
  label: z.string().min(1, "A label is required"),
  detail: z.string().optional(),
  kind: z.enum(["check", "appendix"]),
})
type FormValues = z.infer<typeof schema>

const empty: FormValues = { label: "", detail: "", kind: "check" }

// Firm-side management of a partner's requirement pack — the mandatory
// confirmations + appendices that apply to work done for that partner.
export function PartnerRequirementsTab({ partnerId }: { partnerId: string }) {
  const { hasPermission } = useAuth()
  const canWrite = hasPermission("partners:write")
  const canDelete = hasPermission("partners:delete")
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<PartnerRequirement | undefined>()

  const requirementsQuery = useQuery({
    queryKey: ["partners", partnerId, "requirements"],
    queryFn: () => partnersApi.requirements.list(partnerId),
  })

  const form = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: empty })

  useEffect(() => {
    if (open) {
      form.reset(editing ? { label: editing.label, detail: editing.detail, kind: editing.kind } : empty)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editing])

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["partners", partnerId, "requirements"] })

  const rows = requirementsQuery.data ?? []

  const createMutation = useMutation({
    mutationFn: (input: PartnerRequirementInput) => partnersApi.requirements.create(partnerId, input),
    onSuccess: () => {
      toast.success("Requirement added")
      invalidate()
      setOpen(false)
    },
    onError: (err: Error) => toast.error(err.message),
  })
  const updateMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: PartnerRequirementInput }) =>
      partnersApi.requirements.update(partnerId, id, input),
    onSuccess: () => {
      toast.success("Requirement updated")
      invalidate()
      setOpen(false)
      setEditing(undefined)
    },
    onError: (err: Error) => toast.error(err.message),
  })
  const removeMutation = useMutation({
    mutationFn: (id: string) => partnersApi.requirements.remove(partnerId, id),
    onSuccess: () => {
      toast.success("Requirement removed")
      invalidate()
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const openCreate = () => {
    setEditing(undefined)
    setOpen(true)
  }
  const openEdit = (r: PartnerRequirement) => {
    setEditing(r)
    setOpen(true)
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="flex items-center gap-2 text-base">
            <ListChecks className="size-4" /> Requirements ({rows.length})
          </CardTitle>
          <p className="text-muted-foreground mt-1 text-sm">
            Confirmations &amp; appendices this partner requires on work done for them.
          </p>
        </div>
        {canWrite && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger
              render={
                <Button size="sm" onClick={openCreate}>
                  <Plus /> Add
                </Button>
              }
            />
            <DialogContent className="gap-0 overflow-hidden p-0">
              <ModalHeader
                icon={ListChecks}
                title={editing ? "Edit requirement" : "Add requirement"}
                description="Applies to every job done for this partner"
              />
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit((values) => {
                    if (editing) {
                      updateMutation.mutate({ id: editing.id, input: values })
                    } else {
                      createMutation.mutate({ ...values, sort_order: rows.length })
                    }
                  })}
                  className="space-y-4 p-4"
                >
                  <FormField
                    control={form.control}
                    name="label"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Requirement</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. Attach a completed compliance form" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="kind"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Type</FormLabel>
                        <Select
                          items={[
                            { value: "check", label: "Confirmation / check" },
                            { value: "appendix", label: "Appendix / document to attach" },
                          ]}
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger className="w-full">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="check">Confirmation / check</SelectItem>
                            <SelectItem value="appendix">Appendix / document to attach</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="detail"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Note (optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="Any guidance for the team" {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <DialogFooter className="p-0">
                    <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                      {editing ? "Save" : "Add"}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        )}
      </CardHeader>
      <CardContent className="p-0">
        {requirementsQuery.isLoading ? (
          <div className="space-y-2 p-4">
            <Skeleton className="h-12 w-full rounded-lg" />
            <Skeleton className="h-12 w-full rounded-lg" />
          </div>
        ) : rows.length === 0 ? (
          <p className="text-muted-foreground px-4 py-6 text-sm">
            No requirements yet. Add the partner's mandatory confirmations and appendices so they're tracked
            consistently.
          </p>
        ) : (
          <div className="divide-y">
            {rows.map((r) => (
              <div key={r.id} className="flex items-start gap-3 px-4 py-3">
                {r.kind === "appendix" ? (
                  <Paperclip className="text-muted-foreground mt-0.5 size-4" />
                ) : (
                  <CheckSquare className="text-muted-foreground mt-0.5 size-4" />
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{r.label}</span>
                    <Badge variant="outline">{r.kind === "appendix" ? "Appendix" : "Confirmation"}</Badge>
                  </div>
                  {r.detail && <p className="text-muted-foreground text-sm">{r.detail}</p>}
                </div>
                {(canWrite || canDelete) && (
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      render={
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="size-4" />
                        </Button>
                      }
                    />
                    <DropdownMenuContent align="end">
                      {canWrite && <DropdownMenuItem onClick={() => openEdit(r)}>Edit</DropdownMenuItem>}
                      {canDelete && (
                        <DropdownMenuItem variant="destructive" onClick={() => removeMutation.mutate(r.id)}>
                          Delete
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
