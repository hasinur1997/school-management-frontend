"use client"

/**
 * `SectionSelect` — section dropdown backed by `useSections(classId)` (task 2.1).
 * Depends on a chosen class: until `classId` is set it renders disabled with a
 * "choose a class first" hint and fetches nothing (the hook is disabled).
 */

import { useSections } from "@/hooks/academic"
import {
  AcademicSelect,
  type AcademicSelectProps,
  type SelectId,
} from "./academic-select"

type SectionSelectProps = Pick<
  AcademicSelectProps<string>,
  "value" | "onValueChange" | "disabled" | "id" | "className" | "aria-label"
> & {
  /** The selected class; sections are scoped to it. */
  classId: SelectId | null | undefined
  placeholder?: string
}

export function SectionSelect({
  classId,
  placeholder = "Select section",
  disabled,
  ...props
}: SectionSelectProps) {
  const { data, isLoading, isError } = useSections(classId)

  const options = (data ?? []).map((section) => ({
    value: section.id,
    label: section.name || `Section #${section.id}`,
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
      emptyPlaceholder="No sections"
    />
  )
}
