/**
 * Finance contract types (task F-5.4, backend 11.1–11.3).
 *
 * Covers the manual **income** and **expense** ledgers plus the shared
 * **category** list they draw from. Every row is branch-isolated server-side
 * (`branch_id` is stamped by `BelongsToBranch`, never sent from the client); a
 * super admin scopes the whole module through the topbar branch switcher.
 *
 * Money is the decimal **string** the API returns (`"25000.00"`) and is never
 * parsed into a float for arithmetic or aggregation — totals come from the API
 * (`code-standards.md`, UI Conventions). Ids are opaque `public_id` hashes.
 */

/** Whether a category groups income or expense rows. */
export type CategoryType = "income" | "expense"

/** Human labels for each category type. */
export const CATEGORY_TYPE_LABELS: Record<CategoryType, string> = {
  income: "Income",
  expense: "Expense",
}

/** `GET /categories` — one row. Shared source for `CategorySelect`. */
export interface Category {
  id: string
  name: string
  type: CategoryType
}

/** Params the `CategorySelect`/category list folds into its query. */
export interface CategoryListParams {
  type?: CategoryType
  per_page?: number
}

/**
 * `GET /incomes` — one manual or system-generated income row.
 *
 * `is_system` marks a fee-payment income posted by the payments flow (task
 * 10.3); such rows are **read-only** — the API rejects edit/delete with `403`,
 * so the UI flags them and hides the row actions.
 */
export interface Income {
  id: string
  title: string
  /** Decimal string, e.g. `"25000.00"`. Never a float. */
  amount: string
  /** `YYYY-MM-DD`. */
  date: string
  /** Eager-loaded category id (`public_id` hash), or `null` when uncategorised. */
  category_id?: string | null
  description?: string | null
  /** True → system-generated fee income; immutable. */
  is_system: boolean
}

/**
 * `POST /incomes` body. `branch_id`/`created_by` are stamped server-side and
 * never sent. `category_id`, when given, must reference an **income**-type
 * category in the caller's branch (validated server-side → `422`).
 */
export interface IncomeInput {
  title: string
  /** Decimal string, ≥ 0, 2dp. */
  amount: string
  date: string
  category_id?: string | null
  description?: string | null
}

/** Params the income list screen folds into the query (and key). */
export interface IncomeListParams {
  category_id?: string | null
  /** Inclusive date-range bounds (`YYYY-MM-DD`). */
  from?: string | null
  to?: string | null
  search?: string | null
  page?: number
  per_page?: number
}

/** `GET /expenses` — one manual expense row. */
export interface Expense {
  id: string
  item_name: string
  /** Decimal string, e.g. `"8200.00"`. Never a float. */
  amount: string
  /** `YYYY-MM-DD`. */
  date: string
  category_id?: string | null
  description?: string | null
}

/**
 * `POST /expenses` body. `branch_id`/`created_by` stamped server-side.
 * `category_id`, when given, must reference an **expense**-type category in the
 * caller's branch (validated server-side → `422`).
 */
export interface ExpenseInput {
  item_name: string
  /** Decimal string, ≥ 0, 2dp. */
  amount: string
  date: string
  category_id?: string | null
  description?: string | null
}

/** Params the expense list screen folds into the query (and key). */
export interface ExpenseListParams {
  category_id?: string | null
  from?: string | null
  to?: string | null
  search?: string | null
  page?: number
  per_page?: number
}
