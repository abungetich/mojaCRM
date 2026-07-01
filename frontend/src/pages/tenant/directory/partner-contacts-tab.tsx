import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Mail, MessageCircle, MoreHorizontal, Phone, Plus, UserRound } from "lucide-react"
import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { z } from "zod"

import { Badge } from "@/components/ui/badge"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { partners as partnersApi } from "@/lib/api"
import { useAuth } from "@/lib/auth"
import type { PartnerContact, PartnerContactInput } from "@/types"

const CHANNEL_ICON = { email: Mail, phone: Phone, whatsapp: MessageCircle } as const

const schema = z.object({
  first_name: z.string().min(1, "Required"),
  middle_name: z.string().optional(),
  last_name: z.string().optional(),
  title: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  whatsapp: z.string().optional(),
  preferred_channel: z.enum(["email", "phone", "whatsapp"]),
  is_active: z.boolean(),
  inactive_reason: z.string().optional(),
})
type FormValues = z.infer<typeof schema>

const empty: FormValues = {
  first_name: "",
  middle_name: "",
  last_name: "",
  title: "",
  email: "",
  phone: "",
  whatsapp: "",
  preferred_channel: "email",
  is_active: true,
  inactive_reason: "",
}

export function PartnerContactsTab({ partnerId }: { partnerId: string }) {
  const { hasPermission } = useAuth()
  const canWrite = hasPermission("partners:write")
  const canDelete = hasPermission("partners:delete")
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<PartnerContact | undefined>()

  const contactsQuery = useQuery({
    queryKey: ["partners", partnerId, "contacts"],
    queryFn: () => partnersApi.contacts.list(partnerId),
  })

  const form = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: empty })
  const isActive = form.watch("is_active")

  useEffect(() => {
    if (open) {
      form.reset(
        editing
          ? {
              first_name: editing.first_name,
              middle_name: editing.middle_name,
              last_name: editing.last_name,
              title: editing.title,
              email: editing.email,
              phone: editing.phone,
              whatsapp: editing.whatsapp,
              preferred_channel: editing.preferred_channel,
              is_active: editing.is_active,
              inactive_reason: editing.inactive_reason,
            }
          : empty
      )
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editing])

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["partners", partnerId, "contacts"] })

  const createMutation = useMutation({
    mutationFn: (input: PartnerContactInput) => partnersApi.contacts.create(partnerId, input),
    onSuccess: () => {
      toast.success("Contact added")
      invalidate()
      setOpen(false)
    },
    onError: (err: Error) => toast.error(err.message),
  })
  const updateMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: PartnerContactInput }) =>
      partnersApi.contacts.update(partnerId, id, input),
    onSuccess: () => {
      toast.success("Contact updated")
      invalidate()
      setOpen(false)
      setEditing(undefined)
    },
    onError: (err: Error) => toast.error(err.message),
  })
  const removeMutation = useMutation({
    mutationFn: (id: string) => partnersApi.contacts.remove(partnerId, id),
    onSuccess: () => {
      toast.success("Contact removed")
      invalidate()
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const openCreate = () => {
    setEditing(undefined)
    setOpen(true)
  }
  const openEdit = (c: PartnerContact) => {
    setEditing(c)
    setOpen(true)
  }

  const contacts = contactsQuery.data ?? []
  const fullName = (c: PartnerContact) => [c.first_name, c.middle_name, c.last_name].filter(Boolean).join(" ")

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Contacts</h3>
        {canWrite && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger
              render={
                <Button size="sm" onClick={openCreate}>
                  <Plus /> New contact
                </Button>
              }
            />
            <DialogContent className="gap-0 overflow-hidden p-0">
              <ModalHeader
                icon={UserRound}
                title={editing ? "Edit contact" : "New contact"}
                description="A contact person for this partner"
              />
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit((values) => {
                    const input: PartnerContactInput = {
                      ...values,
                      inactive_reason: values.is_active ? "" : values.inactive_reason ?? "",
                    }
                    if (editing) {
                      updateMutation.mutate({ id: editing.id, input })
                    } else {
                      createMutation.mutate(input)
                    }
                  })}
                  className="space-y-4 p-4"
                >
                  <div className="grid grid-cols-3 gap-3">
                    <FormField
                      control={form.control}
                      name="first_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>First name</FormLabel>
                          <FormControl>
                            <Input placeholder="Mary" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="middle_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Middle</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="last_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Surname</FormLabel>
                          <FormControl>
                            <Input placeholder="Wanjiru" {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Title / role</FormLabel>
                        <FormControl>
                          <Input placeholder="Relationship Manager" {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-3 gap-3">
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input type="email" placeholder="name@partner.com" {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Telephone</FormLabel>
                          <FormControl>
                            <Input placeholder="020…" {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="whatsapp"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>WhatsApp</FormLabel>
                          <FormControl>
                            <Input placeholder="07xx…" {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name="preferred_channel"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Preferred channel</FormLabel>
                        <Select
                          items={[
                            { value: "email", label: "Email" },
                            { value: "phone", label: "Telephone" },
                            { value: "whatsapp", label: "WhatsApp" },
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
                            <SelectItem value="email">Email</SelectItem>
                            <SelectItem value="phone">Telephone</SelectItem>
                            <SelectItem value="whatsapp">WhatsApp</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="is_active"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                        <FormLabel className="mb-0">Active contact</FormLabel>
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  {!isActive && (
                    <FormField
                      control={form.control}
                      name="inactive_reason"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Reason inactive</FormLabel>
                          <FormControl>
                            <Textarea rows={2} placeholder="e.g. Left the organisation" {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  )}
                  <DialogFooter className="p-0">
                    <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                      {editing ? "Save changes" : "Add contact"}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {contactsQuery.isLoading && (
        <div className="space-y-2">
          <Skeleton className="h-16 w-full rounded-lg" />
          <Skeleton className="h-16 w-full rounded-lg" />
        </div>
      )}

      {!contactsQuery.isLoading && contacts.length === 0 && (
        <div className="text-muted-foreground rounded-lg border border-dashed py-8 text-center text-sm">
          No contacts yet.
        </div>
      )}

      <div className="space-y-2">
        {contacts.map((c) => {
          const ChannelIcon = CHANNEL_ICON[c.preferred_channel] ?? Mail
          return (
            <div key={c.id} className="flex items-start justify-between gap-3 rounded-lg border p-3">
              <div className="flex items-start gap-3">
                <div className="bg-muted flex size-9 shrink-0 items-center justify-center rounded-full">
                  <UserRound className="text-muted-foreground size-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2 font-medium">
                    {fullName(c)}
                    {!c.is_active && <Badge variant="outline">Inactive</Badge>}
                  </div>
                  <div className="text-muted-foreground text-sm">{c.title || "—"}</div>
                  <div className="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-0.5 text-sm">
                    {c.email && (
                      <span className="inline-flex items-center gap-1">
                        <Mail className="size-3" />
                        {c.email}
                      </span>
                    )}
                    {c.phone && (
                      <span className="inline-flex items-center gap-1">
                        <Phone className="size-3" />
                        {c.phone}
                      </span>
                    )}
                    <span className="text-primary inline-flex items-center gap-1">
                      <ChannelIcon className="size-3" /> prefers {c.preferred_channel}
                    </span>
                  </div>
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
                    {canWrite && <DropdownMenuItem onClick={() => openEdit(c)}>Edit</DropdownMenuItem>}
                    {canDelete && (
                      <DropdownMenuItem variant="destructive" onClick={() => removeMutation.mutate(c.id)}>
                        Delete
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
