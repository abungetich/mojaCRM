import { Search, X } from "lucide-react"
import type { ReactNode } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

export function FilterBar({
  search,
  onSearchChange,
  searchPlaceholder = "Search…",
  pills,
  extra,
  onClear,
  activeCount = 0,
}: {
  search: string
  onSearchChange: (value: string) => void
  searchPlaceholder?: string
  pills?: ReactNode
  extra?: ReactNode
  onClear?: () => void
  activeCount?: number
}) {
  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
          <Input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            className="pl-8"
          />
        </div>
        {extra}
        {activeCount > 0 && onClear && (
          <Button variant="ghost" size="sm" onClick={onClear} className="shrink-0">
            <X /> Clear ({activeCount})
          </Button>
        )}
      </div>
      {pills && <div className="flex flex-wrap items-center gap-1.5">{pills}</div>}
    </div>
  )
}

export function FilterPill({
  active,
  onClick,
  children,
  count,
}: {
  active: boolean
  onClick: () => void
  children: ReactNode
  count?: number
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
        active
          ? "bg-primary text-primary-foreground border-primary"
          : "border-border text-muted-foreground hover:bg-muted"
      )}
    >
      {children}
      {count != null && (
        <span
          className={cn(
            "rounded-full px-1.5 text-[10px] font-bold",
            active ? "bg-primary-foreground/20" : "bg-muted"
          )}
        >
          {count}
        </span>
      )}
    </button>
  )
}
