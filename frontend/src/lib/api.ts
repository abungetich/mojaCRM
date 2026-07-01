import { apiClient } from "@/lib/api-client"
import type {
  Branding,
  Communication,
  CommunicationInput,
  Contact,
  ContactInput,
  Customer,
  CustomerInput,
  CustomerNote,
  Paginated,
  Permission,
  Role,
  Session,
  SignupResult,
  Tag,
  Tenant,
  User,
} from "@/types"

export const branding = {
  get: () => apiClient.get<Branding>("/branding").then((r) => r.data),
  update: (input: Branding) => apiClient.patch<Branding>("/admin/settings", input).then((r) => r.data),
}

export const auth = {
  login: (email: string, password: string) =>
    apiClient
      .post<{ session: Session }>("/auth/login", { email, password })
      .then((r) => r.data.session),
  logout: () => apiClient.post("/auth/logout"),
  me: () => apiClient.get<Session>("/auth/me").then((r) => r.data),
  signup: (input: { workspace_name: string; name: string; email: string; password: string }) =>
    apiClient.post<SignupResult>("/auth/signup", input).then((r) => r.data),
  verifyEmail: (token: string) =>
    apiClient
      .post<{ session: Session }>("/auth/verify-email", { token })
      .then((r) => r.data.session),
}

export const users = {
  list: () => apiClient.get<User[]>("/users").then((r) => r.data),
  create: (input: { email: string; name: string; role_id: string }) =>
    apiClient.post<User>("/users", input).then((r) => r.data),
  update: (id: string, input: Partial<Pick<User, "name" | "role_id" | "status">>) =>
    apiClient.patch<User>(`/users/${id}`, input).then((r) => r.data),
  remove: (id: string) => apiClient.delete(`/users/${id}`),
}

export const roles = {
  list: () => apiClient.get<Role[]>("/roles").then((r) => r.data),
  permissions: () => apiClient.get<Permission[]>("/permissions").then((r) => r.data),
  create: (input: { name: string; description?: string; permission_keys: string[] }) =>
    apiClient.post<Role>("/roles", input).then((r) => r.data),
  update: (id: string, input: { name?: string; description?: string; permission_keys?: string[] }) =>
    apiClient.patch<Role>(`/roles/${id}`, input).then((r) => r.data),
  remove: (id: string) => apiClient.delete(`/roles/${id}`),
}

export interface CustomerListParams {
  page?: number
  page_size?: number
  status?: string
  customer_type?: string
  segment?: string
  q?: string
}

export const customers = {
  list: (params: CustomerListParams) =>
    apiClient.get<Paginated<Customer>>("/customers", { params }).then((r) => r.data),
  get: (id: string) => apiClient.get<Customer>(`/customers/${id}`).then((r) => r.data),
  create: (input: CustomerInput) => apiClient.post<Customer>("/customers", input).then((r) => r.data),
  update: (id: string, input: CustomerInput) =>
    apiClient.patch<Customer>(`/customers/${id}`, input).then((r) => r.data),
  remove: (id: string) => apiClient.delete(`/customers/${id}`),
  archive: (id: string, reason: string) =>
    apiClient.post<Customer>(`/customers/${id}/archive`, { reason }).then((r) => r.data),
  restore: (id: string) => apiClient.post<Customer>(`/customers/${id}/restore`).then((r) => r.data),
  setStatus: (id: string, status: string) =>
    apiClient.post<Customer>(`/customers/${id}/status`, { status }).then((r) => r.data),
  assignOwner: (id: string, accountOwnerId: string) =>
    apiClient.post<Customer>(`/customers/${id}/owner`, { account_owner_id: accountOwnerId }).then((r) => r.data),

  tags: {
    listAll: () => apiClient.get<Tag[]>("/customers/tags").then((r) => r.data),
    list: (customerId: string) => apiClient.get<Tag[]>(`/customers/${customerId}/tags`).then((r) => r.data),
    add: (customerId: string, name: string) =>
      apiClient.post<Tag>(`/customers/${customerId}/tags`, { name }).then((r) => r.data),
    remove: (customerId: string, tagId: string) =>
      apiClient.delete(`/customers/${customerId}/tags/${tagId}`),
  },

  notes: {
    list: (customerId: string) =>
      apiClient.get<CustomerNote[]>(`/customers/${customerId}/notes`).then((r) => r.data),
    create: (customerId: string, body: string) =>
      apiClient.post<CustomerNote>(`/customers/${customerId}/notes`, { body }).then((r) => r.data),
  },

  contacts: {
    list: (customerId: string) => apiClient.get<Contact[]>(`/customers/${customerId}/contacts`).then((r) => r.data),
    create: (customerId: string, input: ContactInput) =>
      apiClient.post<Contact>(`/customers/${customerId}/contacts`, input).then((r) => r.data),
    update: (customerId: string, contactId: string, input: ContactInput) =>
      apiClient.patch<Contact>(`/customers/${customerId}/contacts/${contactId}`, input).then((r) => r.data),
    remove: (customerId: string, contactId: string) =>
      apiClient.delete(`/customers/${customerId}/contacts/${contactId}`),
    setPrimary: (customerId: string, contactId: string) =>
      apiClient.post<Contact>(`/customers/${customerId}/contacts/${contactId}/primary`).then((r) => r.data),
    setStatus: (customerId: string, contactId: string, status: "active" | "inactive") =>
      apiClient
        .post<Contact>(`/customers/${customerId}/contacts/${contactId}/status`, { status })
        .then((r) => r.data),
  },

  communications: {
    list: (customerId: string) =>
      apiClient.get<Communication[]>(`/customers/${customerId}/communications`).then((r) => r.data),
    create: (customerId: string, input: CommunicationInput) =>
      apiClient.post<Communication>(`/customers/${customerId}/communications`, input).then((r) => r.data),
  },
}

export interface CommunicationListParams {
  page?: number
  page_size?: number
  communication_type?: string
  status?: string
  follow_up_required?: "true" | "false"
  q?: string
}

export const communications = {
  list: (params: CommunicationListParams) =>
    apiClient.get<Paginated<Communication>>("/communications", { params }).then((r) => r.data),
  followUps: () => apiClient.get<Communication[]>("/communications/follow-ups").then((r) => r.data),
  updateStatus: (id: string, status: string) =>
    apiClient.post<Communication>(`/communications/${id}/status`, { status }).then((r) => r.data),
  completeFollowUp: (id: string) =>
    apiClient.post<Communication>(`/communications/${id}/complete`).then((r) => r.data),
  remove: (id: string) => apiClient.delete(`/communications/${id}`),
}

export const platform = {
  tenants: {
    list: () => apiClient.get<Tenant[]>("/admin/tenants").then((r) => r.data),
    create: (input: { name: string; slug: string }) =>
      apiClient.post<Tenant>("/admin/tenants", input).then((r) => r.data),
    suspend: (id: string) => apiClient.post(`/admin/tenants/${id}/suspend`),
    activate: (id: string) => apiClient.post(`/admin/tenants/${id}/activate`),
  },
  team: {
    list: () => apiClient.get<User[]>("/admin/team").then((r) => r.data),
    create: (input: { email: string; name: string; password: string }) =>
      apiClient.post<User>("/admin/team", input).then((r) => r.data),
  },
}
