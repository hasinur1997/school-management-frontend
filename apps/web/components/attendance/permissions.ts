/**
 * Student attendance permission slugs from the real backend attendance routes.
 * `attendance.create` gates the entry sheet and bulk save; `attendance.update`
 * gates single-record corrections; `attendance.view` is for read sheets.
 */
export const ATTENDANCE_CREATE = "attendance.create"
export const ATTENDANCE_UPDATE = "attendance.update"
export const ATTENDANCE_VIEW = "attendance.view"
