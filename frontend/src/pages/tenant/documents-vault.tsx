import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  AlertTriangle,
  CalendarClock,
  ExternalLink,
  FileText,
  FolderOpen,
  History,
  MoreHorizontal,
  Plus,
  ShieldCheck,
  Trash2,
  UploadCloud,
} from "lucide-react"
import { useMemo, useState } from "react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { Column } from "@/components/data-table"
import { DataTable } from "@/components/data-table"
import { DatePicker } from "@/components/date-picker"
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ModalHeader } from "@/components/modal-header"
import { FilterBar } from "@/components/filter-bar"
import { PageHeader } from "@/components/page-header"
import { StatCard, StatsGrid } from "@/components/stat-card"
import { useDebouncedValue } from "@/hooks/use-debounced-value"
import { documents as documentsApi, users as usersApi } from "@/lib/api"
import { useAuth } from "@/lib/auth"
import { cn } from "@/lib/utils"
import type { CompanyDocument, DocumentInput, DocumentVersion } from "@/types"
import { DocumentFormSheet } from "@/pages/tenant/document-form"

type DocStatus = "valid" | "expiring" | "expired" | "none"

function docStatus(d: CompanyDocument): DocStatus {
  if (!d.expiry_date) return "none"
  const exp = new Date(d.expiry_date).getTime()
  const now = Date.now()
  if (exp < now) return "expired"
  if (exp - now < (d.renewal_lead_days || 30) * 86400000) return "expiring"
  return "valid"
}

