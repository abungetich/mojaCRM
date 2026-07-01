import type { LucideIcon } from "lucide-react"

export function PlaceholderPage({
  title,
  description,
  icon: Icon,
}: {
  title: string
  description: string
  icon: LucideIcon
}) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-center">
      <div className="bg-muted flex size-12 items-center justify-center rounded-xl">
        <Icon className="text-muted-foreground size-6" />
      </div>
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="text-muted-foreground max-w-sm text-sm">{description}</p>
    </div>
  )
}
