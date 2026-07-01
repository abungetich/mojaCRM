import { useQuery } from "@tanstack/react-query"
import { Building2, CreditCard, Users } from "lucide-react"

import { PageHeader } from "@/components/page-header"
import { StatCard, StatsGrid } from "@/components/stat-card"
import { platform } from "@/lib/api"

export function AdminDashboardPage() {
  const tenantsQuery = useQuery({ queryKey: ["admin", "tenants"], queryFn: platform.tenants.list })
  const teamQuery = useQuery({ queryKey: ["admin", "team"], queryFn: platform.team.list })

  const activeTenants = tenantsQuery.data?.filter((t) => t.status === "active").length ?? 0

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[{ label: "Platform" }]}
        title="Platform overview"
        description="Everything happening across MojaCRM tenants"
      />
      <StatsGrid>
        <StatCard
          label="Tenants"
          value={tenantsQuery.data?.length ?? 0}
          icon={Building2}
          tone="primary"
          subtitle={`${activeTenants} active`}
          loading={tenantsQuery.isLoading}
        />
        <StatCard
          label="Active subscriptions"
          value={0}
          icon={CreditCard}
          tone="info"
          subtitle="Billing module coming soon"
        />
        <StatCard
          label="Platform team"
          value={teamQuery.data?.length ?? 0}
          icon={Users}
          tone="teal"
          loading={teamQuery.isLoading}
        />
      </StatsGrid>
    </div>
  )
}
