import { zodResolver } from "@hookform/resolvers/zod"
import { Gavel, Plus, Trash2 } from "lucide-react"
import { useEffect } from "react"
import { useFieldArray, useForm } from "react-hook-form"
import { z } from "zod"

import { Combobox } from "@/components/combobox"
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
import type { Tender, TenderInput } from "@/types"
import type { User } from "@/types"
import { TENDER_SECURITY_TYPES, TENDER_STAGE_OPTIONS, TENDER_TYPES } from "@/pages/tenant/tender-shared"

const schema = z.object({
  title: z.string().min(1, "A title is required"),
  reference: z.string().optional(),
  issuer: z.string().optional(),
  type: z.enum(["tender", "prequalification", "eoi"]),
  category: z.string().optional(),
  description: z.string().optional(),
  stage: z.enum([
    "watching",
    "preparing",
    "submitted",
    "evaluation",
    "shortlisted",
    "awarded",
    "unsuccessful",
    "withdrawn",
  ]),
  submission_deadline: z.string().optional(),
  opening_datetime: z.string().optional(),
  submission_method: z.string().optional(),
  submission_address: z.string().optional(),
  submission_email: z.string().optional(),
  submission_contact: z.string().optional(),
  estimated_value: z.coerce.number().min(0),
  doc_fee: z.coerce.number().min(0),
  currency: z.string().optional(),
  security_type: z.string().optional(),
  security_amount: z.coerce.number().min(0),
  security_validity: z.string().optional(),
  owner_user_id: z.string().optional(),
  signed: z.boolean(),
  requirements: z.array(z.object({ item: z.string(), section: z.string(), met: z.boolean() })),
  contact_name: z.string().optional(),
  contact_email: z.string().optional(),
  notes: z.string().optional(),
})
type FormValues = z.infer<typeof schema>

const empty: FormValues = {
  title: "",
  reference: "",
  issuer: "",
  type: "tender",
  category: "",
  description: "",
  stage: "watching",
  submission_deadline: "",
  opening_datetime: "",
  submission_method: "",
  submission_address: "",
  submission_email: "",
  submission_contact: "",
  estimated_value: 0,
  doc_fee: 0,
  currency: "KES",
  security_type: "__none",
  security_amount: 0,
  security_validity: "",
  owner_user_id: "",
  signed: false,
  requirements: [],
  contact_name: "",
  contact_email: "",
  notes: "",
}

function toFormValues(t: Tender): FormValues {
  return {
    ...empty,
    ...t,
    security_type: t.security_type || "__none",
    requirements: t.requirements ?? [],
  }
}

