import type { TenderStage } from "@/types"

/** Shared display helpers for the Tenders module (list + detail + form). */

export const TENDER_TYPES = [
  { value: "tender", label: "Tender" },
  { value: "prequalification", label: "Pre-qualification" },
  { value: "eoi", label: "EOI" },
]

export const TENDER_SECURITY_TYPES = [
  { value: "__none", label: "None" },
  { value: "bid_bond", label: "Bid bond" },
  { value: "bank_guarantee", label: "Bank guarantee" },
  { value: "cash", label: "Cash deposit" },
]

export const TENDER_STAGE_OPTIONS: { value: TenderStage; label: string }[] = [
  { value: "watching", label: "Watching" },
  { value: "preparing", label: "Preparing" },
  { value: "submitted", label: "Submitted" },
  { value: "evaluation", label: "Evaluation" },
  { value: "shortlisted", label: "Shortlisted" },
  { value: "awarded", label: "Awarded" },
  { value: "unsuccessful", label: "Unsuccessful" },
  { value: "withdrawn", label: "Withdrawn" },
]

export const STAGE_LABEL: Record<string, string> = {
  watching: "Watching",
  preparing: "Preparing",
  submitted: "Submitted",
  evaluation: "Evaluation",
  shortlisted: "Shortlisted",
  awarded: "Awarded",
  unsuccessful: "Unsuccessful",
  withdrawn: "Withdrawn",
}

export const STAGE_TONE: Record<string, string> = {
  watching: "bg-slate-500/15 text-slate-600",
  preparing: "bg-blue-500/15 text-blue-700",
  submitted: "bg-violet-500/15 text-violet-700",
  evaluation: "bg-amber-500/15 text-amber-700",
  shortlisted: "bg-amber-500/15 text-amber-700",
  awarded: "bg-emerald-500/15 text-emerald-700",
  unsuccessful: "bg-red-500/15 text-red-700",
  withdrawn: "bg-slate-500/15 text-slate-500",
}

export const TENDER_DOC_KINDS = [
  { value: "tender", label: "Tender doc" },
  { value: "submission", label: "Submission" },
  { value: "addendum", label: "Addendum" },
  { value: "security", label: "Security" },
  { value: "outcome", label: "Outcome" },
  { value: "other", label: "Other" },
]

export const TENDER_LETTER_KINDS = ["cover", "technical", "financial", "compliance", "other"] as const

/** watching/preparing are the only stages where a deadline still matters. */
const ACTIVE_STAGES = new Set(["watching", "preparing"])
export function isActiveStage(stage: string) {
  return ACTIVE_STAGES.has(stage)
}

/** Days-to-deadline urgency colour, ported from propsense's Tenders.tsx. */
export function dueTone(deadline: string, stage: string) {
  if (!deadline || !isActiveStage(stage)) return "text-muted-foreground"
  const days = (Date.parse(deadline + "T23:59:59") - Date.now()) / 86_400_000
  if (days < 0) return "text-red-600 font-medium"
  if (days <= 3) return "text-red-600"
  if (days <= 7) return "text-amber-600"
  return "text-muted-foreground"
}

export function money(n: number, ccy = "KES") {
  return `${ccy} ${Number(n || 0).toLocaleString()}`
}

/** Fills {{placeholder}} tokens in a letter template with tender fields. */
export function fillLetterTemplate(
  template: string,
  values: Record<string, string>
) {
  return template.replace(/{{\s*([\w.]+)\s*}}/g, (_match, key: string) => values[key] ?? "")
}
