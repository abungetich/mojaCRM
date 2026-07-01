import { Navigate, Route, Routes } from "react-router-dom"

import { AdminLayout } from "@/components/layout/admin-layout"
import { TenantLayout } from "@/components/layout/tenant-layout"
import { AdminDashboardPage } from "@/pages/admin/dashboard"
import { AdminSettingsPage } from "@/pages/admin/settings"
import { AdminTeamPage } from "@/pages/admin/team"
import { AdminTenantsPage } from "@/pages/admin/tenants"
import { LoginPage } from "@/pages/login"
import { SignupPage } from "@/pages/signup"
import { VerifyEmailPage } from "@/pages/verify-email"
import { TenantDashboardPage } from "@/pages/tenant/dashboard"
import { PipelinePage } from "@/pages/tenant/pipeline"
import { RolesPage } from "@/pages/tenant/roles"
import { SettingsPage } from "@/pages/tenant/settings"
import { TasksPage } from "@/pages/tenant/tasks"
import { UsersPage } from "@/pages/tenant/users"
import { CommunicationsCenterPage } from "@/pages/tenant/directory/communications-center"
import { CustomerDetailPage } from "@/pages/tenant/directory/customer-detail"
import { CustomersListPage } from "@/pages/tenant/directory/customers-list"
import { ClientsListPage } from "@/pages/tenant/directory/clients-list"
import { ClientDetailPage } from "@/pages/tenant/directory/client-detail"
import { PartnersListPage } from "@/pages/tenant/directory/partners-list"
import { PartnerDetailPage } from "@/pages/tenant/directory/partner-detail"

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route path="/verify-email" element={<VerifyEmailPage />} />
      <Route path="/admin/login" element={<Navigate to="/login" replace />} />

      <Route element={<TenantLayout />}>
        <Route path="/" element={<TenantDashboardPage />} />
        <Route path="/customers" element={<CustomersListPage />} />
        <Route path="/customers/:id" element={<CustomerDetailPage />} />
        <Route path="/clients" element={<ClientsListPage />} />
        <Route path="/clients/:id" element={<ClientDetailPage />} />
        <Route path="/partners" element={<PartnersListPage />} />
        <Route path="/partners/:id" element={<PartnerDetailPage />} />
        <Route path="/communications" element={<CommunicationsCenterPage />} />
        <Route path="/pipeline" element={<PipelinePage />} />
        <Route path="/tasks" element={<TasksPage />} />
        <Route path="/users" element={<UsersPage />} />
        <Route path="/roles" element={<RolesPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>

      <Route element={<AdminLayout />}>
        <Route path="/admin" element={<AdminDashboardPage />} />
        <Route path="/admin/tenants" element={<AdminTenantsPage />} />
        <Route path="/admin/team" element={<AdminTeamPage />} />
        <Route path="/admin/settings" element={<AdminSettingsPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
