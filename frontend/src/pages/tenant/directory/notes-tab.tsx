import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import { customers as customersApi } from "@/lib/api"
import { useAuth } from "@/lib/auth"

export function NotesTab({ customerId }: { customerId: string }) {
  const { hasPermission } = useAuth()
  const canWrite = hasPermission("customers:write")
  const queryClient = useQueryClient()
  const [body, setBody] = useState("")

  const notesQuery = useQuery({
    queryKey: ["customers", customerId, "notes"],
    queryFn: () => customersApi.notes.list(customerId),
  })

  const createMutation = useMutation({
    mutationFn: (b: string) => customersApi.notes.create(customerId, b),
    onSuccess: () => {
      toast.success("Note added")
      setBody("")
      queryClient.invalidateQueries({ queryKey: ["customers", customerId, "notes"] })
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const notes = notesQuery.data ?? []

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold">Internal notes</h3>

      {canWrite && (
        <div className="space-y-2">
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Add a note for your team…"
            rows={3}
          />
          <div className="flex justify-end">
            <Button
              size="sm"
              disabled={!body.trim() || createMutation.isPending}
              onClick={() => createMutation.mutate(body.trim())}
            >
              Add note
            </Button>
          </div>
        </div>
      )}

      {notesQuery.isLoading && (
        <div className="space-y-2">
          <Skeleton className="h-16 w-full rounded-lg" />
          <Skeleton className="h-16 w-full rounded-lg" />
        </div>
      )}

      {!notesQuery.isLoading && notes.length === 0 && (
        <div className="text-muted-foreground rounded-lg border border-dashed py-8 text-center text-sm">
          No notes yet.
        </div>
      )}

      <div className="space-y-2">
        {notes.map((n) => (
          <div key={n.id} className="rounded-lg border p-3">
            <p className="text-sm whitespace-pre-wrap">{n.body}</p>
            <div className="text-muted-foreground mt-2 text-xs">
              {n.author_name || "Unknown"} · {new Date(n.created_at).toLocaleString()}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
