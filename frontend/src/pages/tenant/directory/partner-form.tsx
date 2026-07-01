import { zodResolver } from "@hookform/resolvers/zod"
import { Handshake } from "lucide-react"
import { useEffect } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"

import { Combobox } from "@/components/combobox"
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
import { Textarea } from "@/components/ui/textarea"
import { PARTNER_INDUSTRIES, PARTNER_TYPES, PARTNERSHIP_MODELS } from "@/lib/partner-options"
import type { Partner, PartnerInput } from "@/types"

const schema = z.object({
  name: z.string().min(1, "Partner name is required"),
  logo_url: z.string().optional(),
  code: z.string().optional(),
  status: z.enum(["active", "inactive"]),
  type: z.enum([
    "bank",
    "microfinance",
    "sacco",
    "insurer",
    "law_firm",
    "developer",
    "government",
    "company",
    "individual",
    "other",
  ]),
  industry: z.string().optional(),
  partnership_model: z.string().optional(),
  address: z.string().optional(),
  town: z.string().optional(),
  country: z.string().optional(),
  contact_name: z.string().optional(),
  contact_title: z.string().optional(),
  work_email: z.string().optional(),
  phone_mobile: z.string().optional(),
  phone_office: z.string().optional(),
  notes: z.string().optional(),
})
type FormValues = z.infer<typeof schema>

const empty: FormValues = {
  name: "",
  logo_url: "",
  code: "",
  status: "active",
  type: "bank",
  industry: "",
  partnership_model: "",
  address: "",
  town: "",
  country: "Kenya",
  contact_name: "",
  contact_title: "",
  work_email: "",
  phone_mobile: "",
  phone_office: "",
  notes: "",
}

function toFormValues(p: Partner): FormValues {
  return { ...empty, ...p, type: p.type ?? "bank" }
}

export function PartnerFormSheet({
  open,
  onOpenChange,
  partner,
  onSubmit,
  submitting,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  partner?: Partner
  onSubmit: (input: PartnerInput) => void
  submitting?: boolean
}) {
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: partner ? toFormValues(partner) : empty,
  })

  useEffect(() => {
    if (open) {
      form.reset(partner ? toFormValues(partner) : empty)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, partner])

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full gap-0 overflow-y-auto p-0 sm:max-w-lg">
        <ModalHeader
          icon={Handshake}
          title={partner ? "Edit partner" : "New partner"}
          description={partner ? "Update this partner's details" : "Add an external organisation you collaborate with"}
        />

        <Form {...form}>
          <form
            id="partner-form"
            onSubmit={form.handleSubmit((values) => onSubmit(values as PartnerInput))}
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
                      <FormLabel>Partner name</FormLabel>
                      <FormControl>
                        <Input placeholder="Equity Bank" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Reference code</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. KCB, EQT" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select
                        items={[
                          { value: "active", label: "Active" },
                          { value: "inactive", label: "Inactive" },
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
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="inactive">Inactive</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Type</FormLabel>
                      <Select items={PARTNER_TYPES.map((t) => ({ ...t }))} onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {PARTNER_TYPES.map((t) => (
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
                  name="industry"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Industry</FormLabel>
                      <Combobox
                        options={PARTNER_INDUSTRIES.map((i) => ({ value: i, label: i }))}
                        value={field.value}
                        onChange={field.onChange}
                        placeholder="Select industry"
                        searchPlaceholder="Search industries…"
                      />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="partnership_model"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Partnership model</FormLabel>
                      <Combobox
                        options={PARTNERSHIP_MODELS.map((m) => ({ value: m, label: m }))}
                        value={field.value}
                        onChange={field.onChange}
                        placeholder="Select model"
                        searchPlaceholder="Search models…"
                      />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="logo_url"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Logo URL (optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="https://…" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </section>

            <section className="space-y-4">
              <h3 className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">Location</h3>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Address</FormLabel>
                      <FormControl>
                        <Input placeholder="Street / building" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="town"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Town / City</FormLabel>
                      <FormControl>
                        <Input placeholder="Nairobi" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="country"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Country</FormLabel>
                      <FormControl>
                        <Input placeholder="Kenya" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
            </section>

            <section className="space-y-4">
              <h3 className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
                Primary contact
              </h3>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="contact_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contact person</FormLabel>
                      <FormControl>
                        <Input placeholder="John Doe" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="contact_title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contact title</FormLabel>
                      <FormControl>
                        <Input placeholder="Relationship Manager" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="work_email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Work email</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="contact@partner.com" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="phone_mobile"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Mobile phone</FormLabel>
                      <FormControl>
                        <Input placeholder="07xx xxx xxx" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="phone_office"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Office phone</FormLabel>
                      <FormControl>
                        <Input placeholder="020 xxx xxxx" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea rows={2} placeholder="Context about this partnership…" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </section>
          </form>
        </Form>

        <SheetFooter className="p-4">
          <Button type="submit" form="partner-form" disabled={submitting}>
            {partner ? "Save changes" : "Create partner"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
