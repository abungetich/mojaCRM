import { useQuery } from "@tanstack/react-query"
import { Building2, KanbanSquare, ListTodo, UsersRound } from "lucide-react"

import { PageHeader } from "@/components/page-header"
import { StatCard, StatsGrid } from "@/components/stat-card"
import { customers as customersApi } from "@/lib/api"

export function TenantDashboardPage() {
  const orgQuery = useQuery({
    queryKey: ["customers", "count", "organization"],
    queryFn: () => customersApi.list({ customer_type: "organization", page: 1, page_size: 1 }),
  })
  const individualQuery = useQuery({
    queryKey: ["customers", "count", "individual"],
    queryFn: () => customersApi.list({ customer_type: "individual", page: 1, page_size: 1 }),
  })

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[{ label: "Dashboard" }]}
        title="Dashboard"
        description="Overview of your workspace"
      />
      <StatsGrid>
        <StatCard
          label="Organizations"
          value={orgQuery.data?.total ?? 0}
          icon={Building2}
          tone="primary"
          loading={orgQuery.isLoading}
        />
        <StatCard
          label="Individuals"
          value={individualQuery.data?.total ?? 0}
          icon={UsersRound}
          tone="teal"
          loading={individualQuery.isLoading}
        />
        <StatCard label="Open deals" value={0} icon={KanbanSquare} tone="info" subtitle="Pipeline module coming soon" />
        <StatCard label="Open tasks" value={0} icon={ListTodo} tone="slate" subtitle="Tasks module coming soon" />
      </StatsGrid>
    </div>
  )
}
