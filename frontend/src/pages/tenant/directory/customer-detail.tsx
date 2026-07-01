import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  Activity,
  Building2,
  Cog,
  FileText,
  Files,
  History,
  KanbanSquare,
  ListTodo,
  Mail,
  MapPin,
  MessageSquareText,
  Phone,
  Plus,
  Receipt,
  ShieldAlert,
  Tag as TagIcon,
  UsersRound,
  X,
} from "lucide-react"
import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { useParams } from "react-router-dom"
import { toast } from "sonner"
import { z } from "zod"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { PageLoader } from "@/components/ui/spinner"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import { ModalHeader } from "@/components/modal-header"
import { PageHeader } from "@/components/page-header"
import { PlaceholderPage } from "@/components/placeholder-page"
import { ActivityTab } from "@/pages/tenant/directory/activity-tab"
import { ContactsTab } from "@/pages/tenant/directory/contacts-tab"
import { CustomerFormSheet } from "@/pages/tenant/directory/customer-form"
import { NotesTab } from "@/pages/tenant/directory/notes-tab"
import { customers as customersApi } from "@/lib/api"
import { useAuth } from "@/lib/auth"
import type { CustomerInput } from "@/types"

const STATUS_BADGE: Record<string, "success" | "secondary" | "destructive" | "outline"> = {
  active: "success",
  prospect: "outline",
  dormant: "secondary",
  archived: "secondary",
  blacklisted: "destructive",
}

const ARCHIVE_REASONS = [
  "No longer doing business",
  "Duplicate record",
  "Customer requested removal",
  "Wrongly created record",
  "Contract ended",
  "Inactive for long period",
  "Merged with another customer",
  "Other reason",
]

const archiveSchema = z.object({
  reason: z.string().min(1, "Select a reason"),
})
type ArchiveFormValues = z.infer<typeof archiveSchema>

