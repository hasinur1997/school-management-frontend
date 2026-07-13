/**
 * Documents module (feature-spec 17) — ID cards. PDFs are streamed by the API
 * and never rendered client-side (`code-standards.md`): a single card streams
 * inline; a class batch is queued, polled to done, then downloaded as one
 * merged PDF.
 *
 * Class/section/session ids carried here are the resource `public_id` hashes the
 * academic selectors emit — the API's `ResolvePublicIds` middleware translates
 * them to internal ids before validation, so they are sent through as-is.
 */

/** Lifecycle of a queued ID card batch (backend `IdCardBatchStatus`). */
export type IdCardBatchStatus = "processing" | "done" | "failed"

/** `POST /id-cards/batch` payload — a whole class, optionally one section. */
export interface IdCardBatchInput {
  class_id: string
  /** Omitted, the batch spans every section of the class. */
  section_id?: string | null
  session_id: string
}

/** `POST /id-cards/batch` → 202: the queued batch to poll. */
export interface IdCardBatchCreated {
  batch_id: string
  status: IdCardBatchStatus
}

/**
 * `GET /id-cards/batch/{batch}` poll response: always the status, plus the
 * authenticated download path once `done`, or the reason once `failed`.
 */
export interface IdCardBatchState {
  status: IdCardBatchStatus
  /** Present only when `status === "done"`. */
  url?: string
  /** Present only when `status === "failed"`. */
  message?: string
}

/** A batch status is terminal once it can no longer change (stop polling). */
export function isTerminalBatchStatus(status: IdCardBatchStatus): boolean {
  return status === "done" || status === "failed"
}

/**
 * Transfer certificates (task 6.2). Issuing a TC retires a student (status → tc,
 * enforced by the API across attendance/invoicing/promotion) and persists the
 * one stored legal PDF; the client only triggers the issue, then triggers +
 * downloads the streamed PDF (`GET /tcs/{tc}/pdf`) — the document is never
 * rendered client-side (`code-standards.md`). Irreversible status-wise, so the
 * issue action requires explicit confirmation.
 */

/** The compact student summary embedded on a TC (backend `StudentListResource`). */
export interface TcStudent {
  id: string
  admission_no: string | null
  name_en: string
  name_bn: string | null
  class: string | null
  section: string | null
  roll_no: number | null
  status: string
  photo_url: string | null
}

/** A transfer certificate (backend `TransferCertificateResource`). */
export interface TransferCertificate {
  id: string
  tc_no: string
  student: TcStudent
  reason: string
  /** `issue_date` as `YYYY-MM-DD`; null only if the record is malformed. */
  issue_date: string | null
  /**
   * The API path of the stored PDF (`/api/v1/tcs/{id}/pdf`). The PDF is fetched
   * by tc id through the shared client base instead — see `useDownloadTc`.
   */
  pdf_url: string
}

/** `POST /students/{id}/tc` payload — the required issue reason and date. */
export interface IssueTcInput {
  reason: string
  issue_date: string
}

/** `GET /tcs` filters: an issue-date window, free-text search, pagination. */
export interface TcListParams {
  search?: string
  from?: string | null
  to?: string | null
  page?: number
  per_page?: number
  /** Super-admin branch scope (folded into the query key). */
  branch_id?: string
}
