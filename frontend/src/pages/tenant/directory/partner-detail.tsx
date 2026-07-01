import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  Briefcase,
  Building2,
  ClipboardList,
  FileText,
  Globe,
  Handshake,
  Mail,
  MapPin,
  Phone,
  Smartphone,
  Trash2,
  User,
} from "lucide-react"
import { useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog"
import { PageLoader } from "@/components/ui/spinner"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import { ModalHeader } from "@/components/modal-header"
import { PageHeader } from "@/components/page-header"
import { PlaceholderPage } from "@/components/placeholder-page"
import { PartnerAppendixTemplatesTab } from "@/pages/tenant/directory/partner-appendix-templates-tab"
import { PartnerBranchesTab } from "@/pages/tenant/directory/partner-branches-tab"
import { PartnerContactsTab } from "@/pages/tenant/directory/partner-contacts-tab"
import { PartnerFormSheet } from "@/pages/tenant/directory/partner-form"
import { PartnerRequirementsTab } from "@/pages/tenant/directory/partner-requirements-tab"
import { partners as partnersApi } from "@/lib/api"
import { useAuth } from "@/lib/auth"
import { partnerTypeLabel } from "@/lib/partner-options"
import type { PartnerInput } from "@/types"

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Mail
  label: string
  value: string
}) {
  return (
    <div className="flex items-start gap-3 py-2">
      <div className="text-muted-foreground mt-0.5 flex size-7 shrink-0 items-center justify-center">
        <Icon className="size-4" />
      </div>
      <div className="min-w-0">
        <div className="text-muted-foreground text-xs">{label}</div>
        <div className="text-sm font-medium">{value || "—"}</div>
      </div>
    </div>
  )
}

export function PartnerDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { hasPermission } = useAuth()
  const queryClient = useQueryClient()
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  const canWrite = hasPermission("partners:write")
  const canDelete = hasPermission("partners:delete")

  const partnerQuery = useQuery({
    queryKey: ["partners", id],
    queryFn: () => partnersApi.get(id!),
    enabled: !!id,
  })

  const branchesQuery = useQuery({
    queryKey: ["partners", id, "branches"],
    queryFn: () => partnersApi.branches.list(id!),
    enabled: !!id,
  })
  const contactsQuery = useQuery({
    queryKey: ["partners", id, "contacts"],
    queryFn: () => partnersApi.contacts.list(id!),
    enabled: !!id,
  })
  const requirementsQuery = useQuery({
    queryKey: ["partners", id, "requirements"],
    queryFn: () => partnersApi.requirements.list(id!),
    enabled: !!id,
  })

  const updateMutation = useMutation({
    mutationFn: (input: PartnerInput) => partnersApi.update(id!, input),
    onSuccess: () => {
      toast.success("Partner updated")
      queryClient.invalidateQueries({ queryKey: ["partners", id] })
      queryClient.invalidateQueries({ queryKey: ["partners"] })
      setEditOpen(false)
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const removeMutation = useMutation({
    mutationFn: () => partnersApi.remove(id!),
    onSuccess: () => {
      toast.success("Partner deleted")
      queryClient.invalidateQueries({ queryKey: ["partners"] })
      navigate("/partners")
    },
    onError: (err: Error) => toast.error(err.message),
  })

  if (partnerQuery.isLoading) {
    return <PageLoader label="Loading partner…" />
  }

  const partner = partnerQuery.data
  if (!partner) {
    return (
      <PlaceholderPage
        icon={Handshake}
        title="Partner not found"
        description="This partner may have been deleted."
      />
    )
  }

  const location = [partner.address, partner.town, partner.country].filter(Boolean).join(", ")
  const initials = partner.name.slice(0, 2).toUpperCase()
  const branchCount = branchesQuery.data?.length ?? 0
  const contactCount = contactsQuery.data?.length ?? 0
  const requirementCount = requirementsQuery.data?.length ?? 0

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[{ label: "Partners", to: "/partners" }, { label: partner.name }]}
        backTo="/partners"
        title=""
      />

      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div className="flex items-start gap-3">
          {partner.logo_url ? (
            <img
              src={partner.logo_url}
              alt=""
              className="size-12 shrink-0 rounded-xl border bg-white object-contain p-1"
            />
          ) : (
            <div className="bg-muted flex size-12 shrink-0 items-center justify-center rounded-xl">
              <span className="text-muted-foreground text-base font-bold">{initials}</span>
            </div>
          )}
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight">{partner.name}</h1>
              <Badge variant={partner.status === "active" ? "success" : "secondary"}>{partner.status}</Badge>
            </div>
            <p className="text-muted-foreground text-sm">
              {[partnerTypeLabel(partner.type), partner.industry, partner.partnership_model]
                .filter(Boolean)
                .join(" · ") || "Partner organisation"}
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

      <Tabs defaultValue="overview">
        <TabsList className="w-full max-w-full justify-start overflow-x-auto">
          <TabsTrigger value="overview" className="shrink-0">
            <FileText /> Overview
          </TabsTrigger>
          <TabsTrigger value="branches" className="shrink-0">
            <Building2 /> Branches
            {branchCount > 0 && (
              <span className="ml-1 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-bold tabular-nums">
                {branchCount}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="contacts" className="shrink-0">
            <User /> Contacts
            {contactCount > 0 && (
              <span className="ml-1 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-bold tabular-nums">
                {contactCount}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="requirements" className="shrink-0">
            <ClipboardList /> Requirements
            {requirementCount > 0 && (
              <span className="ml-1 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-bold tabular-nums">
                {requirementCount}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Profile</CardTitle>
            </CardHeader>
            <CardContent className="divide-border divide-y pt-0">
              <InfoRow icon={Handshake} label="Partnership model" value={partner.partnership_model} />
              <InfoRow icon={MapPin} label="Location" value={location} />
              <InfoRow icon={Globe} label="Country" value={partner.country} />
              <InfoRow icon={User} label="Contact person" value={partner.contact_name} />
              <InfoRow icon={Briefcase} label="Contact title" value={partner.contact_title} />
              <InfoRow icon={Mail} label="Work email" value={partner.work_email} />
              <InfoRow icon={Smartphone} label="Mobile" value={partner.phone_mobile} />
              <InfoRow icon={Phone} label="Office" value={partner.phone_office} />
              {partner.notes && <InfoRow icon={FileText} label="Notes" value={partner.notes} />}
              <div className="pt-3">
                <p className="text-muted-foreground text-xs">
                  Added {new Date(partner.created_at).toLocaleDateString()}
                  {partner.created_by_name ? ` by ${partner.created_by_name}` : ""}
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="branches">
          <PartnerBranchesTab partnerId={partner.id} />
        </TabsContent>

        <TabsContent value="contacts">
          <PartnerContactsTab partnerId={partner.id} />
        </TabsContent>

        <TabsContent value="requirements" className="space-y-6">
          <PartnerRequirementsTab partnerId={partner.id} />
          <PartnerAppendixTemplatesTab partnerId={partner.id} />
        </TabsContent>
      </Tabs>

      <PartnerFormSheet
        open={editOpen}
        onOpenChange={setEditOpen}
        partner={partner}
        onSubmit={(input) => updateMutation.mutate(input)}
        submitting={updateMutation.isPending}
      />

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="gap-0 overflow-hidden p-0">
          <ModalHeader
            icon={Trash2}
            title="Delete partner?"
            description={`"${partner.name}" will be permanently removed.`}
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
