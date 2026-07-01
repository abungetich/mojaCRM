import { zodResolver } from "@hookform/resolvers/zod"
import { LandPlot } from "lucide-react"
import { useEffect } from "react"
import { useForm, type Resolver } from "react-hook-form"
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
import { Sheet, SheetContent, SheetFooter } from "@/components/ui/sheet"
import { Textarea } from "@/components/ui/textarea"
import type { Comparable, ComparableInput } from "@/types"

const schema = z
  .object({
    parcel_ref: z.string().optional(),
    size: z.string().optional(),
    location: z.string().optional(),
    county: z.string().optional(),
    land_user: z.string().optional(),
    comp_date: z.string().optional(),
    value: z.string().optional(),
    value_amount: z.coerce.number().min(0).optional(),
    value_date: z.string().optional(),
    source: z.string().optional(),
    contact_phone: z.string().optional(),
    done_by: z.string().optional(),
    lat: z.coerce.number().optional(),
    lng: z.coerce.number().optional(),
    notes: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (!data.parcel_ref?.trim() && !data.location?.trim()) {
      ctx.addIssue({ path: ["location"], code: "custom", message: "A parcel reference or location is required" })
    }
  })
type FormValues = z.infer<typeof schema>

const empty: FormValues = {
  parcel_ref: "",
  size: "",
  location: "",
  county: "",
  land_user: "",
  comp_date: "",
  value: "",
  value_amount: 0,
  value_date: "",
  source: "",
  contact_phone: "",
  done_by: "",
  lat: 0,
  lng: 0,
  notes: "",
}

function toFormValues(c: Comparable): FormValues {
  return {
    ...empty,
    parcel_ref: c.parcel_ref,
    size: c.size,
    location: c.location,
    county: c.county,
    land_user: c.land_user,
    comp_date: c.comp_date,
    value: c.value,
    value_amount: c.value_amount,
    value_date: c.value_date ?? "",
    source: c.source,
    contact_phone: c.contact_phone,
    done_by: c.done_by,
    lat: c.lat,
    lng: c.lng,
    notes: c.notes,
  }
}

export function ComparableFormSheet({
  open,
  onOpenChange,
  comparable,
  onSubmit,
  submitting,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  comparable?: Comparable
  onSubmit: (input: ComparableInput) => void
  submitting?: boolean
}) {
  const form = useForm<FormValues>({
    resolver: zodResolver(schema) as Resolver<FormValues>,
    defaultValues: comparable ? toFormValues(comparable) : empty,
  })

  useEffect(() => {
    if (open) {
      form.reset(comparable ? toFormValues(comparable) : empty)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, comparable])

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full gap-0 overflow-y-auto p-0 sm:max-w-lg">
        <ModalHeader
          icon={LandPlot}
          title={comparable ? "Edit comparable" : "New comparable"}
          description={
            comparable
              ? "Update this market evidence record"
              : "Add a property sale record to the comparables library"
          }
        />

        <Form {...form}>
          <form
            id="comparable-form"
            onSubmit={form.handleSubmit((values) => onSubmit(values as ComparableInput))}
            className="space-y-6 p-4"
          >
            <section className="space-y-4">
              <h3 className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
                Property details
              </h3>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="parcel_ref"
                  render={({ field }) => (
                    <FormItem className="sm:col-span-2">
                      <FormLabel>Parcel reference</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. KISUMU/MANYATTA 'B'/****" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="location"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Location</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Next to our subject" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="county"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>County</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Kisumu" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="size"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Size</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. 0.05 Ha" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="land_user"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Land use</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Residential (Developed)" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
            </section>

            <section className="space-y-4">
              <h3 className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
                Sale evidence
              </h3>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="value"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Value (display)</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Kshs. 1,700,000/=" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="value_amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Value amount (Kshs)</FormLabel>
                      <FormControl>
                        <Input type="number" min={0} {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="comp_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sale date (display)</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. October, 2025" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="value_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sale date</FormLabel>
                      <DatePicker value={field.value} onChange={field.onChange} />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="source"
                  render={({ field }) => (
                    <FormItem className="sm:col-span-2">
                      <FormLabel>Source</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Local estate agent" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
            </section>

            <section className="space-y-4">
              <h3 className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
                Contact &amp; map position
              </h3>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="contact_phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contact phone</FormLabel>
                      <FormControl>
                        <Input placeholder="07xx xxx xxx" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="done_by"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Done by</FormLabel>
                      <FormControl>
                        <Input placeholder="Who collected this comparable" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="lat"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Latitude</FormLabel>
                      <FormControl>
                        <Input type="number" step="any" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="lng"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Longitude</FormLabel>
                      <FormControl>
                        <Input type="number" step="any" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
            </section>

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
          </form>
        </Form>

        <SheetFooter className="p-4">
          <Button type="submit" form="comparable-form" disabled={submitting}>
            {comparable ? "Save changes" : "Add comparable"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
