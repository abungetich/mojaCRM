import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { FileSignature, Plus, Trash2 } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { ModalHeader } from "@/components/modal-header"
import { tenders as tendersApi } from "@/lib/api"
import type { TenderLetter, TenderLetterInput } from "@/types"
import { TENDER_LETTER_KINDS } from "@/pages/tenant/tender-shared"

const EMPTY: TenderLetterInput = { name: "", kind: "cover", template_content: "", is_default: false }

/**
 * Manages reusable tender letter templates with {{placeholder}} tokens
 * (e.g. {{title}}, {{issuer}}, {{estimated_value}}). Ported from
 * propsense's LetterTemplates panel; uses a plain Textarea instead of
 * propsense's RichTextField, which doesn't exist in MojaCRM.
 */
export function TenderLetterTemplatesDialog() {
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<TenderLetter | undefined>()
  const [form, setForm] = useState<TenderLetterInput>(EMPTY)

  const lettersQuery = useQuery({
    queryKey: ["tenders", "letters"],
    queryFn: () => tendersApi.letters.list(),
    enabled: open,
  })
  const letters = lettersQuery.data ?? []

  const startNew = () => {
    setEditing(undefined)
    setForm(EMPTY)
  }
  const startEdit = (l: TenderLetter) => {
    setEditing(l)
    setForm({ name: l.name, kind: l.kind, template_content: l.template_content, is_default: l.is_default })
  }

  const saveMutation = useMutation({
    mutationFn: () =>
      editing ? tendersApi.letters.update(editing.id, form) : tendersApi.letters.create(form),
    onSuccess: () => {
      toast.success("Saved")
      queryClient.invalidateQueries({ queryKey: ["tenders", "letters"] })
      startNew()
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const removeMutation = useMutation({
    mutationFn: (id: string) => tendersApi.letters.remove(id),
    onSuccess: () => {
      toast.success("Deleted")
      queryClient.invalidateQueries({ queryKey: ["tenders", "letters"] })
      startNew()
    },
    onError: (err: Error) => toast.error(err.message),
  })

  return (
    <>
      <Button variant="outline" onClick={() => { setOpen(true); startNew() }}>
        <FileSignature className="size-4" /> Letter templates
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-2xl">
          <ModalHeader
            icon={FileSignature}
            title="Letter templates"
            description="Reusable letters with {{placeholders}} like {{title}}, {{issuer}}, {{estimated_value}}, {{owner_name}}, {{submission_deadline}}."
          />
          <div className="grid gap-4 p-4 sm:grid-cols-[200px_1fr]">
            <div className="space-y-1">
              <Button variant="outline" size="sm" className="w-full" onClick={startNew}>
                <Plus className="size-3.5" /> New template
              </Button>
              {letters.map((l) => (
                <div key={l.id} className="flex items-center justify-between rounded-md border px-2 py-1.5 text-sm">
                  <button type="button" className="truncate text-left hover:underline" onClick={() => startEdit(l)}>
                    {l.name}
                  </button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeMutation.mutate(l.id)}
                    disabled={removeMutation.isPending}
                  >
                    <Trash2 className="text-destructive size-4" />
                  </Button>
                </div>
              ))}
              {letters.length === 0 && !lettersQuery.isLoading && (
                <p className="text-muted-foreground px-1 text-xs">No templates yet.</p>
              )}
            </div>
            <div className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Name</Label>
                  <Input
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    placeholder="e.g. Cover letter"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Kind</Label>
                  <Select
                    items={TENDER_LETTER_KINDS.map((k) => ({ value: k, label: k[0].toUpperCase() + k.slice(1) }))}
                    value={form.kind}
                    onValueChange={(v) => setForm((f) => ({ ...f, kind: v as TenderLetterInput["kind"] }))}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TENDER_LETTER_KINDS.map((k) => (
                        <SelectItem key={k} value={k}>
                          {k[0].toUpperCase() + k.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Template</Label>
                <Textarea
                  rows={10}
                  value={form.template_content}
                  onChange={(e) => setForm((f) => ({ ...f, template_content: e.target.value }))}
                  placeholder="Dear Sir/Madam, Re: {{title}} — {{reference}}. We hereby submit our bid for the above tender issued by {{issuer}}…"
                />
              </div>
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-sm">
                  <Switch
                    checked={form.is_default}
                    onCheckedChange={(v) => setForm((f) => ({ ...f, is_default: v }))}
                  />
                  Default
                </label>
                <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || !form.name.trim()}>
                  {editing ? "Save" : "Create"}
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter className="p-4 pt-0">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
