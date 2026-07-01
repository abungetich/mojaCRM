import { zodResolver } from "@hookform/resolvers/zod"
import { Building2, UsersRound } from "lucide-react"
import { useEffect } from "react"
import { useForm } from "react-hook-form"
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
import {
  Sheet,
  SheetContent,
  SheetFooter,
} from "@/components/ui/sheet"
import { Textarea } from "@/components/ui/textarea"
import type { Customer, CustomerInput, CustomerType } from "@/types"

const INDUSTRIES = [
  "Logistics",
  "Health",
  "FMCG",
  "Manufacturing",
  "Retail",
  "Agriculture",
  "Finance",
  "Technology",
  "Real Estate",
  "Education",
  "Hospitality",
  "Construction",
  "Transport",
  "Energy",
  "Government",
  "NGO",
]

const schema = z
  .object({
    customer_type: z.enum(["organization", "individual"]),
    segment: z.string().optional(),
    source: z.string().optional(),
    organization_name: z.string().optional(),
    legal_name: z.string().optional(),
    trading_name: z.string().optional(),
    registration_number: z.string().optional(),
    tax_pin: z.string().optional(),
    industry: z.string().optional(),
    organization_size: z.string().optional(),
    first_name: z.string().optional(),
    middle_name: z.string().optional(),
    last_name: z.string().optional(),
    display_name: z.string().optional(),
    id_number: z.string().optional(),
    date_of_birth: z.string().optional(),
    gender: z.string().optional(),
    occupation: z.string().optional(),
    website: z.string().optional(),
    description: z.string().optional(),
    primary_email: z.string().optional(),
    primary_phone: z.string().optional(),
    alternative_phone: z.string().optional(),
    address: z.string().optional(),
    country: z.string().optional(),
    state: z.string().optional(),
    city: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.customer_type === "organization" && !data.organization_name?.trim()) {
      ctx.addIssue({ path: ["organization_name"], code: "custom", message: "Organization name is required" })
    }
    if (data.customer_type === "individual") {
      if (!data.first_name?.trim()) ctx.addIssue({ path: ["first_name"], code: "custom", message: "First name is required" })
      if (!data.last_name?.trim()) ctx.addIssue({ path: ["last_name"], code: "custom", message: "Last name is required" })
      if (!data.primary_phone?.trim()) ctx.addIssue({ path: ["primary_phone"], code: "custom", message: "Phone is required" })
    }
  })
type FormValues = z.infer<typeof schema>

const empty: FormValues = {
  customer_type: "organization",
  segment: "",
  source: "",
  organization_name: "",
  legal_name: "",
  trading_name: "",
  registration_number: "",
  tax_pin: "",
  industry: "",
  organization_size: "",
  first_name: "",
  middle_name: "",
  last_name: "",
  display_name: "",
  id_number: "",
  date_of_birth: "",
  gender: "",
  occupation: "",
  website: "",
  description: "",
  primary_email: "",
  primary_phone: "",
  alternative_phone: "",
  address: "",
  country: "",
  state: "",
  city: "",
}

function toFormValues(c: Customer): FormValues {
  return { ...empty, ...c, date_of_birth: c.date_of_birth ?? "" }
}

