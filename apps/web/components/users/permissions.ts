/**
 * Viewing another user's account/profile is part of the access-control surface,
 * which is gated by `role.manage` (super admin only). The "recorded by" link on
 * the attendance roster and the `/users/[id]` route both use this; viewers
 * without it see the recorder name as plain text instead of a link.
 */
export const USER_VIEW = "role.manage"