export function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { hasPermission } = useAuth()
  const queryClient = useQueryClient()
  const [editOpen, setEditOpen] = useState(false)
  const [archiveOpen, setArchiveOpen] = useState(false)
  const [newTag, setNewTag] = useState("")

  const archiveForm = useForm<ArchiveFormValues>({
    resolver: zodResolver(archiveSchema),
    defaultValues: { reason: "" },
  })

  useEffect(() => {
    if (archiveOpen) archiveForm.reset({ reason: "" })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [archiveOpen])

  const canWrite = hasPermission("customers:write")
  const canDelete = hasPermission("customers:delete")

  const customerQuery = useQuery({
    queryKey: ["customers", id],
    queryFn: () => customersApi.get(id!),
    enabled: !!id,
  })

  const tagsQuery = useQuery({
    queryKey: ["customers", id, "tags"],
    queryFn: () => customersApi.tags.list(id!),
    enabled: !!id,
  })

  const invalidateCustomer = () => queryClient.invalidateQueries({ queryKey: ["customers", id] })

  const updateMutation = useMutation({
    mutationFn: (input: CustomerInput) => customersApi.update(id!, input),
    onSuccess: () => {
      toast.success("Customer updated")
      invalidateCustomer()
      queryClient.invalidateQueries({ queryKey: ["customers"] })
      setEditOpen(false)
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const archiveMutation = useMutation({
    mutationFn: (reason: string) => customersApi.archive(id!, reason),
    onSuccess: () => {
      toast.success("Customer archived")
      invalidateCustomer()
      queryClient.invalidateQueries({ queryKey: ["customers"] })
      setArchiveOpen(false)
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const restoreMutation = useMutation({
    mutationFn: () => customersApi.restore(id!),
    onSuccess: () => {
      toast.success("Customer restored")
      invalidateCustomer()
      queryClient.invalidateQueries({ queryKey: ["customers"] })
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const addTagMutation = useMutation({
    mutationFn: (name: string) => customersApi.tags.add(id!, name),
    onSuccess: () => {
      setNewTag("")
      queryClient.invalidateQueries({ queryKey: ["customers", id, "tags"] })
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const removeTagMutation = useMutation({
    mutationFn: (tagId: string) => customersApi.tags.remove(id!, tagId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["customers", id, "tags"] }),
    onError: (err: Error) => toast.error(err.message),
  })

  if (customerQuery.isLoading) {
    return <PageLoader label="Loading customer…" />
  }

  const customer = customerQuery.data
  if (!customer) {
    return (
      <PlaceholderPage
        icon={UsersRound}
        title="Customer not found"
        description="This customer may have been deleted."
      />
    )
  }

  const isOrg = customer.customer_type === "organization"

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[{ label: "Directory", to: "/customers" }, { label: customer.display_name }]}
        backTo="/customers"
        title=""
      />

      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div className="flex items-start gap-3">
          <div className="bg-muted flex size-12 shrink-0 items-center justify-center rounded-xl">
            {isOrg ? (
              <Building2 className="text-muted-foreground size-6" />
            ) : (
              <UsersRound className="text-muted-foreground size-6" />
            )}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight">{customer.display_name}</h1>
              <Badge variant={STATUS_BADGE[customer.status] ?? "outline"}>{customer.status}</Badge>
            </div>
            <p className="text-muted-foreground text-sm">
              {isOrg ? "Organization" : "Individual"}
              {customer.segment && ` · ${customer.segment}`}
            </p>
          </div>
        </div>
        {canWrite && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setEditOpen(true)}>
              Edit
            </Button>
            {customer.status === "archived" ? (
              <Button variant="outline" onClick={() => restoreMutation.mutate()}>
                Restore
              </Button>
            ) : (
              canDelete && (
                <Button variant="outline" onClick={() => setArchiveOpen(true)}>
                  <ShieldAlert /> Archive
                </Button>
              )
            )}
          </div>
        )}
      </div>

      {/* Tags */}
      <div className="flex flex-wrap items-center gap-1.5">
        <TagIcon className="text-muted-foreground size-3.5" />
        {tagsQuery.data?.map((t) => (
          <Badge key={t.id} variant="secondary" className="gap-1">
            {t.name}
            {canWrite && (
              <button onClick={() => removeTagMutation.mutate(t.id)} aria-label={`Remove ${t.name}`}>
                <X className="size-3" />
              </button>
            )}
          </Badge>
        ))}
        {canWrite && (
          <div className="flex items-center gap-1">
            <Input
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && newTag.trim()) {
                  e.preventDefault()
                  addTagMutation.mutate(newTag.trim())
                }
              }}
              placeholder="Add tag"
              className="h-6 w-24 rounded-full px-2 text-xs"
            />
            <Button
              variant="ghost"
              size="icon-sm"
              disabled={!newTag.trim()}
              onClick={() => addTagMutation.mutate(newTag.trim())}
            >
              <Plus className="size-3.5" />
            </Button>
          </div>
        )}
      </div>

      <Tabs defaultValue="activity">
        <TabsList className="w-full max-w-full justify-start overflow-x-auto">
          <TabsTrigger value="overview" className="shrink-0">
            <FileText /> Overview
          </TabsTrigger>
          <TabsTrigger value="contacts" className="shrink-0">
            <UsersRound /> Contacts
          </TabsTrigger>
          <TabsTrigger value="activity" className="shrink-0">
            <Activity /> Activity
          </TabsTrigger>
          <TabsTrigger value="notes" className="shrink-0">
            <MessageSquareText /> Notes
          </TabsTrigger>
          <TabsTrigger value="deals" className="shrink-0">
            <KanbanSquare /> Deals
          </TabsTrigger>
          <TabsTrigger value="tasks" className="shrink-0">
            <ListTodo /> Tasks
          </TabsTrigger>
          <TabsTrigger value="documents" className="shrink-0">
            <Files /> Documents
          </TabsTrigger>
          <TabsTrigger value="invoices" className="shrink-0">
            <Receipt /> Invoices
          </TabsTrigger>
          <TabsTrigger value="audit" className="shrink-0">
            <History /> Audit
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div className="space-y-3 rounded-lg border p-4">
              <h3 className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
                Profile
              </h3>
              {isOrg ? (
                <>
                  <Field label="Legal name" value={customer.legal_name} />
                  <Field label="Trading name" value={customer.trading_name} />
                  <Field label="Registration no." value={customer.registration_number} />
                  <Field label="Tax PIN / VAT" value={customer.tax_pin} />
                  <Field label="Industry" value={customer.industry} />
                  <Field label="Size" value={customer.organization_size} />
                </>
              ) : (
                <>
                  <Field label="Full name" value={`${customer.first_name} ${customer.middle_name} ${customer.last_name}`.replace(/\s+/g, " ").trim()} />
                  <Field label="ID / Passport" value={customer.id_number} />
                  <Field label="Date of birth" value={customer.date_of_birth} />
                  <Field label="Gender" value={customer.gender} />
                  <Field label="Occupation" value={customer.occupation} />
                </>
              )}
              <Field label="Website" value={customer.website} />
              <Field label="Description" value={customer.description} />
            </div>

            <div className="space-y-3 rounded-lg border p-4">
              <h3 className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
                Contact &amp; CRM
              </h3>
              <Field label="Email" value={customer.primary_email} icon={Mail} />
              <Field label="Phone" value={customer.primary_phone} icon={Phone} />
              <Field label="Alt. phone" value={customer.alternative_phone} icon={Phone} />
              <Field
                label="Address"
                value={[customer.address, customer.city, customer.state, customer.country].filter(Boolean).join(", ")}
                icon={MapPin}
              />
              <Field label="Segment" value={customer.segment} />
              <Field label="Source" value={customer.source} />
              <Field label="Account owner" value={customer.account_owner_name} icon={Cog} />
              {customer.status === "archived" && (
                <Field label="Archive reason" value={customer.archive_reason} />
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="contacts">
          <ContactsTab customerId={customer.id} />
        </TabsContent>

        <TabsContent value="activity">
          <ActivityTab customerId={customer.id} />
        </TabsContent>

        <TabsContent value="notes">
          <NotesTab customerId={customer.id} />
        </TabsContent>

        <TabsContent value="deals">
          <PlaceholderPage
            icon={KanbanSquare}
            title="Deals"
            description="Sales pipeline for this customer will live here once the Sales module ships."
          />
        </TabsContent>
        <TabsContent value="tasks">
          <PlaceholderPage
            icon={ListTodo}
            title="Tasks"
            description="Follow-ups and to-dos tied to this customer will live here."
          />
        </TabsContent>
        <TabsContent value="documents">
          <PlaceholderPage
            icon={Files}
            title="Documents"
            description="Contracts and files attached to this customer will live here."
          />
        </TabsContent>
        <TabsContent value="invoices">
          <PlaceholderPage
            icon={Receipt}
            title="Invoices"
            description="Billing history for this customer will live here once the Billing module ships."
          />
        </TabsContent>
        <TabsContent value="audit">
          <PlaceholderPage
            icon={History}
            title="Audit history"
            description="A full change log for this customer record will live here."
          />
        </TabsContent>
      </Tabs>

      <CustomerFormSheet
        open={editOpen}
        onOpenChange={setEditOpen}
        customer={customer}
        onSubmit={(input) => updateMutation.mutate(input)}
        submitting={updateMutation.isPending}
      />

      <Dialog open={archiveOpen} onOpenChange={setArchiveOpen}>
        <DialogContent className="gap-0 overflow-hidden p-0">
          <ModalHeader
            icon={ShieldAlert}
            title="Archive customer"
            description="The record is kept, just marked inactive"
          />
          <Form {...archiveForm}>
            <form
              id="archive-form"
              onSubmit={archiveForm.handleSubmit((values) => archiveMutation.mutate(values.reason))}
              className="space-y-4 p-4"
            >
              <FormField
                control={archiveForm.control}
                name="reason"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reason</FormLabel>
                    <Select
                      items={ARCHIVE_REASONS.map((r) => ({ value: r, label: r }))}
                      onValueChange={field.onChange}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select a reason" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {ARCHIVE_REASONS.map((reason) => (
                          <SelectItem key={reason} value={reason}>
                            {reason}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </form>
          </Form>
          <DialogFooter className="p-4 pt-0">
            <Button type="submit" form="archive-form" variant="destructive" disabled={archiveMutation.isPending}>
              Archive customer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function Field({
  label,
  value,
  icon: Icon,
}: {
  label: string
  value?: string
  icon?: typeof Mail
}) {
  return (
    <div className="flex items-start justify-between gap-4 text-sm">
      <span className="text-muted-foreground flex items-center gap-1.5">
        {Icon && <Icon className="size-3.5" />}
        {label}
      </span>
      <span className="text-right font-medium">{value || "—"}</span>
    </div>
  )
}
