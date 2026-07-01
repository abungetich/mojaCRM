// Shared option lists for the Partners module — kept separate from the form
// component so files that only import components stay Fast-Refresh friendly.

export const PARTNER_TYPES = [
  { value: "bank", label: "Bank" },
  { value: "microfinance", label: "Microfinance" },
  { value: "sacco", label: "SACCO" },
  { value: "insurer", label: "Insurer" },
  { value: "law_firm", label: "Law firm" },
  { value: "developer", label: "Developer" },
  { value: "government", label: "Government" },
  { value: "company", label: "Company" },
  { value: "individual", label: "Individual" },
  { value: "other", label: "Other" },
] as const

export const partnerTypeLabel = (t?: string) => PARTNER_TYPES.find((x) => x.value === t)?.label ?? ""

export const PARTNER_INDUSTRIES = [
  "Banking & Finance",
  "Legal",
  "Construction",
  "Government",
  "Energy",
  "Agriculture",
  "Manufacturing",
  "Retail",
  "Transport & Logistics",
  "Technology",
  "Healthcare",
  "Education",
  "Hospitality",
  "NGO",
]

export const PARTNERSHIP_MODELS = ["Strategic", "Referral", "Service Provider", "Technology", "Financial"]
