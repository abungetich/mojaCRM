import { ListTodo } from "lucide-react"
import { PageHeader } from "@/components/page-header"
import { PlaceholderPage } from "@/components/placeholder-page"

export function TasksPage() {
  return (
    <div className="space-y-6">
      <PageHeader breadcrumbs={[{ label: "Dashboard", to: "/" }, { label: "Tasks" }]} backTo="/" title="Tasks" />
      <PlaceholderPage
        icon={ListTodo}
        title="Tasks"
        description="Follow-ups and to-dos assigned to you and your team."
      />
    </div>
  )
}
