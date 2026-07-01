import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Building2, Mail, MapPin, Phone, Trash2, UsersRound } from "lucide-react"
import { useState, type ReactNode } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog"
import { PageLoader } from "@/components/ui/spinner"
import { ModalHeader } from "@/components/modal-header"
import { PageHeader } from "@/components/page-header"
import { PlaceholderPage } from "@/components/placeholder-page"
import { ClientFormSheet } from "@/pages/tenant/directory/client-form"
import { clients as clientsApi } from "@/lib/api"
import { useAuth } from "@/lib/auth"
import type { ClientInput } from "@/types"

export function ClientDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { hasPermission } = useAuth()
  const queryClient = useQueryClient()
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  const canWrite = hasPermission("clients:write")
  const canDelete = hasPermission("clients:delete")

  const clientQuery = useQuery({
    queryKey: ["clients", id],
    queryFn: () => clientsApi.get(id!),
    enabled: !!id,
  })

  const companiesQuery = useQuery({
    queryKey: ["clients", "companies"],
    queryFn: () => clientsApi.list({ page: 1, page_size: 200, client_type: "company" }),
  })

  const updateMutation = useMutation({
    mutationFn: (input: ClientInput) => clientsApi.update(id!, input),
    onSuccess: () => {
      toast.success("Client updated")
      queryClient.invalidateQueries({ queryKey: ["clients", id] })
      queryClient.invalidateQueries({ queryKey: ["clients"] })
      setEditOpen(false)
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const removeMutation = useMutation({
    mutationFn: () => clientsApi.remove(id!),
    onSuccess: () => {
      toast.success("Client deleted")
      queryClient.invalidateQueries({ queryKey: ["clients"] })
      navigate("/clients")
    },
    onError: (err: Error) => toast.error(err.message),
  })

  if (clientQuery.isLoading) {
    return <PageLoader label="Loading client…" />
  }

  const client = clientQuery.data
  if (!client) {
    return (
      <PlaceholderPage
        icon={UsersRound}
        title="Client not found"
        description="This client may have been deleted."
      />
    )
  }

  const isCompany = client.client_type === "company"

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[{ label: "Clients", to: "/clients" }, { label: client.display_name }]}
        backTo="/clients"
        title=""
      />

      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div className="flex items-start gap-3">
          <div className="bg-muted flex size-12 shrink-0 items-center justify-center rounded-xl">
            {isCompany ? (
              <Building2 className="text-muted-foreground size-6" />
            ) : (
              <UsersRound className="text-muted-foreground size-6" />
            )}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight">{client.display_name}</h1>
              <Badge variant="outline" className="capitalize">{client.client_type}</Badge>
            </div>
            <p className="text-muted-foreground text-sm">
              {isCompany ? "Company client" : "Individual client"}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {canWrite && (
            <Button variant="outline" onClick={() => setEditOpen(true)}>
              Edit
            </Button>
          )}
          {canDelete && (
            <Button variant="outline" onClick={() => setDeleteOpen(true)}>
              <Trash2 /> Delete
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div className="space-y-3 rounded-lg border p-4">
          <h3 className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">Profile</h3>
          {isCompany ? (
            <>
              <Field label="Company name" value={client.company_name} />
              <Field label="Registration no." value={client.reg_number} />
              <Field label="KRA PIN" value={client.kra_pin} />
            </>
          ) : (
            <>
              <Field
                label="Full name"
                value={`${client.first_name} ${client.middle_name} ${client.last_name}`.replace(/\s+/g, " ").trim()}
              />
              <Field
                label={client.id_type === "passport" ? "Passport no." : "National ID no."}
                value={client.id_number}
              />
              <Field
                label="Represents company"
                value={
                  client.company_client_id ? (
                    <Link to={`/clients/${client.company_client_id}`} className="text-primary hover:underline">
                      {client.company_client_name || "View company"}
                    </Link>
                  ) : undefined
                }
              />
            </>
          )}
          <Field label="Reference code" value={client.code} />
        </div>

        <div className="space-y-3 rounded-lg border p-4">
          <h3 className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
            Contact &amp; notes
          </h3>
          <Field label="Email" value={client.email} icon={Mail} />
          <Field label="Phone" value={client.phone} icon={Phone} />
          <Field label="Address" value={client.address} icon={MapPin} />
          <Field label="Notes" value={client.notes} />
          <p className="text-muted-foreground pt-2 text-xs">
            Added {new Date(client.created_at).toLocaleDateString()}
            {client.created_by_name ? ` by ${client.created_by_name}` : ""}
          </p>
        </div>
      </div>

      <ClientFormSheet
        open={editOpen}
        onOpenChange={setEditOpen}
        client={client}
        companyOptions={(companiesQuery.data?.data ?? []).map((c) => ({ value: c.id, label: c.display_name }))}
        onSubmit={(input) => updateMutation.mutate(input)}
        submitting={updateMutation.isPending}
      />

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="gap-0 overflow-hidden p-0">
          <ModalHeader
            icon={Trash2}
            title="Delete client?"
            description={`"${client.display_name}" will be permanently removed.`}
          />
          <DialogFooter className="p-4">
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" disabled={removeMutation.isPending} onClick={() => removeMutation.mutate()}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function Field({
  label,
  value,
  icon: Icon,
}: {
  label: string
  value?: ReactNode
  icon?: typeof Mail
}) {
  return (
    <div className="flex items-start justify-between gap-4 text-sm">
      <span className="text-muted-foreground flex items-center gap-1.5">
        {Icon && <Icon className="size-3.5" />}
        {label}
      </span>
      <span className="text-right font-medium">{value || "—"}</span>
    </div>
  )
}
