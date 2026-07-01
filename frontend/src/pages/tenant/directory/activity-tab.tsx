import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { format, isToday, isYesterday } from "date-fns"
import { ArrowDownLeft, ArrowUpRight, CalendarCheck, MoreHorizontal } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Skeleton } from "@/components/ui/skeleton"
import {
  COMM_TYPE_ICON,
  COMM_TYPE_LABEL,
  CommunicationComposer,
  QUICK_ACTIONS,
} from "@/pages/tenant/directory/communication-composer"
import { communications as commsApi, customers as customersApi } from "@/lib/api"
import { useAuth } from "@/lib/auth"
import type { Communication, CommunicationInput, CommunicationType } from "@/types"

const STATUS_BADGE: Record<string, "success" | "secondary" | "destructive" | "outline"> = {
  completed: "success",
  delivered: "success",
  sent: "outline",
  draft: "secondary",
  failed: "destructive",
}

function groupByDay(items: Communication[]) {
  const groups: { label: string; items: Communication[] }[] = []
  for (const item of items) {
    const date = new Date(item.communication_date)
    const label = isToday(date) ? "Today" : isYesterday(date) ? "Yesterday" : format(date, "MMMM d, yyyy")
    const group = groups.find((g) => g.label === label)
    if (group) group.items.push(item)
    else groups.push({ label, items: [item] })
  }
  return groups
}

export function ActivityTab({ customerId }: { customerId: string }) {
  const { hasPermission } = useAuth()
  const canWrite = hasPermission("communications:write")
  const queryClient = useQueryClient()
  const [composerOpen, setComposerOpen] = useState(false)
  const [composerType, setComposerType] = useState<CommunicationType>("call")

  const timelineQuery = useQuery({
    queryKey: ["customers", customerId, "communications"],
    queryFn: () => customersApi.communications.list(customerId),
  })
  const contactsQuery = useQuery({
    queryKey: ["customers", customerId, "contacts"],
    queryFn: () => customersApi.contacts.list(customerId),
  })

  const createMutation = useMutation({
    mutationFn: (input: CommunicationInput) => customersApi.communications.create(customerId, input),
    onSuccess: () => {
      toast.success("Communication logged")
      queryClient.invalidateQueries({ queryKey: ["customers", customerId, "communications"] })
      setComposerOpen(false)
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const completeMutation = useMutation({
    mutationFn: (id: string) => commsApi.completeFollowUp(id),
    onSuccess: () => {
      toast.success("Follow-up marked complete")
      queryClient.invalidateQueries({ queryKey: ["customers", customerId, "communications"] })
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => commsApi.remove(id),
    onSuccess: () => {
      toast.success("Communication removed")
      queryClient.invalidateQueries({ queryKey: ["customers", customerId, "communications"] })
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const openComposer = (type: CommunicationType) => {
    setComposerType(type)
    setComposerOpen(true)
  }

  const items = timelineQuery.data ?? []
  const groups = groupByDay(items)

  return (
    <div className="space-y-4">
      {canWrite && (
        <div className="flex flex-wrap gap-2">
          {QUICK_ACTIONS.map((action) => (
            <Button key={action.type} variant="outline" size="sm" onClick={() => openComposer(action.type)}>
              <action.icon /> {action.label}
            </Button>
          ))}
        </div>
      )}

      {timelineQuery.isLoading && (
        <div className="space-y-2">
          <Skeleton className="h-20 w-full rounded-lg" />
          <Skeleton className="h-20 w-full rounded-lg" />
        </div>
      )}

      {!timelineQuery.isLoading && items.length === 0 && (
        <div className="text-muted-foreground rounded-lg border border-dashed py-10 text-center text-sm">
          No activity logged yet. Use the buttons above to log your first interaction.
        </div>
      )}

      <div className="space-y-6">
        {groups.map((group) => (
          <div key={group.label} className="space-y-2">
            <h4 className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">{group.label}</h4>
            <div className="space-y-2">
              {group.items.map((item) => {
                const Icon = COMM_TYPE_ICON[item.communication_type]
                const DirectionIcon =
                  item.direction === "incoming" ? ArrowDownLeft : item.direction === "outgoing" ? ArrowUpRight : null
                return (
                  <div key={item.id} className="bg-card flex items-start gap-3 rounded-lg border p-3">
                    <div className="bg-muted flex size-9 shrink-0 items-center justify-center rounded-full">
                      <Icon className="text-muted-foreground size-4" />
                    </div>
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="font-medium">{COMM_TYPE_LABEL[item.communication_type]}</span>
                        {DirectionIcon && <DirectionIcon className="text-muted-foreground size-3.5" />}
                        {item.subject && <span className="text-muted-foreground">— {item.subject}</span>}
                        <Badge variant={STATUS_BADGE[item.status] ?? "outline"} className="ml-auto">
                          {item.status}
                        </Badge>
                      </div>
                      <div className="text-muted-foreground text-xs">
                        {item.contact_name && `${item.contact_name} · `}
                        {format(new Date(item.communication_date), "MMM d, yyyy · h:mm a")}
                        {item.created_by_name && ` · Logged by ${item.created_by_name}`}
                      </div>
                      {item.message_body && <p className="text-sm">{item.message_body}</p>}
                      {item.follow_up_required && (
                        <div className="flex items-center gap-2 pt-1">
                          <Badge variant="secondary" className="gap-1">
                            <CalendarCheck className="size-3" />
                            Follow-up
                            {item.follow_up_date && ` · ${format(new Date(item.follow_up_date), "MMM d, yyyy")}`}
                          </Badge>
                          {canWrite && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 px-2 text-xs"
                              onClick={() => completeMutation.mutate(item.id)}
                            >
                              Mark complete
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                    {canWrite && (
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          render={
                            <Button variant="ghost" size="icon-sm">
                              <MoreHorizontal />
                            </Button>
                          }
                        />
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem variant="destructive" onClick={() => deleteMutation.mutate(item.id)}>
                            Delete log
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      <CommunicationComposer
        open={composerOpen}
        onOpenChange={setComposerOpen}
        contacts={contactsQuery.data ?? []}
        defaultType={composerType}
        onSubmit={(input) => createMutation.mutate(input)}
        submitting={createMutation.isPending}
      />
    </div>
  )
}
