"use client"

/**
 * `SubjectSelect` — subject dropdown backed by `useSubjects(classId)` (task 2.1).
 * Like `SectionSelect`, it depends on a chosen class: disabled with a hint until
 * `classId` is set, and fetches nothing until then.
 */

import { useSubjects } from "@/hooks/academic"
import {
  AcademicSelect,
  type AcademicSelectProps,
  type SelectId,
} from "./academic-select"

type SubjectSelectProps = Pick<
  AcademicSelectProps<string>,
  "value" | "onValueChange" | "disabled" | "id" | "className" | "aria-label"
> & {
  /** The selected class; subjects are scoped to it. */
  classId: SelectId | null | undefined
  placeholder?: string
}

export function SubjectSelect({
  classId,
  placeholder = "Select subject",
  disabled,
  ...props
}: SubjectSelectProps) {
  const { data, isLoading, isError } = useSubjects(classId)

  const options = (data ?? []).map((subject) => ({
    value: subject.id,
    label: subject.name || `Subject #${subject.id}`,
  }))

  return (
    <AcademicSelect
      {...props}
      options={options}
      isLoading={isLoading}
      isError={isError}
      disabled={disabled || classId == null}
      placeholder={placeholder}
      disabledPlaceholder="Select a class first"
      emptyPlaceholder="No subjects"
    />
  )
}