const STATUS_META: Record<DocStatus, { label: string; cls: string }> = {
  valid: { label: "Valid", cls: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" },
  expiring: { label: "Renew soon", cls: "bg-amber-500/15 text-amber-700 dark:text-amber-300" },
  expired: { label: "Expired", cls: "bg-red-500/15 text-red-700 dark:text-red-300" },
  none: { label: "No expiry", cls: "bg-slate-500/15 text-slate-600 dark:text-slate-300" },
}

function formatDate(value?: string) {
  if (!value) return ""
  return new Date(value).toLocaleDateString()
}

export function DocumentsVaultPage() {
  const { hasPermission } = useAuth()
  const queryClient = useQueryClient()

  const [search, setSearch] = useState("")
  const debouncedSearch = useDebouncedValue(search, 300)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<CompanyDocument | undefined>()
  const [toDelete, setToDelete] = useState<CompanyDocument | undefined>()

  // Versioning
  const [verFor, setVerFor] = useState<CompanyDocument | undefined>()
  const [verForm, setVerForm] = useState({ file_name: "", file_url: "", issue_date: "", expiry_date: "" })
  const [histFor, setHistFor] = useState<CompanyDocument | undefined>()

  const canWrite = hasPermission("documents:write")
  const canDelete = hasPermission("documents:delete")

  const query = useQuery({
    queryKey: ["documents", { debouncedSearch, page, pageSize }],
    queryFn: () => documentsApi.list({ page, page_size: pageSize, q: debouncedSearch || undefined }),
  })

  // A larger, unpaginated snapshot to compute vault-wide stats (expiring/expired
  // counts) — the same client-side aggregation propsense's page did, since
  // there's no server-side expiry-status filter.
  const statsQuery = useQuery({
    queryKey: ["documents", "stats"],
    queryFn: () => documentsApi.list({ page: 1, page_size: 200 }),
  })

  const usersQuery = useQuery({
    queryKey: ["users"],
    queryFn: () => usersApi.list().catch(() => []),
  })

  const historyQuery = useQuery({
    queryKey: ["documents", histFor?.id, "versions"],
    queryFn: () => documentsApi.versions.list(histFor!.id),
    enabled: !!histFor,
  })

  const createMutation = useMutation({
    mutationFn: documentsApi.create,
    onSuccess: () => {
      toast.success("Document added")
      queryClient.invalidateQueries({ queryKey: ["documents"] })
      setFormOpen(false)
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: DocumentInput }) => documentsApi.update(id, input),
    onSuccess: () => {
      toast.success("Document updated")
      queryClient.invalidateQueries({ queryKey: ["documents"] })
      setFormOpen(false)
      setEditing(undefined)
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const removeMutation = useMutation({
    mutationFn: (id: string) => documentsApi.remove(id),
    onSuccess: () => {
      toast.success("Document deleted")
      queryClient.invalidateQueries({ queryKey: ["documents"] })
      setToDelete(undefined)
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const addVersionMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: typeof verForm }) => documentsApi.versions.add(id, input),
    onSuccess: () => {
      toast.success("New version saved — previous version archived")
      queryClient.invalidateQueries({ queryKey: ["documents"] })
      setVerFor(undefined)
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const openCreate = () => {
    setEditing(undefined)
    setFormOpen(true)
  }
  const openEdit = (d: CompanyDocument) => {
    setEditing(d)
    setFormOpen(true)
  }
  const openVersion = (d: CompanyDocument) => {
    setVerFor(d)
    setVerForm({ file_name: "", file_url: "", issue_date: "", expiry_date: "" })
  }

  const rows = query.data?.data ?? []
  const statsRows = statsQuery.data?.data ?? []
  const stats = useMemo(
    () => ({
      active: statsRows.filter((d) => d.active).length,
      expiring: statsRows.filter((d) => docStatus(d) === "expiring").length,
      expired: statsRows.filter((d) => docStatus(d) === "expired").length,
      onReport: statsRows.filter((d) => d.on_report && d.active).length,
    }),
    [statsRows]
  )

  const ownerOptions = (usersQuery.data ?? []).map((u) => ({ value: u.id, label: u.name }))

  const columns: Column<CompanyDocument>[] = [
    {
      key: "name",
      header: "Document",
      render: (d) => (
        <div>
          <div className="flex items-center gap-2 font-medium">
            {d.name}
            {d.version_no > 1 && <Badge variant="secondary">v{d.version_no}</Badge>}
            {d.category && <span className="text-muted-foreground text-xs font-normal">{d.category}</span>}
            {!d.active && <Badge variant="outline">inactive</Badge>}
          </div>
          {(d.doc_number || d.issuer) && (
            <div className="text-muted-foreground text-xs">
              {[d.doc_number, d.issuer].filter(Boolean).join(" · ")}
            </div>
          )}
        </div>
      ),
    },
    {
      key: "owner",
      header: "Applies to",
      render: (d) => <span className="text-muted-foreground">{d.owner_name || "Company-wide"}</span>,
    },
    {
      key: "expiry",
      header: "Expiry",
      render: (d) => {
        const status = docStatus(d)
        return (
          <span className="inline-flex items-center gap-2">
            <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-medium", STATUS_META[status].cls)}>
              {STATUS_META[status].label}
            </span>
            {d.expiry_date && <span className="text-muted-foreground text-xs">{formatDate(d.expiry_date)}</span>}
          </span>
        )
      },
    },
    {
      key: "on_report",
      header: "On reports",
      render: (d) =>
        d.on_report ? (
          <Badge variant="secondary">{d.report_mode === "author" ? "Author only" : "Always"}</Badge>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
  ]

  if (canWrite || canDelete) {
    columns.push({
      key: "actions",
      header: "",
      className: "text-right",
      render: (d) => (
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button variant="ghost" size="icon" onClick={(e) => e.stopPropagation()}>
                <MoreHorizontal />
              </Button>
            }
          />
          <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
            {d.file_url && (
              <DropdownMenuItem onClick={() => window.open(d.file_url, "_blank", "noopener,noreferrer")}>
                <ExternalLink /> Open file
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={() => setHistFor(d)}>
              <History /> Version history
            </DropdownMenuItem>
            {canWrite && (
              <DropdownMenuItem onClick={() => openVersion(d)}>
                <UploadCloud /> Upload new version
              </DropdownMenuItem>
            )}
            {canWrite && <DropdownMenuItem onClick={() => openEdit(d)}>Edit</DropdownMenuItem>}
            {canDelete && (
              <DropdownMenuItem variant="destructive" onClick={() => setToDelete(d)}>
                <Trash2 /> Delete
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    })
  }

  const renderCard = (d: CompanyDocument) => {
    const status = docStatus(d)
    return (
      <div className="space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 font-medium">
            {d.name}
            {d.version_no > 1 && <Badge variant="secondary">v{d.version_no}</Badge>}
          </div>
          <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-medium", STATUS_META[status].cls)}>
            {STATUS_META[status].label}
          </span>
        </div>
        <div className="text-muted-foreground text-sm">{d.owner_name || "Company-wide"}</div>
        <div className="text-muted-foreground flex items-center justify-between text-xs">
          <span>{d.category || "Uncategorised"}</span>
          {d.expiry_date && <span>Expires {formatDate(d.expiry_date)}</span>}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[{ label: "Dashboard", to: "/" }, { label: "Document Vault" }]}
        backTo="/"
        title="Document Vault"
        description="Company and staff documents — certificates, registrations, policies. Track expiries and choose which attach to valuation reports."
        actions={
          canWrite && (
            <Button onClick={openCreate}>
              <Plus /> Add document
            </Button>
          )
        }
      />

      <StatsGrid>
        <StatCard
          label="Active documents"
          value={stats.active}
          icon={FolderOpen}
          tone="primary"
          subtitle={`${statsRows.length} total`}
          loading={statsQuery.isLoading}
        />
        <StatCard
          label="Renew soon"
          value={stats.expiring}
          icon={CalendarClock}
          tone="slate"
          subtitle="Within lead time"
          loading={statsQuery.isLoading}
        />
        <StatCard
          label="Expired"
          value={stats.expired}
          icon={AlertTriangle}
          tone="coral"
          subtitle="Action needed"
          loading={statsQuery.isLoading}
        />
        <StatCard
          label="On reports"
          value={stats.onReport}
          icon={ShieldCheck}
          tone="green"
          subtitle="Attached to reports"
          loading={statsQuery.isLoading}
        />
      </StatsGrid>

      <FilterBar
        search={search}
        onSearchChange={(v) => {
          setSearch(v)
          setPage(1)
        }}
        searchPlaceholder="Search name, doc number, issuer, owner…"
      />

      <DataTable
        columns={columns}
        data={rows}
        rowKey={(d) => d.id}
        loading={query.isLoading}
        renderCard={renderCard}
        emptyIcon={FileText}
        emptyTitle="No documents yet"
        emptyDescription="Add your first company or staff document to start tracking expiries."
        page={page}
        pageSize={pageSize}
        total={query.data?.total ?? 0}
        onPageChange={setPage}
        onPageSizeChange={(size) => {
          setPageSize(size)
          setPage(1)
        }}
      />

      <DocumentFormSheet
        open={formOpen}
        onOpenChange={setFormOpen}
        document={editing}
        ownerOptions={ownerOptions}
        onSubmit={(input) => {
          if (editing) {
            updateMutation.mutate({ id: editing.id, input })
          } else {
            createMutation.mutate(input)
          }
        }}
        submitting={createMutation.isPending || updateMutation.isPending}
      />

      {/* Upload new version */}
      <Dialog open={!!verFor} onOpenChange={(o) => !o && setVerFor(undefined)}>
        <DialogContent className="gap-0 overflow-hidden p-0">
          <ModalHeader
            icon={UploadCloud}
            title="Upload new version"
            description={
              verFor
                ? `Replaces the current file for "${verFor.name}" (now v${verFor.version_no}). The current version is archived to history.`
                : ""
            }
          />
          <div className="space-y-4 p-4">
            <div className="space-y-1">
              <Label className="text-xs">File label</Label>
              <Input
                value={verForm.file_name}
                onChange={(e) => setVerForm((f) => ({ ...f, file_name: e.target.value }))}
                placeholder="e.g. certificate-2026.pdf"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">File URL</Label>
              <Input
                value={verForm.file_url}
                onChange={(e) => setVerForm((f) => ({ ...f, file_url: e.target.value }))}
                placeholder="https://…"
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label className="text-xs">New issue date</Label>
                <DatePicker value={verForm.issue_date} onChange={(v) => setVerForm((f) => ({ ...f, issue_date: v }))} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">New expiry date</Label>
                <DatePicker value={verForm.expiry_date} onChange={(v) => setVerForm((f) => ({ ...f, expiry_date: v }))} />
              </div>
            </div>
          </div>
          <DialogFooter className="p-4">
            <Button variant="outline" onClick={() => setVerFor(undefined)}>
              Cancel
            </Button>
            <Button
              disabled={addVersionMutation.isPending}
              onClick={() => {
                if (!verFor) return
                if (!verForm.file_url.trim()) {
                  toast.error("A file URL is required for the new version")
                  return
                }
                addVersionMutation.mutate({ id: verFor.id, input: verForm })
              }}
            >
              <UploadCloud /> Save version
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Version history */}
      <Dialog open={!!histFor} onOpenChange={(o) => !o && setHistFor(undefined)}>
        <DialogContent className="gap-0 overflow-hidden p-0">
          <ModalHeader
            icon={History}
            title="Version history"
            description={histFor ? `${histFor.name} — current is v${histFor.version_no}` : ""}
          />
          <div className="max-h-[60vh] space-y-1 overflow-y-auto p-4">
            {historyQuery.isLoading ? (
              <p className="text-muted-foreground text-sm">Loading…</p>
            ) : (historyQuery.data ?? []).length === 0 ? (
              <p className="text-muted-foreground text-sm">
                No earlier versions yet. When you upload a new version, the one it replaces appears here.
              </p>
            ) : (
              (historyQuery.data as DocumentVersion[]).map((v) => (
                <a
                  key={v.id}
                  href={v.file_url || undefined}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-muted/40 hover:bg-muted flex items-center gap-2 rounded-md border px-2.5 py-2 text-left text-sm"
                >
                  <Badge variant="outline" className="shrink-0">
                    v{v.version_no}
                  </Badge>
                  <span className="flex-1 truncate">
                    {v.file_name || "file"}
                    {v.expiry_date && <span className="text-muted-foreground"> · expired {formatDate(v.expiry_date)}</span>}
                  </span>
                  <span className="text-muted-foreground text-xs">archived {formatDate(v.archived_at)}</span>
                  <ExternalLink className="text-muted-foreground size-3.5 shrink-0" />
                </a>
              ))
            )}
          </div>
          <DialogFooter className="p-4">
            <Button variant="outline" onClick={() => setHistFor(undefined)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(undefined)}>
        <DialogContent className="gap-0 overflow-hidden p-0">
          <ModalHeader
            icon={Trash2}
            title="Delete document?"
            description={toDelete ? `"${toDelete.name}" will be permanently removed.` : ""}
          />
          <DialogFooter className="p-4">
            <Button variant="outline" onClick={() => setToDelete(undefined)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={removeMutation.isPending}
              onClick={() => toDelete && removeMutation.mutate(toDelete.id)}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
