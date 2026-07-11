/**
 * Permissions that gate the finance module (tasks F-5.4 / F-5.5, backend 11.x).
 *
 * The backend guards the income ledger with `income.manage`, the expense ledger
 * with `expense.manage`, and the shared category CRUD with either (`income.manage
 * | expense.manage`, `routes/api/v1/accounting.php`). The API's `403` stays the
 * real boundary — gating only hides what the user can't do.
 */
export const INCOME_MANAGE = "income.manage"
export const EXPENSE_MANAGE = "expense.manage"
