/**
 * Academic-structure contract types (task 2.1). These are the dropdown sources
 * reused across attendance, marks, promotion, fees, and reports.
 *
 * The backend contract `docs/api/academic-structure.md` is absent from this repo
 * (see the progress tracker's note); these shapes follow the documented envelope
 * conventions and the field names are read defensively at the components. Each
 * interface describes one unwrapped `data` item from its read endpoint.
 */

/** `GET /sessions` — an academic session/year. */
export interface AcademicSession {
  id: number
  name: string
  /** Whether this is the active session (used to default selectors elsewhere). */
  is_current?: boolean
  start_date?: string | null
  end_date?: string | null
}

/** `GET /classes` — a class/grade. */
export interface SchoolClass {
  id: number
  name: string
  code?: string | null
  /** Ordinal used for promotion ordering; not needed for the selector. */
  numeric_value?: number | null
}

/** `GET /classes/{class}/sections` — a section within a class. */
export interface Section {
  id: number
  name: string
  class_id?: number
  capacity?: number | null
}

/** `GET /classes/{class}/subjects` — a subject taught in a class. */
export interface Subject {
  id: number
  name: string
  code?: string | null
  class_id?: number
}

/**
 * `GET /teacher-assignments` — a teacher assigned to a class (task 2.3). Covers
 * both class-teacher (no subject) and subject-teacher (with a subject) records.
 * Foreign keys identify the relation; the optional `*_name` fields are the
 * expanded labels the list endpoint typically returns and are read defensively
 * (falling back to `#id` when absent — see `assignments-manager.tsx`).
 */
export interface TeacherAssignment {
  id: number
  teacher_id: number
  class_id: number
  section_id?: number | null
  subject_id?: number | null
  session_id?: number | null
  teacher_name?: string | null
  class_name?: string | null
  section_name?: string | null
  subject_name?: string | null
  session_name?: string | null
}
