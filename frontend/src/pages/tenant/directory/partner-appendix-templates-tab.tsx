import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { FileText, MoreHorizontal, Plus, Trash2 } from "lucide-react"
import { useEffect, useState } from "react"
import { useFieldArray, useForm } from "react-hook-form"
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
import type { PartnerAppendixTemplate, PartnerAppendixTemplateInput } from "@/types"

const FIELD_TYPES = [
  { value: "text", label: "Short text" },
  { value: "textarea", label: "Paragraph" },
  { value: "checkbox", label: "Yes / No" },
] as const

const schema = z.object({
  name: z.string().min(1, "A template name is required"),
  description: z.string().optional(),
  fields: z
    .array(
      z.object({
        label: z.string().min(1, "Field label is required"),
        type: z.enum(["text", "textarea", "checkbox"]),
      })
    )
    .min(1, "Add at least one field"),
})
type FormValues = z.infer<typeof schema>

const empty: FormValues = { name: "", description: "", fields: [{ label: "", type: "text" }] }

// Firm-side management of a partner's report appendix templates — fillable
// forms (e.g. an Environmental & Social appendix) required by that partner.
export function PartnerAppendixTemplatesTab({ partnerId }: { partnerId: string }) {
  const { hasPermission } = useAuth()
  const canWrite = hasPermission("partners:write")
  const canDelete = hasPermission("partners:delete")
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<PartnerAppendixTemplate | undefined>()

  const templatesQuery = useQuery({
    queryKey: ["partners", partnerId, "appendix-templates"],
    queryFn: () => partnersApi.appendixTemplates.list(partnerId),
  })

  const form = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: empty })
  const fieldArray = useFieldArray({ control: form.control, name: "fields" })

  useEffect(() => {
    if (open) {
      form.reset(
        editing
          ? { name: editing.name, description: editing.description, fields: editing.fields.length ? editing.fields : [{ label: "", type: "text" }] }
          : empty
      )
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editing])

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["partners", partnerId, "appendix-templates"] })

  const rows = templatesQuery.data ?? []

  const createMutation = useMutation({
    mutationFn: (input: PartnerAppendixTemplateInput) => partnersApi.appendixTemplates.create(partnerId, input),
    onSuccess: () => {
      toast.success("Template added")
      invalidate()
      setOpen(false)
    },
    onError: (err: Error) => toast.error(err.message),
  })
  const updateMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: PartnerAppendixTemplateInput }) =>
      partnersApi.appendixTemplates.update(partnerId, id, input),
    onSuccess: () => {
      toast.success("Template updated")
      invalidate()
      setOpen(false)
      setEditing(undefined)
    },
    onError: (err: Error) => toast.error(err.message),
  })
  const removeMutation = useMutation({
    mutationFn: (id: string) => partnersApi.appendixTemplates.remove(partnerId, id),
    onSuccess: () => {
      toast.success("Template removed")
      invalidate()
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const openCreate = () => {
    setEditing(undefined)
    setOpen(true)
  }
  const openEdit = (t: PartnerAppendixTemplate) => {
    setEditing(t)
    setOpen(true)
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="size-4" /> Appendix templates ({rows.length})
          </CardTitle>
          <p className="text-muted-foreground mt-1 text-sm">
            Fillable appendix forms this partner requires (e.g. an Environmental &amp; Social appendix).
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
            <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-lg">
              <ModalHeader
                icon={FileText}
                title={editing ? "Edit appendix template" : "New appendix template"}
                description="A fillable form attached to this partner's requirements"
              />
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit((values) => {
                    const cleanFields = values.fields.map((f) => ({ label: f.label.trim(), type: f.type }))
                    const input = { ...values, fields: cleanFields }
                    if (editing) {
                      updateMutation.mutate({ id: editing.id, input })
                    } else {
                      createMutation.mutate({ ...input, sort_order: rows.length })
                    }
                  })}
                  className="space-y-4 p-4"
                >
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Name</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. Environmental & Social Appendix" {...field} />
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
                        <FormLabel>Description (optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="Any guidance for the team" {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <div className="space-y-1.5">
                    <FormLabel>Fields</FormLabel>
                    <div className="space-y-2">
                      {fieldArray.fields.map((item, index) => (
                        <div key={item.id} className="flex items-center gap-2">
                          <FormField
                            control={form.control}
                            name={`fields.${index}.label`}
                            render={({ field }) => (
                              <FormItem className="flex-1">
                                <FormControl>
                                  <Input placeholder="Field label" {...field} />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name={`fields.${index}.type`}
                            render={({ field }) => (
                              <FormItem>
                                <Select items={FIELD_TYPES.map((t) => ({ ...t }))} onValueChange={field.onChange} value={field.value}>
                                  <FormControl>
                                    <SelectTrigger className="w-36">
                                      <SelectValue />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {FIELD_TYPES.map((t) => (
                                      <SelectItem key={t.value} value={t.value}>
                                        {t.label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </FormItem>
                            )}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="text-destructive shrink-0"
                            disabled={fieldArray.fields.length <= 1}
                            onClick={() => fieldArray.remove(index)}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      ))}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => fieldArray.append({ label: "", type: "text" })}
                      >
                        <Plus className="size-3.5" /> Add field
                      </Button>
                    </div>
                  </div>
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
        {templatesQuery.isLoading ? (
          <div className="space-y-2 p-4">
            <Skeleton className="h-12 w-full rounded-lg" />
            <Skeleton className="h-12 w-full rounded-lg" />
          </div>
        ) : rows.length === 0 ? (
          <p className="text-muted-foreground px-4 py-6 text-sm">
            No appendix templates yet. Add a fillable form so it's tracked for this partner's work.
          </p>
        ) : (
          <div className="divide-y">
            {rows.map((t) => (
              <div key={t.id} className="flex items-start gap-3 px-4 py-3">
                <FileText className="text-muted-foreground mt-0.5 size-4" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{t.name}</span>
                    <Badge variant="outline">
                      {t.fields.length} field{t.fields.length === 1 ? "" : "s"}
                    </Badge>
                  </div>
                  {t.description && <p className="text-muted-foreground text-sm">{t.description}</p>}
                  {t.fields.length > 0 && (
                    <p className="text-muted-foreground mt-0.5 truncate text-xs">
                      {t.fields.map((f) => f.label).join(" · ")}
                    </p>
                  )}
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
                      {canWrite && <DropdownMenuItem onClick={() => openEdit(t)}>Edit</DropdownMenuItem>}
                      {canDelete && (
                        <DropdownMenuItem variant="destructive" onClick={() => removeMutation.mutate(t.id)}>
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
