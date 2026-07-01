import { zodResolver } from "@hookform/resolvers/zod"
import { FileText } from "lucide-react"
import { useEffect } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"

import { DatePicker } from "@/components/date-picker"
import { ModalHeader } from "@/components/modal-header"
import { Button } from "@/components/ui/button"
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
import { Sheet, SheetContent, SheetFooter } from "@/components/ui/sheet"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import type { CompanyDocument, DocumentInput } from "@/types"

// Radix/base-ui Select forbids an empty-string item value, so "company-wide"
// uses a sentinel that maps back to "" (no owner) on save.
const COMPANY = "__company__"

const schema = z.object({
  name: z.string().min(1, "A document name is required"),
  category: z.string().optional(),
  doc_number: z.string().optional(),
  issuer: z.string().optional(),
  description: z.string().optional(),
  owner_user_id: z.string().optional(),
  file_name: z.string().optional(),
  file_url: z.string().optional(),
  issue_date: z.string().optional(),
  expiry_date: z.string().optional(),
  renewal_lead_days: z.coerce.number().min(0).optional(),
  on_report: z.boolean(),
  report_mode: z.enum(["always", "author"]),
  active: z.boolean(),
})
type FormValues = z.infer<typeof schema>

const empty: FormValues = {
  name: "",
  category: "",
  doc_number: "",
  issuer: "",
  description: "",
  owner_user_id: COMPANY,
  file_name: "",
  file_url: "",
  issue_date: "",
  expiry_date: "",
  renewal_lead_days: 30,
  on_report: false,
  report_mode: "always",
  active: true,
}

function toFormValues(d: CompanyDocument): FormValues {
  return {
    ...empty,
    name: d.name,
    category: d.category,
    doc_number: d.doc_number,
    issuer: d.issuer,
    description: d.description,
    owner_user_id: d.owner_user_id || COMPANY,
    file_name: d.file_name,
    file_url: d.file_url,
    issue_date: d.issue_date ?? "",
    expiry_date: d.expiry_date ?? "",
    renewal_lead_days: d.renewal_lead_days,
    on_report: d.on_report,
    report_mode: d.report_mode,
    active: d.active,
  }
}

export function DocumentFormSheet({
  open,
  onOpenChange,
  document: doc,
  ownerOptions,
  onSubmit,
  submitting,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  document?: CompanyDocument
  /** Staff members a document can be scoped to; "Company-wide" is prepended by the page. */
  ownerOptions: { value: string; label: string }[]
  onSubmit: (input: DocumentInput) => void
  submitting?: boolean
}) {
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: doc ? toFormValues(doc) : empty,
  })

  useEffect(() => {
    if (open) {
      form.reset(doc ? toFormValues(doc) : empty)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, doc])

  const onReport = form.watch("on_report")
  const ownerUserId = form.watch("owner_user_id")

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full gap-0 overflow-y-auto p-0 sm:max-w-lg">
        <ModalHeader
          icon={FileText}
          title={doc ? "Edit document" : "Add document"}
          description={doc ? "Update this document's details" : "Add a company or staff document"}
        />

        <Form {...form}>
          <form
            id="document-form"
            onSubmit={form.handleSubmit((values) => {
              const { owner_user_id, ...rest } = values
              onSubmit({
                ...rest,
                owner_user_id: owner_user_id === COMPANY ? "" : owner_user_id,
              } as DocumentInput)
            })}
            className="space-y-6 p-4"
          >
            <section className="space-y-4">
              <h3 className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
                Basic information
              </h3>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem className="sm:col-span-2">
                      <FormLabel>Document name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Practising certificate" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Registration, Insurance" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="doc_number"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Document number</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. ISK/2025/0042" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="issuer"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Issued by</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Registration Board" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="owner_user_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Applies to</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value={COMPANY}>Company-wide</SelectItem>
                          {ownerOptions.map((o) => (
                            <SelectItem key={o.value} value={o.value}>
                              {o.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea rows={2} placeholder="Optional notes about this document" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </section>

            <section className="space-y-4">
              <h3 className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">File</h3>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="file_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>File label</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. certificate.pdf" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="file_url"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>File URL</FormLabel>
                      <FormControl>
                        <Input placeholder="https://…" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <FormField
                  control={form.control}
                  name="issue_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Issue date</FormLabel>
                      <DatePicker value={field.value} onChange={field.onChange} />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="expiry_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Expiry date</FormLabel>
                      <DatePicker value={field.value} onChange={field.onChange} />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="renewal_lead_days"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Renewal lead (days)</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
            </section>

            <section className="space-y-3 rounded-lg border p-3">
              <div className="flex items-center justify-between">
                <FormLabel className="text-sm">Attach to valuation reports</FormLabel>
                <FormField
                  control={form.control}
                  name="on_report"
                  render={({ field }) => (
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  )}
                />
              </div>
              {onReport && (
                <FormField
                  control={form.control}
                  name="report_mode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>When to include</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="always">On every report</SelectItem>
                          <SelectItem value="author">Only when this person writes the report</SelectItem>
                        </SelectContent>
                      </Select>
                      {field.value === "author" && ownerUserId === COMPANY && (
                        <p className="text-destructive text-xs">
                          Pick a staff member under "Applies to" for author-only.
                        </p>
                      )}
                    </FormItem>
                  )}
                />
              )}
            </section>

            {doc && (
              <div className="flex items-center justify-between rounded-lg border p-3">
                <FormLabel className="text-sm">Active</FormLabel>
                <FormField
                  control={form.control}
                  name="active"
                  render={({ field }) => (
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  )}
                />
              </div>
            )}
          </form>
        </Form>

        <SheetFooter className="p-4">
          <Button type="submit" form="document-form" disabled={submitting}>
            {doc ? "Save changes" : "Add document"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
