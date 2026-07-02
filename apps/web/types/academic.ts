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
  // Ids are opaque `public_id` hashes (strings), not numeric primary keys.
  id: string
  name: string
  /** Whether this is the active session (used to default selectors elsewhere). */
  is_current?: boolean
  start_date?: string | null
  end_date?: string | null
}

/** `GET /classes` — a class/grade. */
export interface SchoolClass {
  id: string
  name: string
  /** Grade level 1–12; the ordinal used for promotion ordering, unique per branch. */
  numeric_level?: number | null
  /** Owning branch — read defensively; used to prefill the edit form. */
  branch_id?: string | null
}

/** `GET /classes/{class}/sections` — a section within a class. */
export interface Section {
  id: string
  name: string
  class_id?: string
  capacity?: number | null
}

/** `GET /classes/{class}/subjects` — a subject taught in a class. */
export interface Subject {
  id: string
  name: string
  code?: string | null
  class_id?: string
}

/**
 * `GET /teacher-assignments` — a teacher assigned to a class (task 2.3). Covers
 * both class-teacher (no subject) and subject-teacher (with a subject) records.
 * Foreign keys identify the relation; the optional `*_name` fields are the
 * expanded labels the list endpoint typically returns and are read defensively
 * (falling back to `#id` when absent — see `assignments-manager.tsx`).
 */
export interface TeacherAssignment {
  id: string
  teacher_id: string
  class_id: string
  section_id?: string | null
  subject_id?: string | null
  session_id?: string | null
  /** Flat expanded labels — present when the API resolves them inline. */
  teacher_name?: string | null
  class_name?: string | null
  section_name?: string | null
  subject_name?: string | null
  session_name?: string | null
  /**
   * Nested relations — the standard Laravel resource shape when the API expands
   * the related models instead of (or alongside) the flat `*_name` labels. Read
   * defensively via `assignmentLabel`; `class` may arrive under either key.
   */
  teacher?: { id: string; name?: string | null; full_name?: string | null } | null
  class?: { id: string; name?: string | null } | null
  school_class?: { id: string; name?: string | null } | null
  section?: { id: string; name?: string | null } | null
  subject?: { id: string; name?: string | null } | null
  session?: { id: string; name?: string | null } | null
}

/**
 * Resolve a teacher-assignment's display labels from whichever shape the API
 * returns — flat `*_name` first, then the nested relation object, then a
 * `#id` fallback (or `null` for the optional section/subject so the UI can show
 * a dash). Keeps the list/table reads identical regardless of contract shape.
 */
export function assignmentLabels(a: TeacherAssignment) {
  const teacher =
    a.teacher_name ||
    a.teacher?.full_name ||
    a.teacher?.name ||
    `Teacher #${a.teacher_id}`
  const klass =
    a.class_name || a.class?.name || a.school_class?.name || `Class #${a.class_id}`
  const section = a.section_name || a.section?.name || null
  const subject = a.subject_name || a.subject?.name || null
  const session = a.session_name || a.session?.name || null
  return { teacher, class: klass, section, subject, session }
}
