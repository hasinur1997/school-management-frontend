/**
 * Promotion contract (task 4.5), implemented against the live Laravel API
 * (`PromotionController`, `PromotionService`, `PromotionResource`,
 * `docs/api/promotions.md` in the backend).
 *
 * Eligibility and the resolved next class are **server-owned**: the preview
 * reports who moves up (published + passed annual result), who is held (with a
 * reason), and the next class. The client only reflects those, then confirms
 * and triggers bulk/individual moves.
 *
 * Id note: the preview returns the student's `public_id` hash as `student_id`
 * (like every other API resource), so the client links to the student and posts
 * it straight back. `to_class.id` is the raw numeric class id (used only for
 * display); the client picks the actual target class via the hashed selector.
 * Every id the client sends back is normalized by the backend's
 * `ResolvePublicIds` middleware.
 *
 * Endpoints:
 *   - `GET  /promotions/preview` — eligible vs held for a (session, class)
 *   - `POST /promotions/bulk`    — promote a whole class to the target session
 *   - `POST /promotions/individual` — move/override one student
 *   - `GET  /promotions`         — paginated history
 */

import type { PaginationMeta } from "./api"

export interface PromotionPreviewParams {
  session_id: string | null
  class_id: string | null
  /** Screen-local branch filter (super admin); overrides the active branch. */
  branch_id?: string | null
}

/** Why a student is held back — server-decided, never recomputed client-side. */
export type PromotionHoldReason = "failed" | "no_result" | "tc"

export interface PromotionEligibleStudent {
  /** Numeric student id from the preview; sent back as `student_id`. */
  student_id: number | string
  name_en: string | null
  roll_no: number | string | null
  annual_gpa: string | number | null
}

export interface PromotionHeldStudent {
  student_id: number | string
  name_en: string | null
  reason: PromotionHoldReason | string
}

/** The resolved next class (`numeric_level + 1`); null for the top class. */
export interface PromotionNextClass {
  id: number | string
  name: string | null
}

export interface PromotionPreview {
  to_class: PromotionNextClass | null
  eligible: PromotionEligibleStudent[]
  not_eligible: PromotionHeldStudent[]
}

export type RollStrategy = "by_merit" | "keep"

export interface PromotionBulkInput {
  from_session_id: string
  from_class_id: string
  to_session_id: string
  to_section_id: string
  roll_strategy: RollStrategy
  /**
   * Optional subset for "promote selected": only these students of the class
   * are promoted. Omit to promote the whole eligible cohort.
   */
  student_ids?: Array<string | number>
}

export interface PromotionBulkSummary {
  promoted: number
  held: number
}

export interface PromotionIndividualInput {
  student_id: number | string
  to_session_id: string
  to_class_id: string
  to_section_id: string
  roll_no: number
}

/** The promotion record returned by an individual move. */
export interface PromotionMoveResult {
  student: {
    id: number | string
    name_en: string | null
    admission_no?: string | null
  }
  from: { class: string | null; session?: string | null }
  to: { class: string | null; session?: string | null; roll_no?: number | null }
  type: string
}

// ---------------------------------------------------------------------------
// History (GET /promotions)
// ---------------------------------------------------------------------------

export type PromotionType = "bulk" | "individual"

export interface PromotionRun {
  id: string
  student: { id: string; name_en: string | null }
  from: { class: string | null }
  to: { class: string | null }
  type: PromotionType | string
  promoted_at: string | null
}

export interface PromotionHistoryParams {
  session_id?: string | null
  class_id?: string | null
  type?: PromotionType | "all"
  page?: number
  per_page?: number
}

export interface PromotionHistoryResult {
  data: PromotionRun[]
  meta: PaginationMeta | undefined
}
