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
