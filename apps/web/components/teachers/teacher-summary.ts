/**
 * Small display helpers shared by the teachers list and detail (task 2.4):
 * derive the subjects and assigned-class name lists from whichever shape the API
 * returned — explicit `subjects`/`classes` arrays, or the `assignments` list.
 * Read defensively so a partial payload never crashes a row.
 */

import { namedList, type Teacher } from "@/types/teacher"

/** Unique, ordered class names a teacher is assigned to. */
export function teacherClassNames(teacher: Teacher): string[] {
  const explicit = namedList(teacher.classes)
  if (explicit.length > 0) return unique(explicit)
  const fromAssignments = (teacher.assignments ?? [])
    .map((a) => a.class_name)
    .filter((n): n is string => !!n)
  return unique(fromAssignments)
}

/** Unique, ordered subject names a teacher teaches. */
export function teacherSubjectNames(teacher: Teacher): string[] {
  const explicit = namedList(teacher.subjects)
  if (explicit.length > 0) return unique(explicit)
  const fromAssignments = (teacher.assignments ?? [])
    .map((a) => a.subject_name)
    .filter((n): n is string => !!n)
  return unique(fromAssignments)
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values))
}
