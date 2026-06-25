/**
 * Teacher attendance contracts (task 3.3).
 *
 * Implemented against the real backend (`~/Herd/app-api`
 * `TeacherAttendanceController` + `TeacherAttendanceResource`):
 *
 *   - `POST /teacher-attendance/check-in`  → self check-in from the request IP
 *     (the API validates it against the branch whitelist; a blocked IP is a 403
 *     whose `message` we surface verbatim).
 *   - `POST /teacher-attendance/check-out` → stamps check-out on today's record.
 *   - `GET  /me/teacher-attendance?month&year` → the caller's monthly history
 *     plus a SQL-aggregated status summary (`{ summary, records }`).
 *   - `GET  /teacher-attendance` → admin browse, paginated + filterable.
 *   - `PUT  /teacher-attendance/{id}` → admin correction (records `corrected_by`).
 *
 * A teacher's status set is the same present|late|absent|leave as a student's,
 * so we reuse `AttendanceStatusValue` / `attendanceStatusLabel` from
 * `./attendance` rather than redeclaring them.
 */

import type { AttendanceStatusValue } from "./attendance"

/** A `{ id, name }` reference as the resource expands the teacher / corrector. */
export interface TeacherAttendanceRef {
  id: string
  name: string
}

/** One teacher's daily attendance record. */
export interface TeacherAttendanceRecord {
  id: string
  date: string
  /** ISO timestamp of check-in, or null when not yet checked in. */
  check_in_at: string | null
  /** ISO timestamp of check-out, or null when not yet checked out. */
  check_out_at: string | null
  status: AttendanceStatusValue
  /** Present on the admin list; the teacher this record belongs to. */
  teacher?: TeacherAttendanceRef
  /** The admin who last corrected the record, when loaded; null if untouched. */
  corrected_by?: TeacherAttendanceRef | null
}

/** SQL-aggregated monthly status counts from `GET /me/teacher-attendance`. */
export interface TeacherAttendanceSummary {
  present: number
  late: number
  absent: number
  leave: number
}

/** The `{ summary, records }` payload of `GET /me/teacher-attendance`. */
export interface MyTeacherAttendance {
  summary: TeacherAttendanceSummary
  records: TeacherAttendanceRecord[]
}

/** Month/year query for the self history; both default to the current month. */
export interface TeacherAttendanceMonthParams {
  month: number
  year: number
}

/**
 * Filters for the admin browse `GET /teacher-attendance`. All optional; branch
 * isolation is automatic (records are scoped through the teacher), so these
 * only narrow the in-branch result set.
 */
export interface TeacherAttendanceListParams {
  /** Teacher public id (resolved to the integer key server-side). */
  teacher_id?: string | null
  date?: string | null
  month?: number | null
  year?: number | null
  status?: AttendanceStatusValue | null
  page?: number
  per_page?: number
}

/**
 * Body of an admin correction `PUT /teacher-attendance/{id}`. Every field is
 * optional; the API stamps `corrected_by` server-side and rejects a check-out
 * at or before check-in with a 422.
 */
export interface TeacherAttendanceCorrectionInput {
  status?: AttendanceStatusValue
  /** ISO datetime or null to clear; omit to leave unchanged. */
  check_in_at?: string | null
  check_out_at?: string | null
}
