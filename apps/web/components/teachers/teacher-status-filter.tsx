"use client"

/**
 * Status filter for the teachers list (task 2.4) — All / Active / Inactive.
 * Controlled string select built on the shared `Select` primitive; the parent
 * owns the value and the list folds it into the query params (`all` is sent as
 * no filter — see `useTeachers`).
 */

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import type { TeacherStatusFilter } from "@/types/teacher"

const OPTIONS: { value: TeacherStatusFilter; label: string }[] = [
  { value: "all", label: "All statuses" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
]

export interface TeacherStatusFilterProps {
  value: TeacherStatusFilter
  onValueChange: (value: TeacherStatusFilter) => void
  id?: string
}

export function TeacherStatusFilter({
  value,
  onValueChange,
  id,
}: TeacherStatusFilterProps) {
  return (
    <Select
      value={value}
      onValueChange={(next) => onValueChange((next as TeacherStatusFilter) ?? "all")}
    >
      <SelectTrigger id={id} aria-label="Filter by status" className="w-full">
        <SelectValue>
          {(selected: TeacherStatusFilter) =>
            OPTIONS.find((o) => o.value === selected)?.label ?? "All statuses"
          }
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {OPTIONS.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
