import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  Ban,
  Car,
  CalendarClock,
  LogIn,
  LogOut,
  Mail,
  MapPin,
  MoreHorizontal,
  Phone,
  Plus,
  Trash2,
} from "lucide-react"
import { useEffect, useState } from "react"
import { useForm, type Resolver } from "react-hook-form"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import { DateTimePicker } from "@/components/date-picker"
import { inspections as inspectionsApi } from "@/lib/api"
import { useAuth } from "@/lib/auth"
import { captureGps, TRANSPORT_MODES, transportModeLabel } from "@/lib/geo"
import type { Inspection, InspectionInput, InspectionStatus } from "@/types"

const schema = z.object({
  scheduled_at: z.string().optional(),
  contact_name: z.string().optional(),
  contact_phone: z.string().optional(),
  notes: z.string().optional(),
  transport_mode: z.string().optional(),
})
type FormValues = z.infer<typeof schema>

const empty: FormValues = {
  scheduled_at: "",
  contact_name: "",
  contact_phone: "",
  notes: "",
  transport_mode: "",
}

const STATUS_BADGE: Record<InspectionStatus, { label: string; variant: "outline" | "default" | "success" | "destructive" }> = {
  scheduled: { label: "Scheduled", variant: "outline" },
  arrived: { label: "On site", variant: "default" },
  completed: { label: "Completed", variant: "success" },
  cancelled: { label: "Cancelled", variant: "destructive" },
}

function formatWhen(iso?: string) {
  if (!iso) return "Date to be confirmed"
  return new Date(iso).toLocaleString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  })
}

