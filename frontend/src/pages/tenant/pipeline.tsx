import { KanbanSquare } from "lucide-react"
import { PageHeader } from "@/components/page-header"
import { PlaceholderPage } from "@/components/placeholder-page"

export function PipelinePage() {
  return (
    <div className="space-y-6">
      <PageHeader breadcrumbs={[{ label: "Dashboard", to: "/" }, { label: "Pipeline" }]} backTo="/" title="Pipeline" />
      <PlaceholderPage
        icon={KanbanSquare}
        title="Pipeline"
        description="A kanban board of deals moving through your sales stages will live here."
      />
    </div>
  )
}
