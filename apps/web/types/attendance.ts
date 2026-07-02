/**
 * Student attendance contracts (task 3.1).
 *
 * Implemented against the real backend (`~/Herd/app-api`): `GET
 * /attendance/sheet` returns the active roster for one class/section/date with
 * existing marks, and `POST /attendance` bulk-upserts that date's marks. The
 * sheet resource returns enrollment public ids; the backend's public-id
 * middleware resolves nested `records[].enrollment_id` before validation.
 */

export const ATTENDANCE_STATUSES = [
  "present",
  "absent",
  "late",
  "leave",
] as const

export type AttendanceStatusValue = (typeof ATTENDANCE_STATUSES)[number]

export interface AttendanceSheetStudent {
  enrollment_id: string
  /** The student's public id, for linking to the student detail page. */
  student_id?: string | null
  roll_no: string | number | null
  name_en: string | null
  /** The row's section name — labels students on a whole-class roster. */
  section?: string | null
  photo_url: string | null
  status: AttendanceStatusValue | null
  /** When the mark was last recorded (ISO), or null if not yet taken. */
  recorded_at?: string | null
  /** Name of the user (teacher/admin) who recorded the mark, or null. */
  recorded_by?: string | null
  /** Recorder's teacher public id when the recorder is a teacher, else null. */
  recorded_by_teacher_id?: string | null
  /** Recorder's user public id, for linking to the user profile, else null. */
  recorded_by_user_id?: string | null
}

export interface AttendanceSheet {
  date: string
  class: string | null
  section: string | null
  students: AttendanceSheetStudent[]
}

export interface AttendanceSheetParams {
  // Class/section are opaque `public_id` hashes resolved server-side.
  class_id?: string | null
  section_id?: string | null
  date?: string | null
}

export interface AttendanceEntryRecord {
  enrollment_id: string
  status: AttendanceStatusValue
}

export interface AttendanceBulkInput {
  /** Required when no section is given (whole-class "all sections" save). */
  class_id?: string | null
  /** Omitted, the save spans the whole class. */
  section_id?: string | null
  date: string
  records: AttendanceEntryRecord[]
}

export interface AttendanceBulkResult {
  saved: number
}

export interface AttendanceRecord {
  id: string
  enrollment_id?: string | null
  roll_no?: string | number | null
  name_en?: string | null
  section?: string | null
  date: string
  status: AttendanceStatusValue
  recorded_by?: string | null
}

/**
 * Filters for the browse listing `GET /attendance` (task 3.2). All optional;
 * the class monthly sheet pages through it scoped to a class/section.
 */
export interface AttendanceListParams {
  class_id?: string | null
  section_id?: string | null
  date?: string | null
  status?: AttendanceStatusValue | null
  page?: number
  per_page?: number
}

/**
 * Monthly attendance contracts (task 3.2): `GET /students/{id}/attendance` and
 * `GET /me/attendance` return the SQL-aggregated summary plus the ordered list
 * of recorded days. Totals are computed by the API — never re-derived client
 * side (`feature-specs/10`, Rules).
 */
export interface MonthlyAttendanceSummary {
  present: number
  absent: number
  late: number
  leave: number
  working_days: number
}

export interface MonthlyAttendanceDay {
  date: string
  status: AttendanceStatusValue
}

export interface MonthlyAttendance {
  month: number
  year: number
  summary: MonthlyAttendanceSummary
  days: MonthlyAttendanceDay[]
}

/** Month/year query for the monthly endpoints; both default to the current. */
export interface MonthlyAttendanceParams {
  month: number
  year: number
}

/**
 * One row of the class monthly sheet: a student and their per-day statuses for
 * the month, keyed by `YYYY-MM-DD`. Reshaped from `GET /attendance` records —
 * no totals are computed.
 */
export interface ClassAttendanceRow {
  enrollment_id: string
  roll_no: string | number | null
  name_en: string | null
  /** Section name, shown when the sheet spans a whole class (no section filter). */
  section: string | null
  /** date (`YYYY-MM-DD`) → status for the days a mark exists. */
  marks: Record<string, AttendanceStatusValue>
}

/** The assembled class monthly sheet returned by `useClassAttendanceMonth`. */
export interface ClassAttendanceMonth {
  month: number
  year: number
  /** Calendar day numbers (1…N) of the month, the sheet's columns. */
  days: number[]
  rows: ClassAttendanceRow[]
  /** True when paging hit the safety cap and older records were not scanned. */
  truncated: boolean
}

export function attendanceStatusLabel(status: AttendanceStatusValue): string {
  switch (status) {
    case "present":
      return "Present"
    case "absent":
      return "Absent"
    case "late":
      return "Late"
    case "leave":
      return "Leave"
  }
}