export function ClientInspectionsTab({ clientId }: { clientId: string }) {
  const { hasPermission } = useAuth()
  const canWrite = hasPermission("inspections:write")
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Inspection | undefined>()

  const inspectionsQuery = useQuery({
    queryKey: ["clients", clientId, "inspections"],
    queryFn: () => inspectionsApi.byClient.list(clientId),
  })

  const form = useForm<FormValues>({
    resolver: zodResolver(schema) as Resolver<FormValues>,
    defaultValues: empty,
  })

  useEffect(() => {
    if (open) {
      form.reset(
        editing
          ? {
              scheduled_at: editing.scheduled_at ? editing.scheduled_at.slice(0, 16) : "",
              contact_name: editing.contact_name,
              contact_phone: editing.contact_phone,
              notes: editing.notes,
              transport_mode: editing.transport_mode,
            }
          : empty
      )
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editing])

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["clients", clientId, "inspections"] })
    queryClient.invalidateQueries({ queryKey: ["inspections"] })
  }

  const scheduleMutation = useMutation({
    mutationFn: (input: InspectionInput) => inspectionsApi.byClient.schedule(clientId, input),
    onSuccess: () => {
      toast.success("Visit scheduled")
      invalidate()
      setOpen(false)
    },
    onError: (err: Error) => toast.error(err.message),
  })
  const updateMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: InspectionInput }) => inspectionsApi.update(id, input),
    onSuccess: () => {
      toast.success("Visit updated")
      invalidate()
      setOpen(false)
      setEditing(undefined)
    },
    onError: (err: Error) => toast.error(err.message),
  })
  const arriveMutation = useMutation({
    mutationFn: async (id: string) => inspectionsApi.arrive(id, await captureGps()),
    onSuccess: () => {
      toast.success("Logged arrival on site")
      invalidate()
    },
    onError: (err: Error) => toast.error(err.message),
  })
  const departMutation = useMutation({
    mutationFn: async (id: string) => inspectionsApi.depart(id, await captureGps()),
    onSuccess: () => {
      toast.success("Visit completed")
      invalidate()
    },
    onError: (err: Error) => toast.error(err.message),
  })
  const cancelMutation = useMutation({
    mutationFn: (id: string) => inspectionsApi.cancel(id),
    onSuccess: () => {
      toast.success("Visit cancelled")
      invalidate()
    },
    onError: (err: Error) => toast.error(err.message),
  })
  const removeMutation = useMutation({
    mutationFn: (id: string) => inspectionsApi.remove(id),
    onSuccess: () => {
      toast.success("Visit removed")
      invalidate()
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const openCreate = () => {
    setEditing(undefined)
    setOpen(true)
  }
  const openEdit = (i: Inspection) => {
    setEditing(i)
    setOpen(true)
  }

  const visits = inspectionsQuery.data ?? []

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Field visits</h3>
        {canWrite && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger
              render={
                <Button size="sm" onClick={openCreate}>
                  <Plus /> Schedule visit
                </Button>
              }
            />
            <DialogContent className="gap-0 overflow-hidden p-0">
              <ModalHeader
                icon={CalendarClock}
                title={editing ? "Edit visit" : "Schedule a visit"}
                description="A site or field visit to this client"
              />
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit((values) => {
                    if (editing) {
                      updateMutation.mutate({ id: editing.id, input: values })
                    } else {
                      scheduleMutation.mutate(values)
                    }
                  })}
                  className="space-y-4 p-4"
                >
                  <FormField
                    control={form.control}
                    name="scheduled_at"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Date &amp; time</FormLabel>
                        <FormControl>
                          <DateTimePicker value={field.value} onChange={field.onChange} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <FormField
                      control={form.control}
                      name="contact_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Contact name</FormLabel>
                          <FormControl>
                            <Input placeholder="Who to meet on site" {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="contact_phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Contact phone</FormLabel>
                          <FormControl>
                            <Input placeholder="0xx" {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name="transport_mode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Transport</FormLabel>
                        <Select
                          items={TRANSPORT_MODES}
                          value={field.value || undefined}
                          onValueChange={field.onChange}
                        >
                          <FormControl>
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="How the officer will get there" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {TRANSPORT_MODES.map((t) => (
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
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Notes</FormLabel>
                        <FormControl>
                          <Textarea
                            rows={3}
                            placeholder="Access, gate code, landmark, what to check…"
                            {...field}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <DialogFooter className="p-0">
                    <Button type="submit" disabled={scheduleMutation.isPending || updateMutation.isPending}>
                      {editing ? "Save changes" : "Schedule visit"}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {inspectionsQuery.isLoading && (
        <div className="space-y-2">
          <Skeleton className="h-20 w-full rounded-lg" />
          <Skeleton className="h-20 w-full rounded-lg" />
        </div>
      )}

      {!inspectionsQuery.isLoading && visits.length === 0 && (
        <div className="text-muted-foreground rounded-lg border border-dashed py-8 text-center text-sm">
          No field visits scheduled yet.
        </div>
      )}

      <div className="space-y-2">
        {visits.map((v) => {
          const badge = STATUS_BADGE[v.status]
          return (
            <div key={v.id} className="flex items-start justify-between gap-3 rounded-lg border p-3">
              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2 font-medium">
                  <CalendarClock className="text-muted-foreground size-4" />
                  {formatWhen(v.scheduled_at)}
                  <Badge variant={badge.variant}>{badge.label}</Badge>
                </div>
                <div className="text-muted-foreground flex flex-wrap gap-x-4 text-xs">
                  {v.contact_name && (
                    <span className="inline-flex items-center gap-1">
                      <Mail className="size-3" />
                      {v.contact_name}
                    </span>
                  )}
                  {v.contact_phone && (
                    <span className="inline-flex items-center gap-1">
                      <Phone className="size-3" />
                      {v.contact_phone}
                    </span>
                  )}
                  {v.transport_mode && (
                    <span className="inline-flex items-center gap-1">
                      <Car className="size-3" />
                      {transportModeLabel(v.transport_mode)}
                    </span>
                  )}
                </div>
                {v.notes && <p className="text-muted-foreground text-sm">{v.notes}</p>}
                {(v.arrived_at || v.departed_at) && (
                  <div className="text-muted-foreground flex flex-wrap gap-x-4 text-xs">
                    {v.arrived_at && (
                      <span className="inline-flex items-center gap-1">
                        <LogIn className="size-3" />
                        Arrived {new Date(v.arrived_at).toLocaleString()}
                        {(v.arrival_lat || v.arrival_lng) && (
                          <MapPin className="size-3" />
                        )}
                      </span>
                    )}
                    {v.departed_at && (
                      <span className="inline-flex items-center gap-1">
                        <LogOut className="size-3" />
                        Departed {new Date(v.departed_at).toLocaleString()}
                      </span>
                    )}
                  </div>
                )}
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
                    <DropdownMenuItem onClick={() => openEdit(v)}>Edit</DropdownMenuItem>
                    {v.status === "scheduled" && (
                      <DropdownMenuItem onClick={() => arriveMutation.mutate(v.id)}>
                        <LogIn /> Log arrival
                      </DropdownMenuItem>
                    )}
                    {v.status === "arrived" && (
                      <DropdownMenuItem onClick={() => departMutation.mutate(v.id)}>
                        <LogOut /> Log departure
                      </DropdownMenuItem>
                    )}
                    {(v.status === "scheduled" || v.status === "arrived") && (
                      <DropdownMenuItem onClick={() => cancelMutation.mutate(v.id)}>
                        <Ban /> Cancel
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem variant="destructive" onClick={() => removeMutation.mutate(v.id)}>
                      <Trash2 /> Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
