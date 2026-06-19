/**
 * Minimal teacher type used as the dropdown source for teacher assignments
 * (task 2.3). The full teachers module — list, detail, create/edit, status,
 * photo — is owned by task 2.4; this only models the fields a selector needs.
 *
 * The contract `docs/api/teachers.md` is absent from the repo (see the progress
 * tracker), so the field names follow the documented conventions and are read
 * defensively. `full_name`/`name` cover either label shape.
 */
export interface TeacherOption {
  id: number
  name?: string | null
  full_name?: string | null
  employee_id?: string | null
}