export function CustomerFormSheet({
  open,
  onOpenChange,
  customer,
  defaultType,
  onSubmit,
  submitting,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  customer?: Customer
  defaultType?: CustomerType
  onSubmit: (input: CustomerInput) => void
  submitting?: boolean
}) {
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: customer ? toFormValues(customer) : { ...empty, customer_type: defaultType ?? "organization" },
  })

  useEffect(() => {
    if (open) {
      form.reset(customer ? toFormValues(customer) : { ...empty, customer_type: defaultType ?? "organization" })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, customer])

  const customerType = form.watch("customer_type")
  const isOrg = customerType === "organization"
  // Creating a brand-new organization only needs a phone number — full
  // contact details and actual contact people are added later from the
  // customer detail page. Editing an existing organization (or an
  // individual, whose contact info *is* the customer) shows the full section.
  const showFullContactSection = !isOrg || !!customer

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full gap-0 overflow-y-auto p-0 sm:max-w-lg">
        <ModalHeader
          icon={isOrg ? Building2 : UsersRound}
          title={customer ? "Edit customer" : "New customer"}
          description={`${isOrg ? "Organization" : "Individual"} profile — basic, contact, and CRM details`}
        />

        <Form {...form}>
          <form
            id="customer-form"
            onSubmit={form.handleSubmit((values) => onSubmit(values as CustomerInput))}
            className="space-y-6 p-4"
          >
            {!customer && (
              <FormField
                control={form.control}
                name="customer_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Customer type</FormLabel>
                    <Select
                      items={[
                        { value: "organization", label: "Organization" },
                        { value: "individual", label: "Individual" },
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
                        <SelectItem value="organization">Organization</SelectItem>
                        <SelectItem value="individual">Individual</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
            )}

            <section className="space-y-4">
              <h3 className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
                Basic information
              </h3>
              {isOrg ? (
                <>
                  <FormField
                    control={form.control}
                    name="organization_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Organization name</FormLabel>
                        <FormControl>
                          <Input placeholder="Kilimo Traders Ltd" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  {showFullContactSection && (
                    <div className="grid grid-cols-2 gap-3">
                      <FormField
                        control={form.control}
                        name="legal_name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Legal name</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="trading_name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Trading name</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>
                  )}
                  {showFullContactSection && (
                    <div className="grid grid-cols-2 gap-3">
                      <FormField
                        control={form.control}
                        name="registration_number"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Registration no.</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="tax_pin"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Tax PIN / VAT</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-3">
                    <FormField
                      control={form.control}
                      name="industry"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Industry</FormLabel>
                          <Combobox
                            options={INDUSTRIES.map((i) => ({ value: i, label: i }))}
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
                      name="organization_size"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Size</FormLabel>
                          <Select
                            items={["Small", "Medium", "Large", "Enterprise"].map((s) => ({ value: s, label: s }))}
                            onValueChange={field.onChange}
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="Select" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {["Small", "Medium", "Large", "Enterprise"].map((s) => (
                                <SelectItem key={s} value={s}>
                                  {s}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )}
                    />
                  </div>
                </>
              ) : (
                <>
                  <div className="grid grid-cols-3 gap-3">
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
                      name="id_number"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>ID / Passport no.</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="date_of_birth"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Date of birth</FormLabel>
                          <DatePicker value={field.value} onChange={field.onChange} placeholder="Select date" />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <FormField
                      control={form.control}
                      name="gender"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Gender</FormLabel>
                          <Select
                            items={["Male", "Female", "Other"].map((s) => ({ value: s, label: s }))}
                            onValueChange={field.onChange}
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="Select" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="Male">Male</SelectItem>
                              <SelectItem value="Female">Female</SelectItem>
                              <SelectItem value="Other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="occupation"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Occupation</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                </>
              )}
              <FormField
                control={form.control}
                name="website"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Website</FormLabel>
                    <FormControl>
                      <Input placeholder="https://" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
              {showFullContactSection && (
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
              )}
            </section>

            <section className="space-y-4">
              <h3 className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
                Contact information
              </h3>
              {!showFullContactSection && (
                <p className="text-muted-foreground -mt-2 text-xs">
                  Just the phone number for now — full contact details and contact people can be added from the
                  customer's page once created.
                </p>
              )}
              {showFullContactSection && (
                <div className="grid grid-cols-2 gap-3">
                  <FormField
                    control={form.control}
                    name="primary_email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Primary email</FormLabel>
                        <FormControl>
                          <Input type="email" {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="primary_phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Primary phone</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}
              {!showFullContactSection && (
                <FormField
                  control={form.control}
                  name="primary_phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Telephone</FormLabel>
                      <FormControl>
                        <Input placeholder="Sourced from their website, if available" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              {showFullContactSection && (
                <>
                  <FormField
                    control={form.control}
                    name="alternative_phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Alternative phone</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Address</FormLabel>
                        <FormControl>
                          <Textarea rows={2} {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-3 gap-3">
                    <FormField
                      control={form.control}
                      name="country"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Country</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="state"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>County / State</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="city"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>City / Town</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                </>
              )}
            </section>

            <section className="space-y-4">
              <h3 className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
                CRM information
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="segment"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Segment</FormLabel>
                      <FormControl>
                        <Input
                          placeholder={isOrg ? "SME, Corporate…" : "Retail, VIP…"}
                          {...field}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="source"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Source</FormLabel>
                      <Select
                        items={["Referral", "Website", "Walk-in", "Campaign"].map((s) => ({ value: s, label: s }))}
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {["Referral", "Website", "Walk-in", "Campaign"].map((s) => (
                            <SelectItem key={s} value={s}>
                              {s}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />
              </div>
            </section>
          </form>
        </Form>

        <SheetFooter className="p-4">
          <Button type="submit" form="customer-form" disabled={submitting}>
            {customer ? "Save changes" : "Create customer"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
