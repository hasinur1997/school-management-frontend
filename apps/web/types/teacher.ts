/**
 * Teacher domain types (task 2.4) and the minimal selector source (task 2.3).
 *
 * The contract `docs/api/teachers.md` is absent from the repo (see the progress
 * tracker), so field names follow the documented Laravel conventions and are
 * read defensively at the boundary — `name`/`full_name` cover either label
 * shape, status is read from both `is_active` and a `status` string, and list
 * items reuse the same `Teacher` shape with most fields optional. Adjust the
 * field maps when the real contract lands.
 */

/**
 * Minimal teacher shape used as the dropdown source for the teacher-assignment
 * selectors (task 2.3). Kept narrow so the selector never depends on the full
 * profile fields.
 */
export interface TeacherOption {
  id: number
  name?: string | null
  full_name?: string | null
  employee_id?: string | null
}

/** A `{ id, name }` reference as the API expands related records. */
export interface NamedRef {
  id: number
  name: string
}

/**
 * One teaching assignment as surfaced on a teacher's profile — a class, with an
 * optional section, and an optional subject (absent subject = class-teacher).
 * Labels are expanded by the API; ids are the fallback.
 */
export interface TeacherAssignmentSummary {
  id?: number
  class_id: number
  section_id?: number | null
  subject_id?: number | null
  class_name?: string | null
  section_name?: string | null
  subject_name?: string | null
}

/**
 * A teacher record. Used for both the list rows and the detail view; list rows
 * carry a subset, so everything beyond the identity fields is optional.
 */
export interface Teacher {
  id: number
  name?: string | null
  full_name?: string | null
  email?: string | null
  phone?: string | null
  designation?: string | null
  employee_id?: string | null
  gender?: string | null
  address?: string | null
  joining_date?: string | null
  photo_url?: string | null
  /** Authoritative active flag; some payloads also send a `status` string. */
  is_active?: boolean | null
  status?: string | null
  branch_id?: number | null
  branch_name?: string | null
  /** Subjects this teacher teaches — objects or bare name strings. */
  subjects?: Array<NamedRef | string> | null
  /** Classes this teacher is assigned to — objects or bare name strings. */
  classes?: Array<NamedRef | string> | null
  /** Full assignment list (class + section + subject) for the detail view. */
  assignments?: TeacherAssignmentSummary[] | null
  created_at?: string | null
  updated_at?: string | null
}

/** One assignment row in the create/edit form payload. */
export interface TeacherAssignmentInput {
  class_id: number
  section_id?: number | null
  subject_id?: number | null
}

/**
 * Create payload. The API generates and dispatches credentials itself and, for
 * super-admin sessions, requires the target `branch_id` in the body (the active
 * branch is only attached as a query param, which create validation ignores).
 */
export interface TeacherInput {
  name: string
  email: string
  phone?: string | null
  designation?: string | null
  employee_id?: string | null
  gender?: string | null
  address?: string | null
  is_active: boolean
  /** Required for super admin on create; omitted for branch-scoped users. */
  branch_id?: number | null
  assignments: TeacherAssignmentInput[]
}

/**
 * Update payload — the API prohibits changing the login `email` (set once at
 * creation) and the `branch_id`, so both are excluded from `PUT /teachers/{id}`.
 */
export type TeacherUpdateInput = Omit<TeacherInput, "email" | "branch_id">

/** List filters → query params. */
export interface TeacherListParams {
  search?: string
  /** `"active"` | `"inactive"`; omitted for all. */
  status?: TeacherStatusFilter
  page?: number
  per_page?: number
}

export type TeacherStatusFilter = "all" | "active" | "inactive"

/** Resolve a teacher's active state from either representation. */
export function isTeacherActive(teacher: Teacher): boolean {
  if (typeof teacher.is_active === "boolean") return teacher.is_active
  if (typeof teacher.status === "string") {
    return teacher.status.trim().toLowerCase() === "active"
  }
  return true
}

/** Best-effort display name. */
export function teacherDisplayName(teacher: Teacher): string {
  return teacher.full_name || teacher.name || `Teacher #${teacher.id}`
}

/** Initials for the avatar fallback. */
export function teacherInitials(teacher: Teacher): string {
  const name = teacherDisplayName(teacher).replace(/#\d+$/, "").trim()
  const parts = name.split(/\s+/).filter(Boolean)
  if (parts.length === 0) return "T"
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase()
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase()
}

/** Normalise a subjects/classes list (objects or strings) to display names. */
export function namedList(
  value: Array<NamedRef | string> | null | undefined
): string[] {
  if (!Array.isArray(value)) return []
  return value
    .map((item) => (typeof item === "string" ? item : item?.name))
    .filter((name): name is string => typeof name === "string" && name.length > 0)
}
