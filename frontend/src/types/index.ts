export type SessionKind = "platform" | "tenant"

export interface User {
  id: string
  email: string
  name: string
  role_id?: string
  role_name?: string
  status: "active" | "invited" | "disabled" | "pending_verification"
  avatar_url?: string
  created_at: string
}

export interface Session {
  kind: SessionKind
  user: User
  tenant?: { id: string; name: string; slug: string }
  permissions: string[]
}

export interface Role {
  id: string
  name: string
  description?: string
  is_system: boolean
  permission_keys: string[]
}

export interface Permission {
  key: string
  description: string
}

export interface Tenant {
  id: string
  name: string
  slug: string
  status: "active" | "suspended" | "trial"
  plan?: string
  created_at: string
}

// Signup no longer logs the user in immediately — it requires an
// email-verification step. There's no real mailer wired up yet, so the
// verification link is simulated: the backend logs it server-side and also
// hands it back here so the UI can surface it directly.
export interface SignupResult {
  status: "verification_required"
  email: string
  verification_url: string
}

// --- Directory module ---

export type CustomerType = "organization" | "individual"
export type CustomerStatus = "prospect" | "active" | "dormant" | "archived" | "blacklisted"

export interface Customer {
  id: string
  customer_type: CustomerType
  status: CustomerStatus
  segment: string
  source: string
  account_owner_id?: string
  account_owner_name?: string
  archive_reason?: string
  archived_at?: string
  organization_name: string
  legal_name: string
  trading_name: string
  registration_number: string
  tax_pin: string
  industry: string
  organization_size: string
  first_name: string
  middle_name: string
  last_name: string
  display_name: string
  id_number: string
  date_of_birth?: string
  gender: string
  occupation: string
  website: string
  description: string
  primary_email: string
  primary_phone: string
  alternative_phone: string
  address: string
  country: string
  state: string
  city: string
  created_at: string
  updated_at: string
}

export interface CustomerInput {
  customer_type: CustomerType
  segment?: string
  source?: string
  organization_name?: string
  legal_name?: string
  trading_name?: string
  registration_number?: string
  tax_pin?: string
  industry?: string
  organization_size?: string
  first_name?: string
  middle_name?: string
  last_name?: string
  display_name?: string
  id_number?: string
  date_of_birth?: string
  gender?: string
  occupation?: string
  website?: string
  description?: string
  primary_email?: string
  primary_phone?: string
  alternative_phone?: string
  address?: string
  country?: string
  state?: string
  city?: string
}

export interface Paginated<T> {
  data: T[]
  total: number
  page: number
  page_size: number
}

export interface Contact {
  id: string
  customer_id: string
  first_name: string
  last_name: string
  job_title: string
  department: string
  email: string
  phone: string
  alternative_phone: string
  is_primary: boolean
  communication_preference: string
  notes: string
  status: "active" | "inactive"
  created_at: string
}

export interface ContactInput {
  first_name: string
  last_name: string
  job_title?: string
  department?: string
  email?: string
  phone: string
  alternative_phone?: string
  communication_preference?: string
  notes?: string
}

export interface Tag {
  id: string
  name: string
}

export interface CustomerNote {
  id: string
  customer_id: string
  author_name?: string
  body: string
  created_at: string
}

// --- Communications (Activity Timeline) ---

export type CommunicationType =
  | "call"
  | "email"
  | "sms"
  | "whatsapp"
  | "meeting"
  | "note"
  | "task_followup"
  | "system_message"
export type CommunicationDirection = "incoming" | "outgoing" | "internal"
export type CommunicationStatus = "draft" | "sent" | "delivered" | "failed" | "completed"

export interface Communication {
  id: string
  customer_id: string
  customer_name?: string
  contact_id?: string
  contact_name?: string
  communication_type: CommunicationType
  direction: CommunicationDirection
  subject: string
  message_body: string
  status: CommunicationStatus
  communication_date: string
  follow_up_required: boolean
  follow_up_date?: string
  created_by_name?: string
  assigned_to_name?: string
  created_at: string
}

