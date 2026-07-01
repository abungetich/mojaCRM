import { ChevronRight, ArrowLeft } from "lucide-react"
import type { ReactNode } from "react"
import { Link, useNavigate } from "react-router-dom"

import { Button } from "@/components/ui/button"

export interface Breadcrumb {
  label: string
  to?: string
}

/**
 * Standard page header: back button + breadcrumb trail, then a title row
 * with optional actions. Used at the top of every tenant/admin page so
 * navigation is consistent everywhere.
 */
export function PageHeader({
  breadcrumbs,
  title,
  description,
  actions,
  backTo,
}: {
  breadcrumbs: Breadcrumb[]
  /** Omit (or pass "") to skip the title row — e.g. when the page renders its own richer header below. */
  title?: string
  description?: string
  actions?: ReactNode
  /** Explicit back destination. Defaults to browser history back. */
  backTo?: string
}) {
  const navigate = useNavigate()

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          className="-ml-2"
          onClick={() => (backTo ? navigate(backTo) : navigate(-1))}
        >
          <ArrowLeft /> Back
        </Button>
        <nav className="text-muted-foreground flex min-w-0 items-center gap-1 text-sm">
          {breadcrumbs.map((b, i) => (
            <span key={i} className="flex min-w-0 items-center gap-1">
              {i > 0 && <ChevronRight className="size-3.5 shrink-0" />}
              {b.to ? (
                <Link to={b.to} className="hover:text-foreground truncate">
                  {b.label}
                </Link>
              ) : (
                <span className="text-foreground truncate font-medium">{b.label}</span>
              )}
            </span>
          ))}
        </nav>
      </div>
      {title && (
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
            {description && <p className="text-muted-foreground text-sm">{description}</p>}
          </div>
          {actions && <div className="flex shrink-0 gap-2">{actions}</div>}
        </div>
      )}
    </div>
  )
}
