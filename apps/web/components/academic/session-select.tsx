"use client"

/**
 * `SessionSelect` — academic-session dropdown backed by `useSessions` and cached
 * via TanStack Query (task 2.1). Controlled; surfaces loading/empty/error states
 * through the shared `AcademicSelect`.
 */

import { useSessions } from "@/hooks/academic"
import {
  AcademicSelect,
  type AcademicSelectProps,
} from "./academic-select"

type SessionSelectProps = Pick<
  AcademicSelectProps,
  "value" | "onValueChange" | "disabled" | "id" | "className" | "aria-label"
> & {
  placeholder?: string
}

export function SessionSelect({
  placeholder = "Select session",
  ...props
}: SessionSelectProps) {
  const { data, isLoading, isError } = useSessions()

  const options = (data ?? []).map((session) => ({
    value: session.id,
    label: session.name || `Session #${session.id}`,
  }))

  return (
    <AcademicSelect
      {...props}
      options={options}
      isLoading={isLoading}
      isError={isError}
      placeholder={placeholder}
      emptyPlaceholder="No sessions"
    />
  )
}
