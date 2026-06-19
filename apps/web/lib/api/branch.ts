/**
 * Active-branch bridge between the app shell and the API client (task 1.5).
 *
 * Only super admin can switch branch context. The branch switcher pushes the
 * selected branch id in here; the request interceptor (see `client.ts`) then
 * forwards it to the API as the documented `branch_id` query param on every
 * call. `null` means "all branches" (consolidated) — nothing is sent — and is
 * also the permanent state for non-super-admin users, who must never send
 * `branch_id` (`code-standards.md`, Authorization). This module holds no auth
 * logic; it is a registration point so `lib/api` stays decoupled from the shell.
 */

let activeBranchId: number | null = null

/** Set the active branch (super admin only); `null` = all branches / none. */
export function setActiveBranchId(next: number | null): void {
  activeBranchId = next
}

/** Current active branch id, or `null` when consolidated / not super admin. */
export function getActiveBranchId(): number | null {
  return activeBranchId
}

/** Drop the active branch (e.g. on logout / user switch). */
export function clearActiveBranchId(): void {
  activeBranchId = null
}
