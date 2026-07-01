import { apiClient } from "@/lib/api-client"
import type {
  ArchivedItem,
  Billing as BillingType,
  Branding,
  Client,
  ClientInput,
  Comparable,
  ComparableInput,
  ComparablePhoto,
  ComparablePhotoInput,
  Communication,
  CommunicationInput,
  CompanyDocument,
  Contact,
  ContactInput,
  Customer,
  CustomerInput,
  CustomerNote,
  Department,
  DepartmentInput,
  DepartmentMember,
  DocumentInput,
  DocumentVersion,
  DocumentVersionInput,
  EmailSettingsInput,
  Inspection,
  InspectionInput,
  InspectionPhoto,
  InspectionPhotoInput,
  Office,
  OfficeInput,
  OrgProfile,
  OrgProfileInput,
  Paginated,
  Partner,
  PartnerAppendixTemplate,
  PartnerAppendixTemplateInput,
  PartnerBranch,
  PartnerBranchInput,
  PartnerContact,
  PartnerContactInput,
  PartnerComparableRulesInput,
  PartnerInput,
  PartnerRequirement,
  PartnerRequirementInput,
  Permission,
  ReferenceDataInput,
  ReferenceDataItem,
  Role,
  Session,
  SignupResult,
  Tag,
  Tender,
  TenderDocument,
  TenderDocumentInput,
  TenderInput,
  TenderLetter,
  TenderLetterInput,
  TenderListRow,
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

export interface ClientListParams {
  page?: number
  page_size?: number
  client_type?: string
  q?: string
}

export const clients = {
  list: (params: ClientListParams) =>
    apiClient.get<Paginated<Client>>("/clients", { params }).then((r) => r.data),
  get: (id: string) => apiClient.get<Client>(`/clients/${id}`).then((r) => r.data),
  create: (input: ClientInput) => apiClient.post<Client>("/clients", input).then((r) => r.data),
  update: (id: string, input: ClientInput) =>
    apiClient.patch<Client>(`/clients/${id}`, input).then((r) => r.data),
  remove: (id: string) => apiClient.delete(`/clients/${id}`),
}

export interface PartnerListParams {
  page?: number
  page_size?: number
  status?: string
  type?: string
  q?: string
}

export const partners = {
  list: (params: PartnerListParams) =>
    apiClient.get<Paginated<Partner>>("/partners", { params }).then((r) => r.data),
  get: (id: string) => apiClient.get<Partner>(`/partners/${id}`).then((r) => r.data),
  create: (input: PartnerInput) => apiClient.post<Partner>("/partners", input).then((r) => r.data),
  update: (id: string, input: PartnerInput) =>
    apiClient.patch<Partner>(`/partners/${id}`, input).then((r) => r.data),
  remove: (id: string) => apiClient.delete(`/partners/${id}`),
  setComparableRules: (id: string, input: PartnerComparableRulesInput) =>
    apiClient.patch<Partner>(`/partners/${id}/comparable-rules`, input).then((r) => r.data),

  branches: {
    list: (partnerId: string) =>
      apiClient.get<PartnerBranch[]>(`/partners/${partnerId}/branches`).then((r) => r.data),
    create: (partnerId: string, input: PartnerBranchInput) =>
      apiClient.post<PartnerBranch>(`/partners/${partnerId}/branches`, input).then((r) => r.data),
    update: (_partnerId: string, branchId: string, input: PartnerBranchInput) =>
      apiClient.patch<PartnerBranch>(`/branches/${branchId}`, input).then((r) => r.data),
    remove: (_partnerId: string, branchId: string) => apiClient.delete(`/branches/${branchId}`),
  },

  contacts: {
    list: (partnerId: string) =>
      apiClient.get<PartnerContact[]>(`/partners/${partnerId}/contacts`).then((r) => r.data),
    create: (partnerId: string, input: PartnerContactInput) =>
      apiClient.post<PartnerContact>(`/partners/${partnerId}/contacts`, input).then((r) => r.data),
    update: (_partnerId: string, contactId: string, input: PartnerContactInput) =>
      apiClient.patch<PartnerContact>(`/partner-contacts/${contactId}`, input).then((r) => r.data),
    remove: (_partnerId: string, contactId: string) => apiClient.delete(`/partner-contacts/${contactId}`),
  },

  requirements: {
    list: (partnerId: string) =>
      apiClient.get<PartnerRequirement[]>(`/partners/${partnerId}/requirements`).then((r) => r.data),
    create: (partnerId: string, input: PartnerRequirementInput) =>
      apiClient
        .post<PartnerRequirement>(`/partners/${partnerId}/requirements`, input)
        .then((r) => r.data),
    update: (_partnerId: string, requirementId: string, input: PartnerRequirementInput) =>
      apiClient
        .patch<PartnerRequirement>(`/partner-requirements/${requirementId}`, input)
        .then((r) => r.data),
    remove: (_partnerId: string, requirementId: string) =>
      apiClient.delete(`/partner-requirements/${requirementId}`),
  },

  appendixTemplates: {
    list: (partnerId: string) =>
      apiClient
        .get<PartnerAppendixTemplate[]>(`/partners/${partnerId}/appendix-templates`)
        .then((r) => r.data),
    create: (partnerId: string, input: PartnerAppendixTemplateInput) =>
      apiClient
        .post<PartnerAppendixTemplate>(`/partners/${partnerId}/appendix-templates`, input)
        .then((r) => r.data),
    update: (_partnerId: string, templateId: string, input: PartnerAppendixTemplateInput) =>
      apiClient
        .patch<PartnerAppendixTemplate>(`/appendix-templates/${templateId}`, input)
        .then((r) => r.data),
    remove: (_partnerId: string, templateId: string) =>
      apiClient.delete(`/appendix-templates/${templateId}`),
  },
}

export interface ComparableListParams {
  page?: number
  page_size?: number
  q?: string
}

export const comparables = {
  list: (params: ComparableListParams) =>
    apiClient.get<Paginated<Comparable>>("/comparables", { params }).then((r) => r.data),
  get: (id: string) => apiClient.get<Comparable>(`/comparables/${id}`).then((r) => r.data),
  create: (input: ComparableInput) => apiClient.post<Comparable>("/comparables", input).then((r) => r.data),
  update: (id: string, input: ComparableInput) =>
    apiClient.patch<Comparable>(`/comparables/${id}`, input).then((r) => r.data),
  remove: (id: string) => apiClient.delete(`/comparables/${id}`),
  photoCounts: () => apiClient.get<Record<string, number>>("/comparables/photo-counts").then((r) => r.data),

  photos: {
    list: (comparableId: string) =>
      apiClient.get<ComparablePhoto[]>(`/comparables/${comparableId}/photos`).then((r) => r.data),
    add: (comparableId: string, input: ComparablePhotoInput) =>
      apiClient.post<ComparablePhoto>(`/comparables/${comparableId}/photos`, input).then((r) => r.data),
    remove: (_comparableId: string, photoId: string) => apiClient.delete(`/comparable-photos/${photoId}`),
  },
}

export const inspections = {
  // Tenant-wide feed for the Calendar page.
  listAll: () => apiClient.get<Inspection[]>("/inspections").then((r) => r.data),
  get: (id: string) => apiClient.get<Inspection>(`/inspections/${id}`).then((r) => r.data),
  update: (id: string, input: InspectionInput) =>
    apiClient.patch<Inspection>(`/inspections/${id}`, input).then((r) => r.data),
  remove: (id: string) => apiClient.delete(`/inspections/${id}`),
  arrive: (id: string, coords?: { lat: number; lng: number }) =>
    apiClient.post<Inspection>(`/inspections/${id}/arrive`, coords ?? {}).then((r) => r.data),
  depart: (id: string, coords?: { lat: number; lng: number }) =>
    apiClient.post<Inspection>(`/inspections/${id}/depart`, coords ?? {}).then((r) => r.data),
  cancel: (id: string) => apiClient.post<Inspection>(`/inspections/${id}/cancel`).then((r) => r.data),

  byClient: {
    list: (clientId: string) =>
      apiClient.get<Inspection[]>(`/clients/${clientId}/inspections`).then((r) => r.data),
    schedule: (clientId: string, input: InspectionInput) =>
      apiClient.post<Inspection>(`/clients/${clientId}/inspections`, input).then((r) => r.data),
  },

  photos: {
    list: (inspectionId: string) =>
      apiClient.get<InspectionPhoto[]>(`/inspections/${inspectionId}/photos`).then((r) => r.data),
    add: (inspectionId: string, input: InspectionPhotoInput) =>
      apiClient.post<InspectionPhoto>(`/inspections/${inspectionId}/photos`, input).then((r) => r.data),
    updateCaption: (photoId: string, caption: string) =>
      apiClient.patch<InspectionPhoto>(`/inspection-photos/${photoId}`, { caption }).then((r) => r.data),
    remove: (photoId: string) => apiClient.delete(`/inspection-photos/${photoId}`),
  },
}

export interface DocumentListParams {
  page?: number
  page_size?: number
  category?: string
  q?: string
}

export const documents = {
  list: (params: DocumentListParams) =>
    apiClient.get<Paginated<CompanyDocument>>("/documents", { params }).then((r) => r.data),
  get: (id: string) => apiClient.get<CompanyDocument>(`/documents/${id}`).then((r) => r.data),
  create: (input: DocumentInput) => apiClient.post<CompanyDocument>("/documents", input).then((r) => r.data),
  update: (id: string, input: DocumentInput) =>
    apiClient.patch<CompanyDocument>(`/documents/${id}`, input).then((r) => r.data),
  remove: (id: string) => apiClient.delete(`/documents/${id}`),

  versions: {
    list: (documentId: string) =>
      apiClient.get<DocumentVersion[]>(`/documents/${documentId}/versions`).then((r) => r.data),
    add: (documentId: string, input: DocumentVersionInput) =>
      apiClient.post<CompanyDocument>(`/documents/${documentId}/versions`, input).then((r) => r.data),
  },
}

export interface TenderListParams {
  page?: number
  page_size?: number
  stage?: string
  q?: string
}

export const tenders = {
  list: (params: TenderListParams) =>
    apiClient.get<Paginated<TenderListRow>>("/tenders", { params }).then((r) => r.data),
  get: (id: string) => apiClient.get<Tender>(`/tenders/${id}`).then((r) => r.data),
  create: (input: TenderInput) => apiClient.post<Tender>("/tenders", input).then((r) => r.data),
  update: (id: string, input: TenderInput) =>
    apiClient.patch<Tender>(`/tenders/${id}`, input).then((r) => r.data),
  remove: (id: string) => apiClient.delete(`/tenders/${id}`),
  setStage: (id: string, stage: string, note?: string, outcomeNote?: string) =>
    apiClient
      .post(`/tenders/${id}/stage`, { stage, note, outcome_note: outcomeNote })
      .then((r) => r.data),
  assign: (id: string, ownerUserId: string) =>
    apiClient.post(`/tenders/${id}/assign`, { owner_user_id: ownerUserId }).then((r) => r.data),
  submit: (id: string, input: { submitted_on?: string; method?: string; reference?: string; note?: string }) =>
    apiClient.post(`/tenders/${id}/submit`, input).then((r) => r.data),

  documents: {
    list: (tenderId: string) =>
      apiClient.get<TenderDocument[]>(`/tenders/${tenderId}/documents`).then((r) => r.data),
    get: (_tenderId: string, docId: string) =>
      apiClient.get<{ data_url: string; name: string }>(`/tender-documents/${docId}`).then((r) => r.data),
    add: (tenderId: string, input: TenderDocumentInput) =>
      apiClient.post<{ id: string }>(`/tenders/${tenderId}/documents`, input).then((r) => r.data),
    remove: (_tenderId: string, docId: string) => apiClient.delete(`/tender-documents/${docId}`),
  },

  // Client-generated PDFs (dossier / letter) emailed as an attachment.
  // Currently returns 501 — MojaCRM has no mailer configured yet.
  email: (id: string, input: { to: string; cc?: string; subject?: string; message?: string; file_name: string; data_url: string }) =>
    apiClient.post(`/tenders/${id}/email`, input).then((r) => r.data),

  letters: {
    list: () => apiClient.get<TenderLetter[]>("/tender-letters").then((r) => r.data),
    create: (input: TenderLetterInput) =>
      apiClient.post<{ id: string }>("/tender-letters", input).then((r) => r.data),
    update: (id: string, input: TenderLetterInput) =>
      apiClient.patch(`/tender-letters/${id}`, input).then((r) => r.data),
    remove: (id: string) => apiClient.delete(`/tender-letters/${id}`),
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

export const workspace = {
  get: () => apiClient.get<OrgProfile>("/tenant").then((r) => r.data),
  updateProfile: (input: OrgProfileInput) =>
    apiClient.patch<OrgProfile>("/tenant/profile", input).then((r) => r.data),
  updateEmailSettings: (input: EmailSettingsInput) =>
    apiClient.patch<OrgProfile>("/tenant/email", input).then((r) => r.data),
  billing: () => apiClient.get<BillingType>("/billing").then((r) => r.data),
}

export const departments = {
  list: () => apiClient.get<Department[]>("/departments").then((r) => r.data),
  get: (id: string) => apiClient.get<Department>(`/departments/${id}`).then((r) => r.data),
  create: (input: DepartmentInput) => apiClient.post<Department>("/departments", input).then((r) => r.data),
  update: (id: string, input: DepartmentInput) =>
    apiClient.patch<Department>(`/departments/${id}`, input).then((r) => r.data),
  remove: (id: string) => apiClient.delete(`/departments/${id}`),
  members: {
    list: (departmentId: string) =>
      apiClient.get<DepartmentMember[]>(`/departments/${departmentId}/members`).then((r) => r.data),
    add: (departmentId: string, userId: string) =>
      apiClient.post(`/departments/${departmentId}/members`, { user_id: userId }),
    remove: (departmentId: string, userId: string) =>
      apiClient.delete(`/departments/${departmentId}/members/${userId}`),
  },
}

export const offices = {
  list: () => apiClient.get<Office[]>("/offices").then((r) => r.data),
  create: (input: OfficeInput) => apiClient.post<Office>("/offices", input).then((r) => r.data),
  update: (id: string, input: OfficeInput) =>
    apiClient.patch<Office>(`/offices/${id}`, input).then((r) => r.data),
  remove: (id: string) => apiClient.delete(`/offices/${id}`),
}

export const referenceData = {
  list: (category?: string) =>
    apiClient
      .get<ReferenceDataItem[]>("/reference-data", { params: category ? { category } : undefined })
      .then((r) => r.data),
  create: (input: ReferenceDataInput) =>
    apiClient.post<ReferenceDataItem>("/reference-data", input).then((r) => r.data),
  remove: (id: string) => apiClient.delete(`/reference-data/${id}`),
}

export const archive = {
  list: () => apiClient.get<ArchivedItem[]>("/archive").then((r) => r.data),
  restore: (entity: string, id: string) => apiClient.post("/archive/restore", { entity, id }),
  purge: (entity: string, id: string) => apiClient.post("/archive/purge", { entity, id }),
}
