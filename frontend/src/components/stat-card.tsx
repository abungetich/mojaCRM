import type { LucideIcon } from "lucide-react"
import type { ReactNode } from "react"

import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

export type StatTone = "primary" | "teal" | "info" | "green" | "coral" | "slate"

const TONE_CLASSES: Record<StatTone, { bg: string; icon: string }> = {
  primary: {
    bg: "from-orange-50 to-amber-50 dark:from-orange-500/10 dark:to-amber-500/5",
    icon: "bg-orange-100 text-orange-600 dark:bg-orange-500/15 dark:text-orange-400",
  },
  teal: {
    bg: "from-teal-50 to-emerald-50 dark:from-teal-500/10 dark:to-emerald-500/5",
    icon: "bg-teal-100 text-teal-600 dark:bg-teal-500/15 dark:text-teal-400",
  },
  info: {
    bg: "from-sky-50 to-blue-50 dark:from-sky-500/10 dark:to-blue-500/5",
    icon: "bg-sky-100 text-sky-600 dark:bg-sky-500/15 dark:text-sky-400",
  },
  green: {
    bg: "from-emerald-50 to-green-50 dark:from-emerald-500/10 dark:to-green-500/5",
    icon: "bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400",
  },
  coral: {
    bg: "from-rose-50 to-red-50 dark:from-rose-500/10 dark:to-red-500/5",
    icon: "bg-rose-100 text-rose-600 dark:bg-rose-500/15 dark:text-rose-400",
  },
  slate: {
    bg: "from-slate-50 to-gray-50 dark:from-slate-500/10 dark:to-gray-500/5",
    icon: "bg-slate-100 text-slate-600 dark:bg-slate-500/15 dark:text-slate-400",
  },
}

export function StatCard({
  label,
  value,
  icon: Icon,
  tone = "primary",
  subtitle,
  loading,
  onClick,
}: {
  label: string
  value: ReactNode
  icon: LucideIcon
  tone?: StatTone
  subtitle?: string
  loading?: boolean
  onClick?: () => void
}) {
  const toneClasses = TONE_CLASSES[tone]

  return (
    <div
      onClick={onClick}
      className={cn(
        "rounded-xl border bg-gradient-to-br p-4",
        toneClasses.bg,
        onClick && "cursor-pointer transition-transform hover:-translate-y-0.5"
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-muted-foreground text-xs font-medium tracking-wide uppercase">{label}</span>
        <div className={cn("flex size-8 shrink-0 items-center justify-center rounded-lg", toneClasses.icon)}>
          <Icon className="size-4" />
        </div>
      </div>
      {loading ? (
        <Skeleton className="mt-2 h-7 w-16" />
      ) : (
        <div className="mt-1 text-2xl font-bold">{value}</div>
      )}
      {subtitle && <p className="text-muted-foreground mt-0.5 text-xs">{subtitle}</p>}
    </div>
  )
}

export function StatsGrid({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{children}</div>
}
