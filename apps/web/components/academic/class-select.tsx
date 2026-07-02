"use client"

/**
 * `ClassSelect` — class dropdown backed by `useClasses` and cached via TanStack
 * Query (task 2.1). Controlled; the chosen class is what `SectionSelect` and
 * `SubjectSelect` depend on.
 */

import { useClasses } from "@/hooks/academic"
import {
  AcademicSelect,
  type AcademicSelectProps,
} from "./academic-select"

type ClassSelectProps = Pick<
  AcademicSelectProps<string>,
  "value" | "onValueChange" | "disabled" | "id" | "className" | "aria-label"
> & {
  placeholder?: string
  /** Screen-local branch filter (super admin); overrides the active branch. */
  branchId?: string | null
}

export function ClassSelect({
  placeholder = "Select class",
  branchId,
  ...props
}: ClassSelectProps) {
  const { data, isLoading, isError } = useClasses(branchId)

  const options = (data ?? []).map((schoolClass) => ({
    value: schoolClass.id,
    label: schoolClass.name || `Class #${schoolClass.id}`,
  }))

  return (
    <AcademicSelect
      {...props}
      options={options}
      isLoading={isLoading}
      isError={isError}
      placeholder={placeholder}
      emptyPlaceholder="No classes"
    />
  )
}
