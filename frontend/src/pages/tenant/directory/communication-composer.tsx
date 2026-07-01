import { zodResolver } from "@hookform/resolvers/zod"
import {
  Bell,
  CalendarClock,
  Mail,
  MessageCircle,
  MessageSquareText,
  Phone,
  StickyNote,
  type LucideIcon,
} from "lucide-react"
import { useEffect } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"

import { DateTimePicker } from "@/components/date-picker"
import { ModalHeader } from "@/components/modal-header"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
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
import type { Communication, CommunicationInput, CommunicationType, Contact } from "@/types"

export const QUICK_ACTIONS: {
  type: CommunicationType
  label: string
  icon: LucideIcon
}[] = [
  { type: "call", label: "Log Call", icon: Phone },
  { type: "email", label: "Send Email", icon: Mail },
  { type: "whatsapp", label: "Send WhatsApp", icon: MessageCircle },
  { type: "note", label: "Add Note", icon: StickyNote },
  { type: "task_followup", label: "Schedule Follow-up", icon: CalendarClock },
]

export const COMM_TYPE_ICON: Record<CommunicationType, LucideIcon> = {
  call: Phone,
  email: Mail,
  sms: MessageSquareText,
  whatsapp: MessageCircle,
  meeting: CalendarClock,
  note: StickyNote,
  task_followup: Bell,
  system_message: Bell,
}

export const COMM_TYPE_LABEL: Record<CommunicationType, string> = {
  call: "Call",
  email: "Email",
  sms: "SMS",
  whatsapp: "WhatsApp",
  meeting: "Meeting",
  note: "Note",
  task_followup: "Follow-up",
  system_message: "System",
}

const schema = z.object({
  contact_id: z.string().optional(),
  communication_type: z.enum(["call", "email", "sms", "whatsapp", "meeting", "note", "task_followup", "system_message"]),
  direction: z.enum(["incoming", "outgoing", "internal"]),
  subject: z.string().optional(),
  message_body: z.string().optional(),
  communication_date: z.string().min(1, "Required"),
  follow_up_required: z.boolean(),
  follow_up_date: z.string().optional(),
})
type FormValues = z.infer<typeof schema>

function nowLocal() {
  const d = new Date()
  d.setSeconds(0, 0)
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
}

export function CommunicationComposer({
  open,
  onOpenChange,
  contacts,
  defaultType,
  onSubmit,
  submitting,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  contacts: Contact[]
  defaultType: CommunicationType
  onSubmit: (input: CommunicationInput) => void
  submitting?: boolean
}) {
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      contact_id: "",
      communication_type: defaultType,
      direction: "outgoing",
      subject: "",
      message_body: "",
      communication_date: nowLocal(),
      follow_up_required: defaultType === "task_followup",
      follow_up_date: "",
    },
  })

  useEffect(() => {
    if (open) {
      form.reset({
        contact_id: "",
        communication_type: defaultType,
        direction: "outgoing",
        subject: "",
        message_body: "",
        communication_date: nowLocal(),
        follow_up_required: defaultType === "task_followup",
        follow_up_date: "",
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, defaultType])

  const followUpRequired = form.watch("follow_up_required")
  const Icon = COMM_TYPE_ICON[form.watch("communication_type")]

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full gap-0 overflow-y-auto p-0 sm:max-w-lg">
        <ModalHeader icon={Icon} title="Log communication" description="Record an interaction with this customer" />

        <Form {...form}>
          <form
            id="communication-form"
            onSubmit={form.handleSubmit((values) =>
              onSubmit({
                ...values,
                contact_id: values.contact_id || undefined,
                follow_up_date: values.follow_up_required ? values.follow_up_date : undefined,
                status: "completed",
              })
            )}
            className="space-y-4 p-4"
          >
            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="communication_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Channel</FormLabel>
                    <Select
                      items={Object.entries(COMM_TYPE_LABEL).map(([value, label]) => ({ value, label }))}
                      onValueChange={field.onChange}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(COMM_TYPE_LABEL).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="direction"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Direction</FormLabel>
                    <Select
                      items={[
                        { value: "outgoing", label: "Outgoing" },
                        { value: "incoming", label: "Incoming" },
                        { value: "internal", label: "Internal" },
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
                        <SelectItem value="outgoing">Outgoing</SelectItem>
                        <SelectItem value="incoming">Incoming</SelectItem>
                        <SelectItem value="internal">Internal</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
            </div>

            {contacts.length > 0 && (
              <FormField
                control={form.control}
                name="contact_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contact</FormLabel>
                    <Select
                      items={contacts.map((c) => ({ value: c.id, label: `${c.first_name} ${c.last_name}` }))}
                      onValueChange={field.onChange}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="No specific contact" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {contacts.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.first_name} {c.last_name}
                            {c.job_title ? ` · ${c.job_title}` : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="subject"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Subject</FormLabel>
                  <FormControl>
                    <Input placeholder="Short title for this activity" {...field} />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="message_body"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Message / notes</FormLabel>
                  <FormControl>
                    <Textarea rows={4} placeholder="What happened, what was discussed…" {...field} />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="communication_date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>When</FormLabel>
                  <DateTimePicker value={field.value} onChange={field.onChange} />
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="follow_up_required"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center gap-2 space-y-0">
                  <FormControl>
                    <Checkbox checked={field.value} onCheckedChange={(v) => field.onChange(!!v)} />
                  </FormControl>
                  <FormLabel className="!mt-0">Follow-up required</FormLabel>
                </FormItem>
              )}
            />

            {followUpRequired && (
              <FormField
                control={form.control}
                name="follow_up_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Follow-up date</FormLabel>
                    <DateTimePicker value={field.value} onChange={field.onChange} placeholder="Pick follow-up date" />
                  </FormItem>
                )}
              />
            )}
          </form>
        </Form>

        <SheetFooter className="p-4">
          <Button type="submit" form="communication-form" disabled={submitting}>
            Save
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

export type { Communication }
