/**
 * Student domain types (task 2.7).
 *
 * Implemented against the real backend (`~/Herd/app-api`): `StudentController`
 * with `StudentListResource` (compact rows), `StudentResource` (full bilingual
 * profile + embedded enrollment history) and `EnrollmentResource` (the dedicated
 * `GET /students/{id}/enrollments` rows). Resource ids are the model `public_id`
 * (an opaque hash string), so a student id is a `string` throughout.
 *
 * Status is the `StudentStatus` enum — exactly `active` / `inactive` / `tc`. A
 * `tc` student has been issued a transfer certificate (Documents 6.2) and is
 * excluded from active operations by the API; we only reflect the status, never
 * special-case the exclusion client-side.
 */

/** The student lifecycle status (`App\Enums\StudentStatus`). */
export type StudentStatusValue = "active" | "inactive" | "tc"

/** List status filter — the three statuses plus "all" (sends no filter). */
export type StudentStatusFilter = "all" | StudentStatusValue

/**
 * A compact student row for the index listing (`StudentListResource`). class /
 * section / roll resolve from the current-session enrollment and are null when
 * the student has no current enrollment.
 */
export interface StudentListItem {
  id: string
  admission_no: string | null
  name_en: string | null
  name_bn: string | null
  class: string | null
  section: string | null
  roll_no: string | number | null
  status: StudentStatusValue
  photo_url: string | null
  deleted_at?: string | null
}

/** A `{ id, name }` reference as the profile resource expands related records. */
export interface NamedRef {
  id: string
  name: string | null
}

/** One enrollment row embedded in the profile (`StudentResource.enrollments`). */
export interface StudentEnrollmentSummary {
  id: string
  session: NamedRef | null
  class: NamedRef | null
  section: NamedRef | null
  roll_no: string | number | null
  status: string
}

/** Enrollment lifecycle status (`App\Enums\EnrollmentStatus`). */
export type EnrollmentStatusValue = "active" | "promoted" | "failed" | "tc"

/**
 * A single class-history row from the dedicated enrollments endpoint
 * (`EnrollmentResource`) — session / class / section flattened to names, each
 * paired with its public id so the row can prefill the academic selects on edit.
 */
export interface StudentEnrollment {
  id: string
  session: string | null
  session_id: string | null
  class: string | null
  class_id: string | null
  section: string | null
  section_id: string | null
  roll_no: string | number | null
  status: string
}

/**
 * Editable enrollment fields (`UpdateEnrollmentRequest`,
 * `PUT /students/{id}/enrollments/{enrollmentId}`). Ids are sent as the related
 * records' public ids; the backend resolves and validates them branch-scoped.
 */
export interface EnrollmentUpdateInput {
  session_id: string
  class_id: string
  section_id: string
  roll_no: number
  status: EnrollmentStatusValue
}

/** The full student profile (`StudentResource`, `GET /students/{id}`). */
export interface Student {
  id: string
  user_id?: string | null
  application_id?: string | null
  admission_no: string | null
  /** Owning branch (only present when the profile eager-loads it). */
  branch?: NamedRef | null

  name_bn: string | null
  name_en: string | null
  student_email?: string | null

  father_name_bn: string | null
  father_name_en: string | null
  father_nid: string | null

  mother_name_bn: string | null
  mother_name_en: string | null
  mother_nid: string | null

  present_village: string | null
  present_post_office: string | null
  present_upazila: string | null
  present_district: string | null
  present_division: string | null

  permanent_village: string | null
  permanent_post_office: string | null
  permanent_upazila: string | null
  permanent_district: string | null
  permanent_division: string | null

  father_mobile: string | null
  mother_mobile: string | null
  father_email: string | null
  mother_email: string | null

  birth_reg_no: string | null
  date_of_birth: string | null
  religion: string | null
  nationality: string | null
  caste: string | null

  status: StudentStatusValue
  admitted_at: string | null
  photo_url: string | null

  enrollments?: StudentEnrollmentSummary[]
}

/**
 * Editable profile fields (`UpdateStudentRequest`). admission_no is an immutable
 * identity column — the API prohibits changing it (422), so it's never part of
 * the payload. birth_reg_no is editable (unique across students). status moves
 * through `PATCH /status`, not here.
 */
export interface StudentUpdateInput {
  name_bn: string
  name_en: string
  student_email?: string | null

  birth_reg_no: string

  father_name_bn: string
  father_name_en: string
  father_nid?: string | null

  mother_name_bn: string
  mother_name_en: string
  mother_nid?: string | null

  present_village: string
  present_post_office: string
  present_upazila: string
  present_district: string
  present_division: string

  permanent_village: string
  permanent_post_office: string
  permanent_upazila: string
  permanent_district: string
  permanent_division: string

  father_mobile: string
  mother_mobile?: string | null
  father_email?: string | null
  mother_email?: string | null

  date_of_birth: string
  religion: string
  nationality: string
  caste?: string | null
}

/**
 * Direct student-creation payload (`StoreStudentRequest`, `POST /students`) —
 * the office path that mints a student without an admission application. Carries
 * the full mutable profile (birth_reg_no required here), the initial enrollment
 * (academic ids sent as public-id hashes; roll numeric), an optional admission
 * number (auto-generated when blank), optional login emails for credential
 * delivery, the optional linked-parent box, and — for super admins only — the
 * target branch (also a public-id hash). The API stamps the branch from the
 * caller for everyone else.
 */
export interface StudentCreateInput {
  name_bn: string
  name_en: string
  student_email?: string | null

  birth_reg_no: string

  father_name_bn: string
  father_name_en: string
  father_nid?: string | null

  mother_name_bn: string
  mother_name_en: string
  mother_nid?: string | null

  present_village: string
  present_post_office: string
  present_upazila: string
  present_district: string
  present_division: string

  permanent_village: string
  permanent_post_office: string
  permanent_upazila: string
  permanent_district: string
  permanent_division: string

  father_mobile: string
  mother_mobile?: string | null
  father_email?: string | null
  mother_email?: string | null

  date_of_birth: string
  religion: string
  nationality: string
  caste?: string | null

  session_id: string
  class_id: string
  section_id: string
  roll_no: number

  admission_no?: string | null

  create_parent_account: boolean
  parent_relation?: "father" | "mother" | "guardian" | null
  parent_email?: string | null

  branch_id?: string
}

/** List filters → query params. */
export interface StudentListParams {
  search?: string
  status?: StudentStatusFilter
  class_id?: string | null
  section_id?: string | null
  session_id?: string | null
  page?: number
  per_page?: number
}

/** A student is a TC student (issued a transfer certificate). */
export function isTcStudent(status: StudentStatusValue): boolean {
  return status === "tc"
}

/** Display name — English name, then Bangla, then the admission no fallback. */
export function studentDisplayName(
  student: Pick<Student, "name_en" | "name_bn" | "admission_no" | "id">
): string {
  return (
    student.name_en ||
    student.name_bn ||
    student.admission_no ||
    `Student ${student.id}`
  )
}

/** Initials for the avatar fallback. */
export function studentInitials(
  student: Pick<Student, "name_en" | "name_bn" | "admission_no" | "id">
): string {
  const name = (student.name_en || student.name_bn || "").trim()
  const parts = name.split(/\s+/).filter(Boolean)
  if (parts.length === 0)
    return (student.admission_no || "S").slice(0, 2).toUpperCase()
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase()
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase()
}

/** Human label for a status value. */
export function studentStatusLabel(status: StudentStatusValue): string {
  if (status === "tc") return "TC"
  if (status === "inactive") return "Inactive"
  return "Active"
}
