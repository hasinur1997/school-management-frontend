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
  roll_no: string | number | null
  name_en: string | null
  photo_url: string | null
  status: AttendanceStatusValue | null
  /** When the mark was last recorded (ISO), or null if not yet taken. */
  recorded_at?: string | null
  /** Name of the user (teacher/admin) who recorded the mark, or null. */
  recorded_by?: string | null
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
  section_id: string
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
  date: string
  status: AttendanceStatusValue
  recorded_by?: string | null
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
