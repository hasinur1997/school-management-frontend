/**
 * Permission that gates the fee-structures module (task F-5.1, backend 10.1).
 *
 * The backend guards the full fee-structure CRUD — including the list — with a
 * single `fee.manage` slug (`routes/api/v1/fees.php`). The API's `403` stays the
 * real boundary — gating only hides what the user can't do.
 */
export const FEE_MANAGE = "fee.manage"
