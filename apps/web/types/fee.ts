/**
 * Fee-structure contract types (task F-5.1, backend 10.1).
 *
 * A fee structure is a **named** fee defined per (branch, session, class); a
 * class may hold several in one session (e.g. "Tuition Fee" monthly, "Admission
 * Fee" one-time). `branch_id` is stamped server-side by `BelongsToBranch` and is
 * never sent from the client. Money is the decimal **string** the API returns
 * (`"1500.00"`) and is never parsed into a float for arithmetic
 * (`code-standards.md`, UI Conventions).
 *
 * Ids are opaque `public_id` hashes (strings). The `ResolvePublicIds` middleware
 * translates the `session_id`/`class_id` we send back into internal keys, so the
 * client only ever deals in the hashes the academic selectors expose.
 */

/** How often a fee applies. Drives which fees invoice generation picks up (10.2). */
export type FeeType = "monthly" | "onetime"

/** Human labels for each fee type (the form/list never invent these). */
export const FEE_TYPE_LABELS: Record<FeeType, string> = {
  monthly: "Monthly",
  onetime: "One-time",
}

/** Fee type → badge tone (`status-badge.tsx`). */
export const FEE_TYPE_TONE: Record<FeeType, "info" | "neutral"> = {
  monthly: "info",
  onetime: "neutral",
}

/** Type options in selector order (filters + create form). */
export const FEE_TYPES: FeeType[] = ["monthly", "onetime"]

/** A session or class a fee is scoped to — `id` is a `public_id` hash. */
export interface FeeRef {
  id: string
  name: string
}

/**
 * `GET /fee-structures` — one row. `session`/`class` are eager-loaded for
 * display; `session_id`/`class_id` are the hashes the edit form pre-fills.
 */
export interface FeeStructure {
  id: string
  name: string
  description?: string | null
  fee_type: FeeType
  session_id?: string | null
  class_id?: string | null
  /** Eager-loaded session (name for display). */
  session?: FeeRef | null
  /** Eager-loaded class (name for display). */
  class?: FeeRef | null
  /** Branch the fee belongs to (`public_id` hash); server-stamped. */
  branch_id?: string | null
  /** Decimal string, e.g. `"1500.00"`. Never a float. */
  amount: string
}

/** Filter for the fee type, with an `all` pass-through (no filter sent). */
export type FeeTypeFilter = FeeType | "all"

/** Params the list screen folds into the query (and key). */
export interface FeeStructureListParams {
  session_id?: string | null
  class_id?: string | null
  fee_type?: FeeTypeFilter
  /** Screen-local branch filter (super admin); overrides the active branch. */
  branch_id?: string | null
  page?: number
  per_page?: number
}

/**
 * `POST /fee-structures` body. `branch_id` is never sent — the API stamps it
 * from the active branch context (`BelongsToBranch`).
 */
export interface FeeStructureInput {
  name: string
  description?: string | null
  fee_type: FeeType
  session_id: string
  class_id: string
  /** Decimal string, ≥ 0, 2dp. */
  amount: string
}

/**
 * `PUT /fee-structures/{id}` body. Every field is editable — name, description,
 * fee_type, session, class, and amount — with only the (session, class, name)
 * uniqueness enforced server-side. Amount edits affect only *future* invoice
 * generation; already-generated invoices keep their copied amount.
 */
export interface FeeStructureUpdateInput {
  name?: string
  description?: string | null
  fee_type?: FeeType
  session_id?: string
  class_id?: string
  amount?: string
}
