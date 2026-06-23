/**
 * Permissions that gate the parents admin module (task 2.8).
 *
 * The backend exposes every parent-management endpoint behind `parent.manage`.
 * `/me/students` is intentionally API role-gated instead because parents hold
 * no staff permissions.
 */
export const PARENT_MANAGE = "parent.manage"
