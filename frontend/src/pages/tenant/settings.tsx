import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  Archive as ArchiveIcon,
  Building2,
  CreditCard,
  Database,
  Mail,
  Network,
  Plus,
  RotateCcw,
  Trash2,
} from "lucide-react"
import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { z } from "zod"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { PageLoader } from "@/components/ui/spinner"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ModalHeader } from "@/components/modal-header"
import { PageHeader } from "@/components/page-header"
import { archive, departments as departmentsApi, referenceData, users as usersApi, workspace } from "@/lib/api"
import { useAuth } from "@/lib/auth"
import type {
  ArchivedItem,
  Department,
  DepartmentInput,
  EmailSettingsInput,
  OrgProfileInput,
  ReferenceDataInput,
} from "@/types"

export function SettingsPage() {
  const { hasPermission } = useAuth()
  const canWrite = hasPermission("settings:write")

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[{ label: "Dashboard", to: "/" }, { label: "Settings" }]}
        backTo="/"
        title="Settings"
        description="Organisation profile, departments, email preferences, reference data, billing, and archive."
      />

      <Tabs defaultValue="organisation">
        <TabsList className="w-full max-w-full justify-start overflow-x-auto">
          <TabsTrigger value="organisation" className="shrink-0"><Building2 /> Organisation</TabsTrigger>
          <TabsTrigger value="departments" className="shrink-0"><Network /> Departments</TabsTrigger>
          <TabsTrigger value="email" className="shrink-0"><Mail /> Email</TabsTrigger>
          <TabsTrigger value="reference-data" className="shrink-0"><Database /> Reference data</TabsTrigger>
          <TabsTrigger value="billing" className="shrink-0"><CreditCard /> Billing</TabsTrigger>
          <TabsTrigger value="archive" className="shrink-0"><ArchiveIcon /> Archive</TabsTrigger>
        </TabsList>

        <TabsContent value="organisation"><OrganisationTab canWrite={canWrite} /></TabsContent>
        <TabsContent value="departments"><DepartmentsTab canWrite={canWrite} /></TabsContent>
        <TabsContent value="email"><EmailSettingsTab canWrite={canWrite} /></TabsContent>
        <TabsContent value="reference-data"><ReferenceDataTab canWrite={canWrite} /></TabsContent>
        <TabsContent value="billing"><BillingTab /></TabsContent>
        <TabsContent value="archive"><ArchiveTab canWrite={canWrite} /></TabsContent>
      </Tabs>
    </div>
  )
}

// --- Organisation profile ---

const profileSchema = z.object({
  name: z.string().min(1, "Required"),
  country: z.string().optional(),
  legal_name: z.string().optional(),
  registration_no: z.string().optional(),
  kra_pin: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().optional(),
  website: z.string().optional(),
})

function OrganisationTab({ canWrite }: { canWrite: boolean }) {
  const queryClient = useQueryClient()
  const query = useQuery({ queryKey: ["workspace"], queryFn: workspace.get })
  const form = useForm<OrgProfileInput>({
    resolver: zodResolver(profileSchema),
    defaultValues: { name: "", country: "", legal_name: "", registration_no: "", kra_pin: "", phone: "", email: "", website: "" },
  })

  useEffect(() => {
    if (query.data) {
      form.reset({
        name: query.data.name,
        country: query.data.country,
        legal_name: query.data.legal_name,
        registration_no: query.data.registration_no,
        kra_pin: query.data.kra_pin,
        phone: query.data.phone,
        email: query.data.email,
        website: query.data.website,
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query.data])

  const mutation = useMutation({
    mutationFn: workspace.updateProfile,
    onSuccess: () => {
      toast.success("Organisation profile updated")
      queryClient.invalidateQueries({ queryKey: ["workspace"] })
    },
    onError: (err: Error) => toast.error(err.message),
  })

  if (query.isLoading) return <PageLoader label="Loading profile…" />

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Organisation profile</CardTitle></CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit((v) => mutation.mutate(v))} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem>
                  <FormLabel>Workspace name</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="legal_name" render={({ field }) => (
                <FormItem>
                  <FormLabel>Legal name</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                </FormItem>
              )} />
              <FormField control={form.control} name="registration_no" render={({ field }) => (
                <FormItem>
                  <FormLabel>Registration number</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                </FormItem>
              )} />
              <FormField control={form.control} name="kra_pin" render={({ field }) => (
                <FormItem>
                  <FormLabel>KRA PIN</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                </FormItem>
              )} />
              <FormField control={form.control} name="country" render={({ field }) => (
                <FormItem>
                  <FormLabel>Country</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                </FormItem>
              )} />
              <FormField control={form.control} name="phone" render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                </FormItem>
              )} />
              <FormField control={form.control} name="email" render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl><Input type="email" {...field} /></FormControl>
                </FormItem>
              )} />
              <FormField control={form.control} name="website" render={({ field }) => (
                <FormItem>
                  <FormLabel>Website</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                </FormItem>
              )} />
            </div>
            {canWrite && (
              <Button type="submit" disabled={mutation.isPending}>Save changes</Button>
            )}
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}

