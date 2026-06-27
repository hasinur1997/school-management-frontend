/**
 * Exam contract types (task 4.1). The backend contract `docs/api/exams-marks.md`
 * is absent from this repo (see the progress tracker's note); these shapes
 * follow the documented envelope conventions and the live API
 * (`ExamController` + `ExamResource`): one exam per (session, class, type) tuple
 * in a branch, with a forward-only status lifecycle.
 *
 * Ids are opaque `public_id` hashes (strings), not numeric primary keys — the
 * `ResolvePublicIds` middleware translates the `session_id`/`class_id` we send
 * back into internal keys, so the client only ever deals in the hashes the
 * selectors expose.
 */

/** The three exams held per class per session. */
export type ExamType = "first_semester" | "second_semester" | "final"

/** An exam's lifecycle stage; only ever moves forward. */
export type ExamStatus = "upcoming" | "ongoing" | "completed" | "published"

/** Human labels for each exam type (the form/list never invent these). */
export const EXAM_TYPE_LABELS: Record<ExamType, string> = {
  first_semester: "First semester",
  second_semester: "Second semester",
  final: "Final",
}

/** Human labels for each lifecycle stage. */
export const EXAM_STATUS_LABELS: Record<ExamStatus, string> = {
  upcoming: "Upcoming",
  ongoing: "Ongoing",
  completed: "Completed",
  published: "Published",
}

/**
 * Status → badge tone (`status-badge.tsx`). The generic `statusTone` map doesn't
 * know these strings, so the list passes the tone explicitly.
 */
export const EXAM_STATUS_TONE: Record<
  ExamStatus,
  "neutral" | "info" | "warning" | "success"
> = {
  upcoming: "info",
  ongoing: "warning",
  completed: "success",
  published: "success",
}

/** Type options in selector order (filters + create form). */
export const EXAM_TYPES: ExamType[] = [
  "first_semester",
  "second_semester",
  "final",
]

/**
 * Lifecycle stages a user can move an exam to via the generic update. Publishing
 * is a dedicated flow (task 4.3) the backend rejects here, so it's excluded.
 */
export const EXAM_EDITABLE_STATUSES: ExamStatus[] = [
  "upcoming",
  "ongoing",
  "completed",
]

/** A class an exam targets — `id` is a `public_id` hash. */
export interface ExamClass {
  id: string
  name: string
}

/**
 * `GET /exams` — one row. An exam targets either an explicit set of classes
 * (`class_ids` / `classes`) or every class in its branch (`all_classes`, in
 * which case the class fields are empty). `session_id` is a `public_id` hash.
 */
export interface Exam {
  id: string
  session_id?: string | null
  type: ExamType
  name: string
  /** True when the exam applies to all classes in its branch. */
  all_classes: boolean
  /** Targeted class hashes (empty for an all-classes exam). For the edit form. */
  class_ids?: string[]
  /** Targeted classes with names (empty for an all-classes exam). For display. */
  classes?: ExamClass[]
  start_date?: string | null
  end_date?: string | null
  status: ExamStatus
}

/** Filter for the exam type, with an `all` pass-through (no filter sent). */
export type ExamTypeFilter = ExamType | "all"
/** Filter for the exam status, with an `all` pass-through. */
export type ExamStatusFilter = ExamStatus | "all"

/** Params the list screen folds into the query (and key). */
export interface ExamListParams {
  session_id?: string | null
  class_id?: string | null
  type?: ExamTypeFilter
  status?: ExamStatusFilter
  page?: number
  per_page?: number
}

/**
 * `POST /exams` body. An exam targets a set of classes (`class_ids`) or all
 * classes in a branch (`all_classes`). Branch is derived server-side from the
 * targeted classes (or, for an all-classes exam, the active branch).
 */
export interface ExamInput {
  session_id: string
  type: ExamType
  name: string
  all_classes: boolean
  /** Required (non-empty) unless `all_classes` is true. */
  class_ids?: string[]
  start_date?: string | null
  end_date?: string | null
}

/** `PUT /exams/{id}` body — only name/dates/status are editable. */
export interface ExamUpdateInput {
  name?: string
  start_date?: string | null
  end_date?: string | null
  status?: ExamStatus
}

/** Is this exam frozen (published exams cannot be modified — API returns 409). */
export function isExamPublished(exam: Exam): boolean {
  return exam.status === "published"
}