export function TenderFormSheet({
  open,
  onOpenChange,
  tender,
  users,
  onSubmit,
  submitting,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  tender?: Tender
  users: User[]
  onSubmit: (input: TenderInput) => void
  submitting?: boolean
}) {
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: tender ? toFormValues(tender) : empty,
  })
  const { fields, append, remove } = useFieldArray({ control: form.control, name: "requirements" })

  useEffect(() => {
    if (open) {
      form.reset(tender ? toFormValues(tender) : empty)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, tender])

  const ownerOptions = [
    { value: "", label: "Unassigned" },
    ...users.map((u) => ({ value: u.id, label: u.name })),
  ]

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full gap-0 overflow-y-auto p-0 sm:max-w-lg">
        <ModalHeader
          icon={Gavel}
          title={tender ? "Edit tender" : "New tender"}
          description="Capture the opportunity, deadline, security and requirements."
        />

        <Form {...form}>
          <form
            id="tender-form"
            onSubmit={form.handleSubmit((values) => {
              const { security_type, ...rest } = values
              onSubmit({ ...rest, security_type: security_type === "__none" ? "" : security_type } as TenderInput)
            })}
            className="space-y-6 p-4"
          >
            <section className="space-y-4">
              <h3 className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
                Opportunity
              </h3>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem className="sm:col-span-2">
                      <FormLabel>Title</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Panel valuers — KCB 2026" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="issuer"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Issuer (procuring entity)</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. KCB Bank" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="reference"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Reference</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Type</FormLabel>
                      <Select items={TENDER_TYPES} onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {TENDER_TYPES.map((t) => (
                            <SelectItem key={t.value} value={t.value}>
                              {t.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
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
                        <Input placeholder="e.g. Real estate valuation" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="stage"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Stage</FormLabel>
                      <Select items={TENDER_STAGE_OPTIONS} onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {TENDER_STAGE_OPTIONS.map((s) => (
                            <SelectItem key={s.value} value={s.value}>
                              {s.label}
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
                      <Textarea rows={2} {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </section>

            <section className="space-y-4">
              <h3 className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
                Deadline &amp; lead
              </h3>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="submission_deadline"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Submission deadline</FormLabel>
                      <DatePicker value={field.value} onChange={field.onChange} />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="opening_datetime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tender opening</FormLabel>
                      <FormControl>
                        <Input type="datetime-local" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="owner_user_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Lead</FormLabel>
                    <Combobox
                      options={ownerOptions}
                      value={field.value}
                      onChange={field.onChange}
                      placeholder="Unassigned"
                      searchPlaceholder="Search users…"
                      allowCustom={false}
                    />
                  </FormItem>
                )}
              />
            </section>

            <section className="space-y-4">
              <h3 className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
                Value &amp; security
              </h3>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <FormField
                  control={form.control}
                  name="estimated_value"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Estimated value</FormLabel>
                      <FormControl>
                        <Input type="number" min={0} {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="doc_fee"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tender doc fee</FormLabel>
                      <FormControl>
                        <Input type="number" min={0} {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="currency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Currency</FormLabel>
                      <FormControl>
                        <Input placeholder="KES" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <FormField
                  control={form.control}
                  name="security_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Security type</FormLabel>
                      <Select items={TENDER_SECURITY_TYPES} onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {TENDER_SECURITY_TYPES.map((s) => (
                            <SelectItem key={s.value} value={s.value}>
                              {s.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="security_amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Security amount</FormLabel>
                      <FormControl>
                        <Input type="number" min={0} {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="security_validity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Security validity</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. 120 days" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
            </section>

            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
                  Requirements checklist
                </h3>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => append({ item: "", section: "", met: false })}
                >
                  <Plus className="size-3.5" /> Add
                </Button>
              </div>
              {fields.map((f, i) => (
                <div key={f.id} className="grid grid-cols-[1fr_100px_auto_auto] items-center gap-2">
                  <Input
                    placeholder="e.g. Tax compliance certificate"
                    {...form.register(`requirements.${i}.item` as const)}
                  />
                  <Input placeholder="Section" {...form.register(`requirements.${i}.section` as const)} />
                  <FormField
                    control={form.control}
                    name={`requirements.${i}.met`}
                    render={({ field }) => (
                      <label className="flex items-center gap-1.5 text-xs whitespace-nowrap">
                        <Switch checked={field.value} onCheckedChange={field.onChange} /> Met
                      </label>
                    )}
                  />
                  <Button type="button" variant="ghost" size="icon" onClick={() => remove(i)}>
                    <Trash2 className="text-destructive size-4" />
                  </Button>
                </div>
              ))}
            </section>

            <section className="space-y-4">
              <h3 className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
                Submission
              </h3>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="submission_method"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Submission method</FormLabel>
                      <Select
                        items={[
                          { value: "__none", label: "—" },
                          { value: "email", label: "Email" },
                          { value: "physical", label: "Physical" },
                          { value: "online", label: "Online portal" },
                        ]}
                        onValueChange={(v) => field.onChange(v === "__none" ? "" : v)}
                        value={field.value || "__none"}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="__none">—</SelectItem>
                          <SelectItem value="email">Email</SelectItem>
                          <SelectItem value="physical">Physical</SelectItem>
                          <SelectItem value="online">Online portal</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="submission_email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Submission email</FormLabel>
                      <FormControl>
                        <Input type="email" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="submission_address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Submission address</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="contact_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contact name</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="contact_email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contact email</FormLabel>
                      <FormControl>
                        <Input type="email" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="signed"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center gap-2 space-y-0">
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <FormLabel className="font-normal">
                      Bid formally signed by an authorised officer
                    </FormLabel>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea rows={2} {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </section>
          </form>
        </Form>

        <SheetFooter className="p-4">
          <Button type="submit" form="tender-form" disabled={submitting}>
            {tender ? "Save changes" : "Add tender"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
