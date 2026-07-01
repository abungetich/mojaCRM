import type { LucideIcon } from "lucide-react"

import { cn } from "@/lib/utils"

/**
 * Full-bleed gradient header for Dialog/Sheet content. Pair with
 * `className="gap-0 p-0 overflow-hidden"` (Dialog) or `"p-0 gap-0"` (Sheet)
 * on the content wrapper so this sits flush against the rounded corners.
 */
export function ModalHeader({
  icon: Icon,
  title,
  description,
  className,
}: {
  icon: LucideIcon
  title: string
  description?: string
  className?: string
}) {
  return (
    <div
      className={cn(
        "brand-mark flex items-center gap-3 px-4 py-4 text-white sm:px-6",
        className
      )}
    >
      <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/15">
        <Icon className="size-5" />
      </div>
      <div className="min-w-0">
        <h2 className="truncate text-base font-semibold">{title}</h2>
        {description && <p className="truncate text-xs text-white/80">{description}</p>}
      </div>
    </div>
  )
}
