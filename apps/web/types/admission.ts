/**
 * Public admission contract types (task 2.5). The standalone, unauthenticated
 * admission form consumes a small set of public endpoints; these shapes mirror
 * the documented envelope conventions and the ticket's field specification.
 *
 * The backend contract `docs/api/admissions.md` is absent from this repo (see
 * the progress tracker), so optional/relation fields are read defensively at the
 * call sites and the field map follows the ticket exactly.
 */

/** `GET /public/settings` → a class a visitor can apply for (nested under its branch). */
export interface PublicClass {
  id: number
  name: string
}

/** `GET /public/settings` → a branch a visitor can apply to, with its classes nested. */
export interface PublicBranch {
  id: number
  name: string
  code?: string | null
  classes: PublicClass[]
}

/**
 * `GET /public/settings` — the public configuration the admission form needs:
 * the branch options (each carrying its classes), whether an admission payment
 * is collected, and how many payment attempts are allowed before giving up.
 */
export interface PublicSettings {
  branches: PublicBranch[]
  /** Whether an admission fee/invoice is created and must be paid online. */
  admission_payment_enabled: boolean
  /** Max online-payment attempts before the flow shows a terminal failure. */
  payment_retry_limit: number
  /** Optional school identity for the standalone header. */
  school_name?: string | null
  school_logo?: string | null
}

/** One previous-education row (`previous_educations[]`). All optional unless the row is filled. */
export interface PreviousEducationInput {
  exam_name: string
  institution_name: string
  gpa: string
  passing_year: string
  board_roll: string
  board_reg_no: string
}

/**
 * The complete admission application the wizard collects. Submitted as
 * multipart/form-data (`photo` + `documents[]`); see `build-form-data.ts`.
 */
export interface AdmissionApplicationInput {
  // Step 1 — branch & class
  branch_id: number | null
  desired_class_id: number | null

  // Step 2 — student identity
  name_bn: string
  name_en: string
  date_of_birth: string
  birth_reg_no: string
  religion: string
  nationality: string
  caste: string

  // Step 3 — guardian info
  father_name_bn: string
  father_name_en: string
  father_nid: string
  father_mobile: string
  mother_name_bn: string
  mother_name_en: string
  mother_nid: string
  mother_mobile: string

  // Step 4 — present + permanent address (cascading division → district →
  // upazila → post office, single set each; no bn/en split)
  present_division: string
  present_district: string
  present_upazila: string
  present_post_office: string
  present_village: string
  permanent_division: string
  permanent_district: string
  permanent_upazila: string
  permanent_post_office: string
  permanent_village: string

  // Step 5 — previous education (optional)
  previous_educations: PreviousEducationInput[]

  // Step 6 — photo & documents
  photo: File | null
  documents: File[]
}

/** `POST /public/admissions` → created-application response. */
export interface AdmissionSubmitResponse {
  application_no: string
  /** Present only when an admission payment is required (settings flag on). */
  invoice_id?: number | string | null
}

/**
 * `GET /public/admissions/{application_no}/status` — the authoritative status
 * the confirmation/payment screens render (never the redirect query params).
 */
export interface AdmissionStatus {
  application_no: string
  status: string
  /** Payment sub-status when a payment is involved. */
  payment_status?: string | null
  invoice_id?: number | string | null
  /** Online-payment attempts so far; caps retries against the settings limit. */
  payment_attempts?: number | null
  student_name?: string | null
  /** Server-generated application PDF, when the API returns a direct URL. */
  pdf_url?: string | null

  // Applicant detail surfaced by the public status-check page (task 2.9). All
  // optional / read defensively — the contract (`docs/api/admissions.md`) is
  // absent, so the field map follows the ticket exactly.
  name_bn?: string | null
  name_en?: string | null
  date_of_birth?: string | null
  birth_reg_no?: string | null
  religion?: string | null
  nationality?: string | null
  caste?: string | null

  // Branch / class / session / photo arrive in either the flat `*_name` shape or
  // the standard Laravel nested-relation shape (the API expands related models,
  // same as teacher assignments). Read both via the resolvers below.
  branch_name?: string | null
  class_name?: string | null
  desired_class_name?: string | null
  session_name?: string | null
  branch?: { id?: number; name?: string | null; code?: string | null } | null
  class?: { id?: number; name?: string | null } | null
  school_class?: { id?: number; name?: string | null } | null
  desired_class?: { id?: number; name?: string | null } | null
  session?: { id?: number; name?: string | null } | null
  academic_session?: { id?: number; name?: string | null } | null

  /** Applicant photo; may be relative (prefix with the API base URL). */
  photo_url?: string | null
  photo?: string | null
  photo_path?: string | null
  applicant_photo_url?: string | null
  student_photo_url?: string | null
}

/** Branch display name, from the flat label or the nested relation. */
export function statusBranchName(s: AdmissionStatus): string | null {
  return s.branch_name || s.branch?.name || null
}

/** Desired-class display name, from the flat label or any nested relation key. */
export function statusClassName(s: AdmissionStatus): string | null {
  return (
    s.class_name ||
    s.desired_class_name ||
    s.class?.name ||
    s.school_class?.name ||
    s.desired_class?.name ||
    null
  )
}

/** Academic-session label, from the flat label or the nested relation. */
export function statusSessionName(s: AdmissionStatus): string | null {
  return s.session_name || s.session?.name || s.academic_session?.name || null
}

/** Raw applicant photo path (may be relative), from whichever key the API used. */
export function statusPhotoUrl(s: AdmissionStatus): string | null {
  return (
    s.photo_url ||
    s.applicant_photo_url ||
    s.student_photo_url ||
    s.photo ||
    s.photo_path ||
    null
  )
}

/** `POST /invoices/{invoice_id}/payments/online` → SSLCommerz hosted-checkout URL. */
export interface PaymentInitiateResponse {
  /** The gateway URL to redirect the browser to. Read defensively. */
  redirect_url?: string | null
  gateway_url?: string | null
  url?: string | null
  payment_url?: string | null
  GatewayPageURL?: string | null
}

/** Pull the redirect URL out of whichever key the API used. */
export function paymentRedirectUrl(
  res: PaymentInitiateResponse | null | undefined
): string | null {
  return (
    res?.redirect_url ||
    res?.gateway_url ||
    res?.payment_url ||
    res?.url ||
    res?.GatewayPageURL ||
    null
  )
}

/** Status values that mean "the visitor still needs to pay". */
const PENDING_PAYMENT = new Set([
  "pending_payment",
  "payment_pending",
  "awaiting_payment",
  "unpaid",
])

/** Status values that mean a payment attempt failed or was abandoned. */
const FAILED_PAYMENT = new Set([
  "payment_failed",
  "payment_abandoned",
  "payment_cancelled",
  "payment_canceled",
  "failed",
])

export type PaymentPhase = "pending" | "failed" | "settled"

/**
 * Categorize an admission status for the payment flow. Anything that is neither
 * "still owes payment" nor "a failed attempt" is treated as settled (paid /
 * submitted / under review), so the confirmation screen shows success.
 */
export function paymentPhaseOf(status: AdmissionStatus | null | undefined): PaymentPhase {
  const value = (status?.payment_status || status?.status || "").trim().toLowerCase()
  if (FAILED_PAYMENT.has(value)) return "failed"
  if (PENDING_PAYMENT.has(value)) return "pending"
  return "settled"
}
