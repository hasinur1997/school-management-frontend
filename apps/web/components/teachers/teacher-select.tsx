"use client"

/**
 * `TeacherSelect` — teacher dropdown backed by `useTeacherOptions` (task 2.3),
 * used by the teacher-assignment filters and form. Built on the shared
 * `AcademicSelect` so it inherits the loading / empty / error / loaded states.
 * Controlled: the parent owns `value` (a teacher id or `null`).
 *
 * The full teachers module is task 2.4; this is the minimal selector the
 * assignment screen needs.
 */

import {
  AcademicSelect,
  type AcademicSelectProps,
} from "@/components/academic/academic-select"
import { useTeacherOptions } from "@/hooks/teachers/use-teacher-options"

type TeacherSelectProps = Pick<
  AcademicSelectProps,
  "value" | "onValueChange" | "disabled" | "id" | "className" | "aria-label"
> & {
  placeholder?: string
}

export function TeacherSelect({
  placeholder = "Select teacher",
  ...props
}: TeacherSelectProps) {
  const { data, isLoading, isError } = useTeacherOptions()

  const options = (data ?? []).map((teacher) => ({
    value: teacher.id,
    label: teacher.full_name || teacher.name || `Teacher #${teacher.id}`,
  }))

  return (
    <AcademicSelect
      {...props}
      options={options}
      isLoading={isLoading}
      isError={isError}
      placeholder={placeholder}
      emptyPlaceholder="No teachers"
    />
  )
}
