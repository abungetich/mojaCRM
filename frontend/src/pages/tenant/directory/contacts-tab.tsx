import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { MoreHorizontal, Phone, Plus, Star, UserRound } from "lucide-react"
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
import { Skeleton } from "@/components/ui/skeleton"
import { customers as customersApi } from "@/lib/api"
import { useAuth } from "@/lib/auth"
import type { Contact, ContactInput } from "@/types"

const schema = z.object({
  first_name: z.string().min(1, "Required"),
  last_name: z.string().min(1, "Required"),
  job_title: z.string().optional(),
  department: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().min(1, "Required"),
  alternative_phone: z.string().optional(),
})
type FormValues = z.infer<typeof schema>

export function ContactsTab({ customerId }: { customerId: string }) {
  const { hasPermission } = useAuth()
  const canWrite = hasPermission("customers:write")
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Contact | undefined>()

  const contactsQuery = useQuery({
    queryKey: ["customers", customerId, "contacts"],
    queryFn: () => customersApi.contacts.list(customerId),
  })

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { first_name: "", last_name: "", job_title: "", department: "", email: "", phone: "", alternative_phone: "" },
  })

  useEffect(() => {
    if (open) {
      form.reset(
        editing
          ? {
              first_name: editing.first_name,
              last_name: editing.last_name,
              job_title: editing.job_title,
              department: editing.department,
              email: editing.email,
              phone: editing.phone,
              alternative_phone: editing.alternative_phone,
            }
          : { first_name: "", last_name: "", job_title: "", department: "", email: "", phone: "", alternative_phone: "" }
      )
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editing])

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["customers", customerId, "contacts"] })

  const createMutation = useMutation({
    mutationFn: (input: ContactInput) => customersApi.contacts.create(customerId, input),
    onSuccess: () => {
      toast.success("Contact added")
      invalidate()
      setOpen(false)
    },
    onError: (err: Error) => toast.error(err.message),
  })
  const updateMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: ContactInput }) =>
      customersApi.contacts.update(customerId, id, input),
    onSuccess: () => {
      toast.success("Contact updated")
      invalidate()
      setOpen(false)
      setEditing(undefined)
    },
    onError: (err: Error) => toast.error(err.message),
  })
  const removeMutation = useMutation({
    mutationFn: (id: string) => customersApi.contacts.remove(customerId, id),
    onSuccess: () => {
      toast.success("Contact removed")
      invalidate()
    },
    onError: (err: Error) => toast.error(err.message),
  })
  const primaryMutation = useMutation({
    mutationFn: (id: string) => customersApi.contacts.setPrimary(customerId, id),
    onSuccess: () => {
      toast.success("Primary contact updated")
      invalidate()
    },
    onError: (err: Error) => toast.error(err.message),
  })
  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: "active" | "inactive" }) =>
      customersApi.contacts.setStatus(customerId, id, status),
    onSuccess: () => {
      invalidate()
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const openCreate = () => {
    setEditing(undefined)
    setOpen(true)
  }
  const openEdit = (c: Contact) => {
    setEditing(c)
    setOpen(true)
  }

  const contacts = contactsQuery.data ?? []

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Contacts</h3>
        {canWrite && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger
              render={
                <Button size="sm" onClick={openCreate}>
                  <Plus /> Add contact
                </Button>
              }
            />
            <DialogContent className="gap-0 overflow-hidden p-0">
              <ModalHeader
                icon={UserRound}
                title={editing ? "Edit contact" : "Add contact"}
                description="A person linked to this customer"
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
                  <div className="grid grid-cols-2 gap-3">
                    <FormField
                      control={form.control}
                      name="first_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>First name</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="last_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Last name</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <FormField
                      control={form.control}
                      name="job_title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Job title</FormLabel>
                          <FormControl>
                            <Input placeholder="Finance Manager" {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="department"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Department</FormLabel>
                          <FormControl>
                            <Input {...field} />
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
                          <Input type="email" {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="alternative_phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Alt. phone</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
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
        {contacts.map((c) => (
          <div key={c.id} className="flex items-start justify-between gap-3 rounded-lg border p-3">
            <div className="flex items-start gap-3">
              <div className="bg-muted flex size-9 shrink-0 items-center justify-center rounded-full">
                <UserRound className="text-muted-foreground size-4" />
              </div>
              <div>
                <div className="flex items-center gap-2 font-medium">
                  {c.first_name} {c.last_name}
                  {c.is_primary && (
                    <Badge variant="secondary" className="gap-1">
                      <Star className="size-3" /> Primary
                    </Badge>
                  )}
                  {c.status === "inactive" && <Badge variant="outline">Inactive</Badge>}
                </div>
                <div className="text-muted-foreground text-sm">
                  {[c.job_title, c.department].filter(Boolean).join(" · ") || "—"}
                </div>
                <div className="text-muted-foreground flex items-center gap-1 text-sm">
                  <Phone className="size-3" /> {c.phone}
                  {c.email && <span className="ml-2">{c.email}</span>}
                </div>
              </div>
            </div>
            {canWrite && (
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button variant="ghost" size="icon">
                      <MoreHorizontal />
                    </Button>
                  }
                />
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => openEdit(c)}>Edit</DropdownMenuItem>
                  {!c.is_primary && (
                    <DropdownMenuItem onClick={() => primaryMutation.mutate(c.id)}>
                      Mark as primary
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem
                    onClick={() =>
                      statusMutation.mutate({ id: c.id, status: c.status === "active" ? "inactive" : "active" })
                    }
                  >
                    {c.status === "active" ? "Deactivate" : "Activate"}
                  </DropdownMenuItem>
                  <DropdownMenuItem variant="destructive" onClick={() => removeMutation.mutate(c.id)}>
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
