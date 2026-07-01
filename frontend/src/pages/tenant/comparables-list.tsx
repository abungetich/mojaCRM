import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
  Camera,
  Coins,
  ImageOff,
  LandPlot,
  MapPin,
  MoreHorizontal,
  Plus,
  Trash2,
} from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { Column } from "@/components/data-table"
import { DataTable } from "@/components/data-table"
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
import { comparables as comparablesApi } from "@/lib/api"
import { useAuth } from "@/lib/auth"
import type { Comparable, ComparableInput } from "@/types"
import { ComparableFormSheet } from "@/pages/tenant/comparable-form"

function formatMoney(amount: number) {
  if (!amount) return ""
  return `Kshs. ${amount.toLocaleString()}`
}

export function ComparablesListPage() {
  const { hasPermission } = useAuth()
  const queryClient = useQueryClient()

  const [search, setSearch] = useState("")
  const debouncedSearch = useDebouncedValue(search, 300)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Comparable | undefined>()
  const [toDelete, setToDelete] = useState<Comparable | undefined>()
  const [photosFor, setPhotosFor] = useState<Comparable | undefined>()
  const [newPhotoUrl, setNewPhotoUrl] = useState("")
  const [newPhotoCaption, setNewPhotoCaption] = useState("")

  const canWrite = hasPermission("comparables:write")

  const query = useQuery({
    queryKey: ["comparables", { debouncedSearch, page, pageSize }],
    queryFn: () =>
      comparablesApi.list({ page, page_size: pageSize, q: debouncedSearch || undefined }),
  })

  const totalQuery = useQuery({
    queryKey: ["comparables", "count", "all"],
    queryFn: () => comparablesApi.list({ page: 1, page_size: 1 }),
  })

  const photoCountsQuery = useQuery({
    queryKey: ["comparables", "photo-counts"],
    queryFn: () => comparablesApi.photoCounts(),
  })

  const photosQuery = useQuery({
    queryKey: ["comparables", photosFor?.id, "photos"],
    queryFn: () => comparablesApi.photos.list(photosFor!.id),
    enabled: !!photosFor,
  })

  const createMutation = useMutation({
    mutationFn: comparablesApi.create,
    onSuccess: () => {
      toast.success("Comparable added")
      queryClient.invalidateQueries({ queryKey: ["comparables"] })
      setFormOpen(false)
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: ComparableInput }) =>
      comparablesApi.update(id, input),
    onSuccess: () => {
      toast.success("Comparable updated")
      queryClient.invalidateQueries({ queryKey: ["comparables"] })
      setFormOpen(false)
      setEditing(undefined)
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const removeMutation = useMutation({
    mutationFn: (id: string) => comparablesApi.remove(id),
    onSuccess: () => {
      toast.success("Comparable deleted")
      queryClient.invalidateQueries({ queryKey: ["comparables"] })
      setToDelete(undefined)
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const addPhotoMutation = useMutation({
    mutationFn: () => comparablesApi.photos.add(photosFor!.id, { photo_url: newPhotoUrl, caption: newPhotoCaption }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["comparables", photosFor?.id, "photos"] })
      queryClient.invalidateQueries({ queryKey: ["comparables", "photo-counts"] })
      setNewPhotoUrl("")
      setNewPhotoCaption("")
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const removePhotoMutation = useMutation({
    mutationFn: (photoId: string) => comparablesApi.photos.remove(photosFor!.id, photoId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["comparables", photosFor?.id, "photos"] })
      queryClient.invalidateQueries({ queryKey: ["comparables", "photo-counts"] })
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const openCreate = () => {
    setEditing(undefined)
    setFormOpen(true)
  }
  const openEdit = (c: Comparable) => {
    setEditing(c)
    setFormOpen(true)
  }

  const rows = query.data?.data ?? []
  const photoCount = (id: string) => photoCountsQuery.data?.[id] ?? 0
  const withPhotos = rows.filter((c) => photoCount(c.id) > 0).length
  const withCoords = rows.filter((c) => c.lat !== 0 || c.lng !== 0).length
  const counties = new Set(rows.map((c) => c.county).filter(Boolean)).size

  const columns: Column<Comparable>[] = [
    {
      key: "parcel",
      header: "Parcel / location",
      render: (c) => (
        <div className="min-w-0">
          <div className="truncate font-medium">{c.parcel_ref || c.location || "—"}</div>
          <div className="text-muted-foreground truncate text-xs">{c.location}</div>
        </div>
      ),
    },
    {
      key: "county",
      header: "County",
      render: (c) => <span className="text-muted-foreground">{c.county || "—"}</span>,
    },
    {
      key: "value",
      header: "Value",
      render: (c) => <span>{c.value || formatMoney(c.value_amount) || "—"}</span>,
    },
    {
      key: "date",
      header: "Sale date",
      render: (c) => <span className="text-muted-foreground">{c.comp_date || c.value_date || "—"}</span>,
    },
    {
      key: "photos",
      header: "Photos",
      render: (c) =>
        photoCount(c.id) > 0 ? (
          <Badge variant="outline" className="gap-1">
            <Camera className="size-3" /> {photoCount(c.id)}
          </Badge>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
  ]

  columns.push({
    key: "actions",
    header: "",
    className: "text-right",
    render: (c) => (
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button variant="ghost" size="icon" onClick={(e) => e.stopPropagation()}>
              <MoreHorizontal />
            </Button>
          }
        />
        <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
          <DropdownMenuItem onClick={() => setPhotosFor(c)}>Manage photos</DropdownMenuItem>
          {canWrite && <DropdownMenuItem onClick={() => openEdit(c)}>Edit</DropdownMenuItem>}
          {canWrite && (
            <DropdownMenuItem variant="destructive" onClick={() => setToDelete(c)}>
              Delete
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    ),
  })

  const renderCard = (c: Comparable) => (
    <div className="space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate font-medium">{c.parcel_ref || c.location || "Comparable"}</div>
          <div className="text-muted-foreground truncate text-xs">{c.location}</div>
        </div>
        {photoCount(c.id) > 0 && (
          <Badge variant="outline" className="shrink-0 gap-1">
            <Camera className="size-3" /> {photoCount(c.id)}
          </Badge>
        )}
      </div>
      <div className="text-muted-foreground flex items-center justify-between text-sm">
        <span>{c.value || formatMoney(c.value_amount) || "No value recorded"}</span>
        <span className="text-xs">{c.county || "No county"}</span>
      </div>
    </div>
  )

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[{ label: "Dashboard", to: "/" }, { label: "Comparables" }]}
        backTo="/"
        title="Comparables"
        description="Shared library of market evidence (property sale records)"
        actions={
          canWrite && (
            <Button onClick={openCreate}>
              <Plus /> New comparable
            </Button>
          )
        }
      />

      <StatsGrid>
        <StatCard
          label="Total comparables"
          value={totalQuery.data?.total ?? 0}
          icon={LandPlot}
          tone="primary"
          loading={totalQuery.isLoading}
        />
        <StatCard label="With photos" value={withPhotos} icon={Camera} tone="teal" />
        <StatCard label="With map position" value={withCoords} icon={MapPin} tone="info" />
        <StatCard label="Counties (this page)" value={counties} icon={Coins} tone="green" />
      </StatsGrid>

      <FilterBar
        search={search}
        onSearchChange={(v) => {
          setSearch(v)
          setPage(1)
        }}
        searchPlaceholder="Search parcel, location, county, source, notes…"
        activeCount={search ? 1 : 0}
        onClear={() => {
          setSearch("")
          setPage(1)
        }}
      />

      <DataTable
        columns={columns}
        data={rows}
        rowKey={(c) => c.id}
        onRowClick={canWrite ? (c) => openEdit(c) : undefined}
        loading={query.isLoading}
        renderCard={renderCard}
        emptyIcon={LandPlot}
        emptyTitle="No comparables yet"
        emptyDescription="Add your first market evidence record to start building the library."
        page={page}
        pageSize={pageSize}
        total={query.data?.total ?? 0}
        onPageChange={setPage}
        onPageSizeChange={(size) => {
          setPageSize(size)
          setPage(1)
        }}
      />

      <ComparableFormSheet
        open={formOpen}
        onOpenChange={setFormOpen}
        comparable={editing}
        onSubmit={(input) => {
          if (editing) {
            updateMutation.mutate({ id: editing.id, input })
          } else {
            createMutation.mutate(input)
          }
        }}
        submitting={createMutation.isPending || updateMutation.isPending}
      />

      {/* Manage photos */}
      <Dialog
        open={!!photosFor}
        onOpenChange={(o) => {
          if (!o) {
            setPhotosFor(undefined)
            setNewPhotoUrl("")
            setNewPhotoCaption("")
          }
        }}
      >
        <DialogContent className="gap-0 overflow-hidden p-0">
          <ModalHeader
            icon={Camera}
            title="Comparable photos"
            description={photosFor ? photosFor.parcel_ref || photosFor.location : ""}
          />
          <div className="max-h-[50vh] space-y-2 overflow-y-auto p-4">
            {photosQuery.isLoading ? (
              <p className="text-muted-foreground text-sm">Loading…</p>
            ) : (photosQuery.data ?? []).length === 0 ? (
              <div className="text-muted-foreground flex flex-col items-center gap-2 py-6 text-center text-sm">
                <ImageOff className="size-6" />
                No photos yet.
              </div>
            ) : (
              (photosQuery.data ?? []).map((p) => (
                <div key={p.id} className="flex items-center gap-3 rounded-md border p-2">
                  <img
                    src={p.photo_url}
                    alt={p.caption || "Comparable photo"}
                    className="bg-muted size-12 shrink-0 rounded object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm">{p.caption || "Untitled photo"}</p>
                    <a
                      href={p.photo_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-muted-foreground block truncate text-xs hover:underline"
                    >
                      {p.photo_url}
                    </a>
                  </div>
                  {canWrite && (
                    <Button
                      variant="ghost"
                      size="icon"
                      disabled={removePhotoMutation.isPending}
                      onClick={() => removePhotoMutation.mutate(p.id)}
                    >
                      <Trash2 className="text-destructive size-4" />
                    </Button>
                  )}
                </div>
              ))
            )}
          </div>
          {canWrite && (
            <div className="space-y-2 border-t p-4">
              <Label className="text-xs">Photo URL</Label>
              <Input
                value={newPhotoUrl}
                onChange={(e) => setNewPhotoUrl(e.target.value)}
                placeholder="https://…"
              />
              <Label className="text-xs">Caption (optional)</Label>
              <Input
                value={newPhotoCaption}
                onChange={(e) => setNewPhotoCaption(e.target.value)}
                placeholder="e.g. Street view"
              />
            </div>
          )}
          <DialogFooter className="p-4 pt-0">
            <Button variant="outline" onClick={() => setPhotosFor(undefined)}>
              Close
            </Button>
            {canWrite && (
              <Button
                disabled={!newPhotoUrl.trim() || addPhotoMutation.isPending}
                onClick={() => addPhotoMutation.mutate()}
              >
                <Plus /> Add photo
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(undefined)}>
        <DialogContent className="gap-0 overflow-hidden p-0">
          <ModalHeader
            icon={Trash2}
            title="Delete comparable?"
            description={`"${toDelete?.parcel_ref || toDelete?.location}" will be permanently removed.`}
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
