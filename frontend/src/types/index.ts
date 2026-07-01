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
