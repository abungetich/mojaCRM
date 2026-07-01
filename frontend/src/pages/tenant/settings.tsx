import { Settings } from "lucide-react"
import { PageHeader } from "@/components/page-header"
import { PlaceholderPage } from "@/components/placeholder-page"

export function SettingsPage() {
  return (
    <div className="space-y-6">
      <PageHeader breadcrumbs={[{ label: "Dashboard", to: "/" }, { label: "Settings" }]} backTo="/" title="Settings" />
      <PlaceholderPage
        icon={Settings}
        title="Workspace settings"
        description="Branding, billing, and workspace preferences will live here."
      />
    </div>
  )
}
