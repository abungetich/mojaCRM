import { zodResolver } from "@hookform/resolvers/zod"
import { Building2, UsersRound } from "lucide-react"
import { useEffect } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"

import { Combobox, type ComboboxOption } from "@/components/combobox"
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
import type { Client, ClientInput, ClientType } from "@/types"

const schema = z
  .object({
    client_type: z.enum(["person", "company"]),
    first_name: z.string().optional(),
    middle_name: z.string().optional(),
    last_name: z.string().optional(),
    id_type: z.enum(["id", "passport"]),
    id_number: z.string().optional(),
    company_name: z.string().optional(),
    reg_number: z.string().optional(),
    kra_pin: z.string().optional(),
    company_client_id: z.string().optional(),
    code: z.string().optional(),
    email: z.string().optional(),
    phone: z.string().optional(),
    address: z.string().optional(),
    notes: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.client_type === "company" && !data.company_name?.trim()) {
      ctx.addIssue({ path: ["company_name"], code: "custom", message: "Company name is required" })
    }
    if (data.client_type === "person") {
      if (!data.first_name?.trim()) ctx.addIssue({ path: ["first_name"], code: "custom", message: "First name is required" })
      if (!data.last_name?.trim()) ctx.addIssue({ path: ["last_name"], code: "custom", message: "Surname is required" })
    }
  })
type FormValues = z.infer<typeof schema>

const empty: FormValues = {
  client_type: "person",
  first_name: "",
  middle_name: "",
  last_name: "",
  id_type: "id",
  id_number: "",
  company_name: "",
  reg_number: "",
  kra_pin: "",
  company_client_id: "",
  code: "",
  email: "",
  phone: "",
  address: "",
  notes: "",
}

function toFormValues(c: Client): FormValues {
  return {
    ...empty,
    client_type: c.client_type,
    first_name: c.first_name,
    middle_name: c.middle_name,
    last_name: c.last_name,
    id_type: c.id_type,
    id_number: c.id_number,
    company_name: c.company_name,
    reg_number: c.reg_number,
    kra_pin: c.kra_pin,
    company_client_id: c.company_client_id ?? "",
    code: c.code ?? "",
    email: c.email,
    phone: c.phone,
    address: c.address,
    notes: c.notes,
  }
}

export function ClientFormSheet({
  open,
  onOpenChange,
  client,
  defaultType,
  companyOptions,
  onSubmit,
  submitting,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  client?: Client
  defaultType?: ClientType
  /** Company clients a "person" client can be linked to as their represented employer. */
  companyOptions: ComboboxOption[]
  onSubmit: (input: ClientInput) => void
  submitting?: boolean
}) {
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: client ? toFormValues(client) : { ...empty, client_type: defaultType ?? "person" },
  })

  useEffect(() => {
    if (open) {
      form.reset(client ? toFormValues(client) : { ...empty, client_type: defaultType ?? "person" })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, client])

  const clientType = form.watch("client_type")
  const idType = form.watch("id_type")
  const isCompany = clientType === "company"

  const filteredCompanyOptions = client
    ? companyOptions.filter((o) => o.value !== client.id)
    : companyOptions

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full gap-0 overflow-y-auto p-0 sm:max-w-lg">
        <ModalHeader
          icon={isCompany ? Building2 : UsersRound}
          title={client ? "Edit client" : "New client"}
          description={client ? "Update this client's details" : "Add a person or company you work for"}
        />

        <Form {...form}>
          <form
            id="client-form"
            onSubmit={form.handleSubmit((values) => onSubmit(values as ClientInput))}
            className="space-y-6 p-4"
          >
            {!client && (
              <FormField
                control={form.control}
                name="client_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Client type</FormLabel>
                    <Select
                      items={[
                        { value: "person", label: "Person" },
                        { value: "company", label: "Company" },
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
                        <SelectItem value="person">Person</SelectItem>
                        <SelectItem value="company">Company</SelectItem>
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
              {isCompany ? (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="company_name"
                    render={({ field }) => (
                      <FormItem className="sm:col-span-2">
                        <FormLabel>Company name</FormLabel>
                        <FormControl>
                          <Input placeholder="Acme Ltd" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="reg_number"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Registration no.</FormLabel>
                        <FormControl>
                          <Input placeholder="C.12345" {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="kra_pin"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>KRA PIN</FormLabel>
                        <FormControl>
                          <Input placeholder="P0512345678X" {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
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
                            <Input placeholder="Jane" {...field} />
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
                            <Input placeholder="Mwangi" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <FormField
                      control={form.control}
                      name="id_type"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Identity document</FormLabel>
                          <Select
                            items={[
                              { value: "id", label: "National ID" },
                              { value: "passport", label: "Passport" },
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
                              <SelectItem value="id">National ID</SelectItem>
                              <SelectItem value="passport">Passport</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="id_number"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{idType === "passport" ? "Passport no." : "National ID no."}</FormLabel>
                          <FormControl>
                            <Input placeholder="Optional" {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name="company_client_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Represents company (optional)</FormLabel>
                        <Combobox
                          options={[{ value: "", label: "— None —" }, ...filteredCompanyOptions]}
                          value={field.value}
                          onChange={field.onChange}
                          placeholder="Link to a company client"
                          searchPlaceholder="Search companies…"
                          allowCustom={false}
                        />
                      </FormItem>
                    )}
                  />
                </>
              )}
            </section>

            <section className="space-y-4">
              <h3 className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
                Contact information
              </h3>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Reference code</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. ABC" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="name@example.com" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone</FormLabel>
                      <FormControl>
                        <Input placeholder="07xx xxx xxx" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Address</FormLabel>
                    <FormControl>
                      <Textarea rows={2} placeholder="Physical / postal address" {...field} />
                    </FormControl>
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
                      <Textarea rows={2} placeholder="Anything worth remembering…" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </section>
          </form>
        </Form>

        <SheetFooter className="p-4">
          <Button type="submit" form="client-form" disabled={submitting}>
            {client ? "Save changes" : "Create client"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