export interface CommunicationInput {
  contact_id?: string
  communication_type: CommunicationType
  direction: CommunicationDirection
  subject?: string
  message_body?: string
  status?: CommunicationStatus
  communication_date?: string
  follow_up_required?: boolean
  follow_up_date?: string
  assigned_to?: string
}

// --- Platform branding ---

export interface Branding {
  app_name: string
  tagline: string
  logo_url: string
  icon_url: string
}

// --- Clients module ---
// A "client" is a person or company the tenant does business *for* — kept as
// a distinct entity from Customer (the general CRM directory) since the two
// modules serve different workflows.

export type ClientType = "person" | "company"
export type ClientIdType = "id" | "passport"

export interface Client {
  id: string
  client_type: ClientType
  display_name: string
  first_name: string
  middle_name: string
  last_name: string
  id_type: ClientIdType
  id_number: string
  company_name: string
  reg_number: string
  kra_pin: string
  email: string
  phone: string
  address: string
  notes: string
  company_client_id?: string
  company_client_name?: string
  code: string
  created_at: string
  created_by_name?: string
}

export interface ClientInput {
  client_type: ClientType
  first_name?: string
  middle_name?: string
  last_name?: string
  id_type?: ClientIdType
  id_number?: string
  company_name?: string
  reg_number?: string
  kra_pin?: string
  email?: string
  phone?: string
  address?: string
  notes?: string
  company_client_id?: string
  code?: string
}

// --- Partners module ---
// A "partner" is an external organisation the tenant collaborates with
// (a vendor / service provider), with its own branches, contact people,
// requirements and appendix templates.

export type PartnerType =
  | "bank"
  | "microfinance"
  | "sacco"
  | "insurer"
  | "law_firm"
  | "developer"
  | "government"
  | "company"
  | "individual"
  | "other"
export type PartnerStatus = "active" | "inactive"

export interface Partner {
  id: string
  name: string
  logo_url: string
  type: PartnerType
  industry: string
  partnership_model: string
  status: PartnerStatus
  address: string
  town: string
  country: string
  contact_name: string
  contact_title: string
  work_email: string
  phone_mobile: string
  phone_office: string
  notes: string
  code: string
  created_at: string
  created_by_name?: string
}

export interface PartnerInput {
  name: string
  logo_url?: string
  type?: PartnerType
  industry?: string
  partnership_model?: string
  status?: PartnerStatus
  address?: string
  town?: string
  country?: string
  contact_name?: string
  contact_title?: string
  work_email?: string
  phone_mobile?: string
  phone_office?: string
  notes?: string
  code?: string
}

export interface PartnerBranch {
  id: string
  partner_id: string
  name: string
  town: string
  phone: string
  email: string
  created_at: string
  created_by_name?: string
}

export interface PartnerBranchInput {
  name: string
  town?: string
  phone?: string
  email?: string
}

export type PreferredChannel = "email" | "phone" | "whatsapp"

export interface PartnerContact {
  id: string
  partner_id: string
  first_name: string
  middle_name: string
  last_name: string
  title: string
  email: string
  phone: string
  whatsapp: string
  preferred_channel: PreferredChannel
  is_active: boolean
  inactive_reason: string
  created_at: string
  created_by_name?: string
}

export interface PartnerContactInput {
  first_name: string
  middle_name?: string
  last_name?: string
  title?: string
  email?: string
  phone?: string
  whatsapp?: string
  preferred_channel?: PreferredChannel
  is_active?: boolean
  inactive_reason?: string
}

export type PartnerRequirementKind = "check" | "appendix"

export interface PartnerRequirement {
  id: string
  partner_id: string
  label: string
  detail: string
  kind: PartnerRequirementKind
  sort_order: number
}

export interface PartnerRequirementInput {
  label: string
  detail?: string
  kind: PartnerRequirementKind
  sort_order?: number
}

export type AppendixFieldType = "text" | "textarea" | "checkbox"

export interface AppendixField {
  label: string
  type: AppendixFieldType
}

export interface PartnerAppendixTemplate {
  id: string
  partner_id: string
  name: string
  description: string
  fields: AppendixField[]
  sort_order: number
}

export interface PartnerAppendixTemplateInput {
  name: string
  description?: string
  fields: AppendixField[]
  sort_order?: number
}
