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
