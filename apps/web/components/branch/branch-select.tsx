"use client"

/**
 * `BranchSelect` — branch dropdown backed by `useBranches`, used where a record
 * must be explicitly scoped to a branch (e.g. creating a teacher as super admin).
 * Built on the shared `AcademicSelect` so it inherits the loading / empty /
 * error / loaded states. Controlled: the parent owns `value` (a branch id or
 * `null`). Only super admins need this — non-super-admin records are scoped by
 * the API automatically.
 */

import {
  AcademicSelect,
  type AcademicSelectProps,
} from "@/components/academic/academic-select"
import { useBranches } from "@/hooks/branches/use-branches"

type BranchSelectProps = Pick<
  AcademicSelectProps<string>,
  | "value"
  | "onValueChange"
  | "disabled"
  | "id"
  | "className"
  | "aria-label"
  | "clearLabel"
> & {
  placeholder?: string
}

export function BranchSelect({
  placeholder = "Select branch",
  ...props
}: BranchSelectProps) {
  const { data, isLoading, isError } = useBranches()

  const options = (data ?? []).map((branch) => ({
    value: branch.id,
    label: branch.name || `Branch #${branch.id}`,
  }))

  return (
    <AcademicSelect
      {...props}
      options={options}
      isLoading={isLoading}
      isError={isError}
      placeholder={placeholder}
      emptyPlaceholder="No branches"
    />
  )
}