// --- Departments ---

const departmentSchema = z.object({
  name: z.string().min(1, "Required"),
  description: z.string().optional(),
  head_user_id: z.string().optional(),
})

function DepartmentsTab({ canWrite }: { canWrite: boolean }) {
  const queryClient = useQueryClient()
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Department | undefined>()
  const [toDelete, setToDelete] = useState<Department | undefined>()

  const query = useQuery({ queryKey: ["departments"], queryFn: departmentsApi.list })
  const usersQuery = useQuery({ queryKey: ["users"], queryFn: usersApi.list })

  const form = useForm<DepartmentInput>({
    resolver: zodResolver(departmentSchema),
    defaultValues: { name: "", description: "", head_user_id: "" },
  })

  const createMutation = useMutation({
    mutationFn: departmentsApi.create,
    onSuccess: () => {
      toast.success("Department created")
      queryClient.invalidateQueries({ queryKey: ["departments"] })
      setFormOpen(false)
    },
    onError: (err: Error) => toast.error(err.message),
  })
  const updateMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: DepartmentInput }) => departmentsApi.update(id, input),
    onSuccess: () => {
      toast.success("Department updated")
      queryClient.invalidateQueries({ queryKey: ["departments"] })
      setFormOpen(false)
    },
    onError: (err: Error) => toast.error(err.message),
  })
  const removeMutation = useMutation({
    mutationFn: (id: string) => departmentsApi.remove(id),
    onSuccess: () => {
      toast.success("Department deleted")
      queryClient.invalidateQueries({ queryKey: ["departments"] })
      setToDelete(undefined)
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const openCreate = () => {
    setEditing(undefined)
    form.reset({ name: "", description: "", head_user_id: "" })
    setFormOpen(true)
  }
  const openEdit = (d: Department) => {
    setEditing(d)
    form.reset({ name: d.name, description: d.description, head_user_id: d.head_user_id ?? "" })
    setFormOpen(true)
  }

  if (query.isLoading) return <PageLoader label="Loading departments…" />

  return (
    <div className="space-y-4">
      {canWrite && (
        <div className="flex justify-end">
          <Button onClick={openCreate}><Plus /> New department</Button>
        </div>
      )}
      <div className="divide-border divide-y rounded-lg border">
        {(query.data ?? []).length === 0 && (
          <div className="text-muted-foreground p-6 text-center text-sm">No departments yet.</div>
        )}
        {(query.data ?? []).map((d) => (
          <div key={d.id} className="flex items-center justify-between gap-4 p-4">
            <div className="min-w-0">
              <div className="font-medium">{d.name}</div>
              <div className="text-muted-foreground truncate text-sm">{d.description || "No description"}</div>
              <div className="text-muted-foreground mt-1 flex gap-3 text-xs">
                <span>{d.member_count} member{d.member_count === 1 ? "" : "s"}</span>
                {d.head_user_name && <span>Head: {d.head_user_name}</span>}
              </div>
            </div>
            {canWrite && (
              <div className="flex shrink-0 gap-2">
                <Button variant="outline" size="sm" onClick={() => openEdit(d)}>Edit</Button>
                <Button variant="outline" size="sm" onClick={() => setToDelete(d)}><Trash2 /></Button>
              </div>
            )}
          </div>
        ))}
      </div>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="gap-0 overflow-hidden p-0">
          <ModalHeader
            icon={Network}
            title={editing ? "Edit department" : "New department"}
            description="Group users into a team."
          />
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit((values) =>
                editing ? updateMutation.mutate({ id: editing.id, input: values }) : createMutation.mutate(values)
              )}
              className="space-y-4 p-4"
            >
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl><Input placeholder="e.g. Finance" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="description" render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                </FormItem>
              )} />
              <FormField control={form.control} name="head_user_id" render={({ field }) => (
                <FormItem>
                  <FormLabel>Head of department</FormLabel>
                  <Select
                    items={(usersQuery.data ?? []).map((u) => ({ value: u.id, label: u.name }))}
                    value={field.value}
                    onValueChange={field.onChange}
                  >
                    <FormControl><SelectTrigger className="w-full"><SelectValue placeholder="None" /></SelectTrigger></FormControl>
                    <SelectContent>
                      {(usersQuery.data ?? []).map((u) => (
                        <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormItem>
              )} />
              <DialogFooter className="p-0 pt-2">
                <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                  {editing ? "Save changes" : "Create"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(undefined)}>
        <DialogContent className="gap-0 overflow-hidden p-0">
          <ModalHeader icon={Trash2} title="Delete department?" description={`"${toDelete?.name}" will be permanently removed.`} />
          <DialogFooter className="p-4">
            <Button variant="outline" onClick={() => setToDelete(undefined)}>Cancel</Button>
            <Button variant="destructive" disabled={removeMutation.isPending} onClick={() => toDelete && removeMutation.mutate(toDelete.id)}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// --- Email settings ---

const emailSchema = z.object({
  mail_sender_name: z.string().optional(),
  mail_reply_to: z.string().optional(),
  invoice_cc: z.string().optional(),
  invoice_bcc: z.string().optional(),
  billing_email: z.string().optional(),
})

function EmailSettingsTab({ canWrite }: { canWrite: boolean }) {
  const queryClient = useQueryClient()
  const query = useQuery({ queryKey: ["workspace"], queryFn: workspace.get })
  const form = useForm<EmailSettingsInput>({
    resolver: zodResolver(emailSchema),
    defaultValues: { mail_sender_name: "", mail_reply_to: "", invoice_cc: "", invoice_bcc: "", billing_email: "" },
  })

  useEffect(() => {
    if (query.data) {
      form.reset({
        mail_sender_name: query.data.mail_sender_name,
        mail_reply_to: query.data.mail_reply_to,
        invoice_cc: query.data.invoice_cc,
        invoice_bcc: query.data.invoice_bcc,
        billing_email: query.data.billing_email,
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query.data])

  const mutation = useMutation({
    mutationFn: workspace.updateEmailSettings,
    onSuccess: () => {
      toast.success("Email settings updated")
      queryClient.invalidateQueries({ queryKey: ["workspace"] })
    },
    onError: (err: Error) => toast.error(err.message),
  })

  if (query.isLoading) return <PageLoader label="Loading…" />

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Email &amp; invoicing</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground mb-4 text-sm">
          Emails are sent from MojaCRM's own address; these settings control the display name, reply-to,
          and who gets copied on invoices. No mailer is wired up yet — this only stores the preferences.
        </p>
        <Form {...form}>
          <form onSubmit={form.handleSubmit((v) => mutation.mutate(v))} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField control={form.control} name="mail_sender_name" render={({ field }) => (
                <FormItem>
                  <FormLabel>Sender display name</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                </FormItem>
              )} />
              <FormField control={form.control} name="mail_reply_to" render={({ field }) => (
                <FormItem>
                  <FormLabel>Reply-to email</FormLabel>
                  <FormControl><Input type="email" {...field} /></FormControl>
                </FormItem>
              )} />
              <FormField control={form.control} name="invoice_cc" render={({ field }) => (
                <FormItem>
                  <FormLabel>Invoice CC</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                </FormItem>
              )} />
              <FormField control={form.control} name="invoice_bcc" render={({ field }) => (
                <FormItem>
                  <FormLabel>Invoice BCC</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                </FormItem>
              )} />
              <FormField control={form.control} name="billing_email" render={({ field }) => (
                <FormItem>
                  <FormLabel>Billing contact email</FormLabel>
                  <FormControl><Input type="email" {...field} /></FormControl>
                </FormItem>
              )} />
            </div>
            {canWrite && <Button type="submit" disabled={mutation.isPending}>Save changes</Button>}
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}

// --- Reference data ---

const refDataSchema = z.object({
  category: z.string().min(1, "Required"),
  value: z.string().min(1, "Required"),
  label: z.string().optional(),
})

function ReferenceDataTab({ canWrite }: { canWrite: boolean }) {
  const queryClient = useQueryClient()
  const [formOpen, setFormOpen] = useState(false)
  const query = useQuery({ queryKey: ["reference-data"], queryFn: () => referenceData.list() })

  const form = useForm<ReferenceDataInput>({
    resolver: zodResolver(refDataSchema),
    defaultValues: { category: "", value: "", label: "" },
  })

  const createMutation = useMutation({
    mutationFn: referenceData.create,
    onSuccess: () => {
      toast.success("Added")
      queryClient.invalidateQueries({ queryKey: ["reference-data"] })
      form.reset({ category: "", value: "", label: "" })
      setFormOpen(false)
    },
    onError: (err: Error) => toast.error(err.message),
  })
  const removeMutation = useMutation({
    mutationFn: (id: string) => referenceData.remove(id),
    onSuccess: () => {
      toast.success("Removed")
      queryClient.invalidateQueries({ queryKey: ["reference-data"] })
    },
    onError: (err: Error) => toast.error(err.message),
  })

  if (query.isLoading) return <PageLoader label="Loading…" />

  const grouped = (query.data ?? []).reduce<Record<string, typeof query.data>>((acc, item) => {
    acc[item.category] = [...(acc[item.category] ?? []), item]
    return acc
  }, {})

  return (
    <div className="space-y-4">
      {canWrite && (
        <div className="flex justify-end">
          <Button onClick={() => setFormOpen(true)}><Plus /> Add value</Button>
        </div>
      )}
      {Object.keys(grouped).length === 0 && (
        <div className="text-muted-foreground rounded-lg border p-6 text-center text-sm">
          No reference data yet — add custom picklist values (e.g. lead sources, industries) here.
        </div>
      )}
      {Object.entries(grouped).map(([category, items]) => (
        <Card key={category}>
          <CardHeader><CardTitle className="text-sm uppercase tracking-wide">{category}</CardTitle></CardHeader>
          <CardContent className="flex flex-wrap gap-2 pt-0">
            {items?.map((item) => (
              <Badge key={item.id} variant="outline" className="gap-1.5 py-1.5">
                {item.label || item.value}
                {canWrite && (
                  <button onClick={() => removeMutation.mutate(item.id)} className="hover:text-destructive">
                    <Trash2 className="size-3" />
                  </button>
                )}
              </Badge>
            ))}
          </CardContent>
        </Card>
      ))}

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="gap-0 overflow-hidden p-0">
          <ModalHeader icon={Database} title="Add reference value" description="A custom picklist entry." />
          <Form {...form}>
            <form onSubmit={form.handleSubmit((v) => createMutation.mutate(v))} className="space-y-4 p-4">
              <FormField control={form.control} name="category" render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <FormControl><Input placeholder="e.g. industry, lead_source" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="value" render={({ field }) => (
                <FormItem>
                  <FormLabel>Value</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="label" render={({ field }) => (
                <FormItem>
                  <FormLabel>Display label (optional)</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                </FormItem>
              )} />
              <DialogFooter className="p-0 pt-2">
                <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={createMutation.isPending}>Add</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// --- Billing (read-only) ---

function BillingTab() {
  const query = useQuery({ queryKey: ["billing"], queryFn: workspace.billing })
  if (query.isLoading) return <PageLoader label="Loading…" />
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Billing</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground text-sm">Plan</span>
          <Badge variant="outline" className="capitalize">{query.data?.plan}</Badge>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground text-sm">Status</span>
          <Badge variant={query.data?.status === "active" ? "success" : "secondary"} className="capitalize">
            {query.data?.status}
          </Badge>
        </div>
        <p className="text-muted-foreground pt-2 text-xs">
          Subscription plans and upgrades aren't available yet — contact support to change your plan.
        </p>
      </CardContent>
    </Card>
  )
}

// --- Archive ---

const ENTITY_LABEL: Record<string, string> = {
  client: "Client",
  partner: "Partner",
  branch: "Branch",
  partner_contact: "Partner contact",
  office: "Office",
  department: "Department",
  tender: "Tender",
}

function ArchiveTab({ canWrite }: { canWrite: boolean }) {
  const queryClient = useQueryClient()
  const query = useQuery({ queryKey: ["archive"], queryFn: archive.list })

  const restoreMutation = useMutation({
    mutationFn: (item: ArchivedItem) => archive.restore(item.entity, item.id),
    onSuccess: () => {
      toast.success("Restored")
      queryClient.invalidateQueries({ queryKey: ["archive"] })
    },
    onError: (err: Error) => toast.error(err.message),
  })
  const purgeMutation = useMutation({
    mutationFn: (item: ArchivedItem) => archive.purge(item.entity, item.id),
    onSuccess: () => {
      toast.success("Permanently deleted")
      queryClient.invalidateQueries({ queryKey: ["archive"] })
    },
    onError: (err: Error) => toast.error(err.message),
  })

  if (query.isLoading) return <PageLoader label="Loading archive…" />

  return (
    <div className="divide-border divide-y rounded-lg border">
      {(query.data ?? []).length === 0 && (
        <div className="text-muted-foreground p-6 text-center text-sm">Nothing archived.</div>
      )}
      {(query.data ?? []).map((item) => (
        <div key={`${item.entity}-${item.id}`} className="flex items-center justify-between gap-4 p-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Badge variant="secondary">{ENTITY_LABEL[item.entity] ?? item.entity}</Badge>
              <span className="truncate font-medium">{item.label}</span>
            </div>
            <div className="text-muted-foreground mt-1 text-xs">
              Deleted {new Date(item.deleted_at).toLocaleDateString()}
              {item.deleted_by_name ? ` by ${item.deleted_by_name}` : ""}
              {item.delete_reason ? ` — ${item.delete_reason}` : ""}
            </div>
          </div>
          {canWrite && (
            <div className="flex shrink-0 gap-2">
              <Button variant="outline" size="sm" onClick={() => restoreMutation.mutate(item)}>
                <RotateCcw /> Restore
              </Button>
              <Button variant="outline" size="sm" onClick={() => purgeMutation.mutate(item)}>
                <Trash2 /> Purge
              </Button>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
