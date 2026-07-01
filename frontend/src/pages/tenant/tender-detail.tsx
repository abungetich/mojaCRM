import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  Banknote,
  Calendar,
  ClipboardList,
  FileSignature,
  FileText,
  Gavel,
  Mail,
  Send,
  Trash2,
  User as UserIcon,
} from "lucide-react"
import { useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Combobox } from "@/components/combobox"
import { DatePicker } from "@/components/date-picker"
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { PageLoader } from "@/components/ui/spinner"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { ModalHeader } from "@/components/modal-header"
import { PageHeader } from "@/components/page-header"
import { PlaceholderPage } from "@/components/placeholder-page"
import { TenderFormSheet } from "@/pages/tenant/tender-form"
import { tenders as tendersApi, users as usersApi } from "@/lib/api"
import { useAuth } from "@/lib/auth"
import { cn } from "@/lib/utils"
import type { TenderInput } from "@/types"
import {
  STAGE_LABEL,
  STAGE_TONE,
  TENDER_DOC_KINDS,
  TENDER_STAGE_OPTIONS,
  dueTone,
  fillLetterTemplate,
  money,
} from "@/pages/tenant/tender-shared"

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

function InfoRow({ icon: Icon, label, value }: { icon: typeof Mail; label: string; value?: string }) {
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

export function TenderDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { hasPermission } = useAuth()
  const queryClient = useQueryClient()
  const canWrite = hasPermission("tenders:write")

  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [stageSel, setStageSel] = useState("")
  const [stageNote, setStageNote] = useState("")
  const [submitOpen, setSubmitOpen] = useState(false)
  const [submitForm, setSubmitForm] = useState({
    submitted_on: new Date().toISOString().slice(0, 10),
    method: "",
    reference: "",
    note: "",
  })
  const [newDoc, setNewDoc] = useState({ name: "", label: "", kind: "tender", data_url: "" })
  const [letterId, setLetterId] = useState("")
  const [letterPreview, setLetterPreview] = useState<{ name: string; text: string } | null>(null)

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["tenders", id] })
    queryClient.invalidateQueries({ queryKey: ["tenders"] })
  }

  const tenderQuery = useQuery({
    queryKey: ["tenders", id],
    queryFn: () => tendersApi.get(id!),
    enabled: !!id,
  })
  const docsQuery = useQuery({
    queryKey: ["tenders", id, "documents"],
    queryFn: () => tendersApi.documents.list(id!),
    enabled: !!id,
  })
  const lettersQuery = useQuery({ queryKey: ["tenders", "letters"], queryFn: () => tendersApi.letters.list() })
  const usersQuery = useQuery({ queryKey: ["users"], queryFn: () => usersApi.list() })

  const updateMutation = useMutation({
    mutationFn: (input: TenderInput) => tendersApi.update(id!, input),
    onSuccess: () => {
      toast.success("Tender updated")
      invalidate()
      setEditOpen(false)
    },
    onError: (err: Error) => toast.error(err.message),
  })
  const removeMutation = useMutation({
    mutationFn: () => tendersApi.remove(id!),
    onSuccess: () => {
      toast.success("Tender deleted")
      queryClient.invalidateQueries({ queryKey: ["tenders"] })
      navigate("/tenders")
    },
    onError: (err: Error) => toast.error(err.message),
  })
  const stageMutation = useMutation({
    mutationFn: () => tendersApi.setStage(id!, stageSel, stageNote, stageNote),
    onSuccess: () => {
      toast.success("Stage updated")
      setStageNote("")
      invalidate()
    },
    onError: (err: Error) => toast.error(err.message),
  })
  const assignMutation = useMutation({
    mutationFn: (ownerUserId: string) => tendersApi.assign(id!, ownerUserId),
    onSuccess: () => {
      toast.success("Lead updated")
      invalidate()
    },
    onError: () => toast.error("Could not assign"),
  })
  const submitMutation = useMutation({
    mutationFn: () => tendersApi.submit(id!, submitForm),
    onSuccess: () => {
      toast.success("Submission recorded")
      setSubmitOpen(false)
      invalidate()
    },
    onError: (err: Error) => toast.error(err.message),
  })
  const addDocMutation = useMutation({
    mutationFn: () => tendersApi.documents.add(id!, newDoc),
    onSuccess: () => {
      toast.success("Document added")
      setNewDoc({ name: "", label: "", kind: "tender", data_url: "" })
      queryClient.invalidateQueries({ queryKey: ["tenders", id, "documents"] })
      invalidate()
    },
    onError: () => toast.error("Could not add document"),
  })
  const removeDocMutation = useMutation({
    mutationFn: (docId: string) => tendersApi.documents.remove(id!, docId),
    onSuccess: () => {
      toast.success("Document removed")
      queryClient.invalidateQueries({ queryKey: ["tenders", id, "documents"] })
      invalidate()
    },
    onError: () => toast.error("Could not remove document"),
  })

  if (tenderQuery.isLoading) {
    return <PageLoader label="Loading tender…" />
  }

  const tender = tenderQuery.data
  if (!tender) {
    return <PlaceholderPage icon={Gavel} title="Tender not found" description="This tender may have been deleted." />
  }

  const openDoc = async (docId: string) => {
    try {
      const d = await tendersApi.documents.get(tender.id, docId)
      if (d.data_url) window.open(d.data_url, "_blank")
      else toast.error("No file")
    } catch {
      toast.error("Could not open document")
    }
  }

  const previewLetter = () => {
    const letter = (lettersQuery.data ?? []).find((l) => l.id === letterId)
    if (!letter) {
      toast.error("Pick a letter template")
      return
    }
    const text = fillLetterTemplate(letter.template_content, {
      title: tender.title,
      reference: tender.reference,
      issuer: tender.issuer,
      category: tender.category,
      estimated_value: money(tender.estimated_value, tender.currency),
      owner_name: tender.owner_name,
      submission_deadline: tender.submission_deadline,
      today: new Date().toISOString().slice(0, 10),
    })
    setLetterPreview({ name: letter.name, text })
  }

  const emailStub = async () => {
    try {
      await tendersApi.email(tender.id, {
        to: tender.contact_email,
        subject: `Tender — ${tender.title}`,
        file_name: "tender.pdf",
        data_url: "data:application/pdf;base64,",
      })
    } catch {
      toast.error("Email sending isn't available yet — no mailer is configured for this workspace.")
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader breadcrumbs={[{ label: "Tenders", to: "/tenders" }, { label: tender.title }]} backTo="/tenders" title="" />

      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div className="flex items-start gap-3">
          <div className="bg-muted flex size-12 shrink-0 items-center justify-center rounded-xl">
            <Gavel className="text-muted-foreground size-6" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight">{tender.title}</h1>
              <Badge className={cn("border-transparent", STAGE_TONE[tender.stage])}>{STAGE_LABEL[tender.stage]}</Badge>
              {tender.signed && (
                <Badge variant="outline" className="text-emerald-600">
                  Signed
                </Badge>
              )}
            </div>
            <p className="text-muted-foreground text-sm">
              {[tender.issuer, tender.reference].filter(Boolean).join(" · ") || "Tender opportunity"}
            </p>
            {tender.submission_deadline && (
              <p className={cn("text-sm", dueTone(tender.submission_deadline, tender.stage))}>
                Due {tender.submission_deadline}
              </p>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          {canWrite && (
            <Button variant="outline" onClick={() => setEditOpen(true)}>
              Edit
            </Button>
          )}
          {canWrite && (
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
          <TabsTrigger value="requirements" className="shrink-0">
            <ClipboardList /> Requirements
            {tender.requirements.length > 0 && (
              <span className="bg-muted ml-1 rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums">
                {tender.requirements.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="documents" className="shrink-0">
            <FileSignature /> Documents
            {(docsQuery.data?.length ?? 0) > 0 && (
              <span className="bg-muted ml-1 rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums">
                {docsQuery.data?.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="stage" className="shrink-0">
            <Send /> Stage &amp; submission
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Profile</CardTitle>
            </CardHeader>
            <CardContent className="divide-border divide-y pt-0">
              <InfoRow icon={Gavel} label="Type" value={tender.type} />
              <InfoRow icon={ClipboardList} label="Category" value={tender.category} />
              <InfoRow icon={Calendar} label="Tender opening" value={tender.opening_datetime} />
              <InfoRow icon={Banknote} label="Estimated value" value={money(tender.estimated_value, tender.currency)} />
              <InfoRow icon={Banknote} label="Tender doc fee" value={money(tender.doc_fee, tender.currency)} />
              <InfoRow
                icon={Banknote}
                label="Security"
                value={
                  tender.security_type
                    ? `${tender.security_type.replace("_", " ")} — ${money(tender.security_amount, tender.currency)}${tender.security_validity ? ` (${tender.security_validity})` : ""}`
                    : "None"
                }
              />
              <InfoRow icon={UserIcon} label="Lead" value={tender.owner_name} />
              <InfoRow icon={Mail} label="Contact" value={[tender.contact_name, tender.contact_email].filter(Boolean).join(" · ")} />
              {tender.description && <InfoRow icon={FileText} label="Description" value={tender.description} />}
              {tender.notes && <InfoRow icon={FileText} label="Notes" value={tender.notes} />}
              <div className="pt-3">
                <p className="text-muted-foreground text-xs">
                  Added {new Date(tender.created_at).toLocaleDateString()}
                  {tender.created_by_name ? ` by ${tender.created_by_name}` : ""}
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="requirements">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Requirements checklist</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 pt-0">
              {tender.requirements.length === 0 && (
                <p className="text-muted-foreground text-sm">No requirements listed. Add some from Edit.</p>
              )}
              {tender.requirements.map((r, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <span className={cn("inline-block size-2 rounded-full", r.met ? "bg-emerald-500" : "bg-slate-300")} />
                  {r.item}
                  {r.section && <span className="text-muted-foreground text-xs">· {r.section}</span>}
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Documents</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 pt-0">
              {(docsQuery.data ?? []).map((d) => (
                <div key={d.id} className="flex items-center justify-between rounded-md border px-3 py-1.5 text-sm">
                  <button type="button" className="flex items-center gap-2 hover:underline" onClick={() => openDoc(d.id)}>
                    <FileText className="size-3.5" /> {d.name || "Document"}
                    {d.label && <span className="text-muted-foreground text-xs">· {d.label}</span>}
                    <Badge className="border-transparent bg-slate-500/10 text-slate-600">
                      {TENDER_DOC_KINDS.find((k) => k.value === d.kind)?.label || d.kind}
                    </Badge>
                  </button>
                  {canWrite && (
                    <Button variant="ghost" size="icon" onClick={() => removeDocMutation.mutate(d.id)}>
                      <Trash2 className="text-destructive size-4" />
                    </Button>
                  )}
                </div>
              ))}
              {(docsQuery.data ?? []).length === 0 && <p className="text-muted-foreground text-xs">No documents yet.</p>}

              {canWrite && (
                <div className="mt-2 grid gap-2 rounded-lg border p-3 sm:grid-cols-[1fr_140px_auto]">
                  <div className="space-y-1.5">
                    <Input
                      type="file"
                      onChange={async (e) => {
                        const file = e.target.files?.[0]
                        if (!file) return
                        const data_url = await readFileAsDataUrl(file)
                        setNewDoc((d) => ({ ...d, data_url, name: file.name }))
                      }}
                    />
                    {newDoc.data_url && <p className="text-muted-foreground truncate text-xs">{newDoc.name}</p>}
                  </div>
                  <Select value={newDoc.kind} onValueChange={(v) => setNewDoc((d) => ({ ...d, kind: v }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TENDER_DOC_KINDS.map((k) => (
                        <SelectItem key={k.value} value={k.value}>
                          {k.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="flex gap-2">
                    <Input
                      value={newDoc.label}
                      onChange={(e) => setNewDoc((d) => ({ ...d, label: e.target.value }))}
                      placeholder="Label"
                      className="w-28"
                    />
                    <Button
                      variant="outline"
                      onClick={() => addDocMutation.mutate()}
                      disabled={!newDoc.data_url || addDocMutation.isPending}
                    >
                      Add
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Letters</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pt-0">
              <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto]">
                <Select value={letterId} onValueChange={setLetterId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pick a letter template" />
                  </SelectTrigger>
                  <SelectContent>
                    {(lettersQuery.data ?? []).map((l) => (
                      <SelectItem key={l.id} value={l.id}>
                        {l.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button variant="outline" onClick={previewLetter}>
                  <FileSignature className="size-4" /> Preview
                </Button>
                {canWrite && (
                  <Button variant="outline" onClick={emailStub}>
                    <Mail className="size-4" /> Email
                  </Button>
                )}
              </div>
              <p className="text-muted-foreground text-xs">
                Manage templates from the "Letter templates" button on the Tenders list. PDF export and email
                attachment aren't available yet (no PDF/mailer infrastructure in this build) — preview fills in
                the plain-text template so it can be copied.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="stage" className="space-y-4">
          {canWrite && (
            <Card>
              <CardContent className="grid gap-4 pt-6 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-xs">Change stage</Label>
                  <div className="flex gap-2">
                    <Select value={stageSel || tender.stage} onValueChange={setStageSel}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TENDER_STAGE_OPTIONS.map((s) => (
                          <SelectItem key={s.value} value={s.value}>
                            {s.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button variant="outline" disabled={stageMutation.isPending} onClick={() => stageMutation.mutate()}>
                      Apply
                    </Button>
                  </div>
                  <Input value={stageNote} onChange={(e) => setStageNote(e.target.value)} placeholder="Note (optional)" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Lead</Label>
                  <Combobox
                    options={[
                      { value: "", label: "Unassigned" },
                      ...(usersQuery.data ?? []).map((u) => ({ value: u.id, label: u.name })),
                    ]}
                    value={tender.owner_user_id ?? ""}
                    onChange={(v) => assignMutation.mutate(v)}
                    placeholder="Unassigned"
                    allowCustom={false}
                  />
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                      setSubmitForm({
                        submitted_on: new Date().toISOString().slice(0, 10),
                        method: tender.submission_method || "",
                        reference: "",
                        note: "",
                      })
                      setSubmitOpen(true)
                    }}
                  >
                    <Send className="size-4" /> Record submission
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {tender.stage_log.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Stage history</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 pt-0">
                {tender.stage_log
                  .slice()
                  .reverse()
                  .map((s, i) => (
                    <div key={i} className="text-muted-foreground text-xs">
                      {(s.at || "").slice(0, 10)} — {STAGE_LABEL[s.from] || s.from} →{" "}
                      <span className="text-foreground font-medium">{STAGE_LABEL[s.to] || s.to}</span> · {s.by}
                      {s.note && ` — ${s.note}`}
                    </div>
                  ))}
              </CardContent>
            </Card>
          )}

          {tender.submission_log.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Submission log</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 pt-0">
                {tender.submission_log
                  .slice()
                  .reverse()
                  .map((s, i) => (
                    <div key={i} className="text-muted-foreground text-xs">
                      {(s.at || "").slice(0, 10)} — {s.method || "—"}
                      {s.reference && ` · Ref ${s.reference}`} · {s.by}
                      {s.note && ` — ${s.note}`}
                    </div>
                  ))}
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      <TenderFormSheet
        open={editOpen}
        onOpenChange={setEditOpen}
        tender={tender}
        users={usersQuery.data ?? []}
        onSubmit={(input) => updateMutation.mutate(input)}
        submitting={updateMutation.isPending}
      />

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="gap-0 overflow-hidden p-0">
          <ModalHeader icon={Trash2} title="Delete tender?" description={`"${tender.title}" will be archived.`} />
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

      <Dialog open={submitOpen} onOpenChange={setSubmitOpen}>
        <DialogContent className="gap-0 overflow-hidden p-0">
          <ModalHeader icon={Send} title="Record submission" description="Logs the submission and moves the tender to Submitted." />
          <div className="space-y-4 p-4">
            <div className="space-y-1.5">
              <Label>Submitted on</Label>
              <DatePicker
                value={submitForm.submitted_on}
                onChange={(v) => setSubmitForm((f) => ({ ...f, submitted_on: v }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Method</Label>
              <Input
                value={submitForm.method}
                onChange={(e) => setSubmitForm((f) => ({ ...f, method: e.target.value }))}
                placeholder="Email / Physical / Portal"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Reference / receipt</Label>
              <Input
                value={submitForm.reference}
                onChange={(e) => setSubmitForm((f) => ({ ...f, reference: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Note</Label>
              <Textarea rows={2} value={submitForm.note} onChange={(e) => setSubmitForm((f) => ({ ...f, note: e.target.value }))} />
            </div>
          </div>
          <DialogFooter className="p-4 pt-0">
            <Button variant="outline" onClick={() => setSubmitOpen(false)}>
              Cancel
            </Button>
            <Button disabled={submitMutation.isPending} onClick={() => submitMutation.mutate()}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!letterPreview} onOpenChange={(o) => !o && setLetterPreview(null)}>
        <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-xl">
          <ModalHeader icon={FileSignature} title={letterPreview?.name || "Letter"} description="Filled from the tender's details." />
          <div className="max-h-[60vh] overflow-y-auto p-4">
            <Textarea readOnly rows={16} value={letterPreview?.text ?? ""} />
          </div>
          <DialogFooter className="p-4 pt-0">
            <Button
              variant="outline"
              onClick={() => {
                if (letterPreview) navigator.clipboard.writeText(letterPreview.text)
                toast.success("Copied to clipboard")
              }}
            >
              Copy text
            </Button>
            <Button variant="outline" onClick={() => setLetterPreview(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
