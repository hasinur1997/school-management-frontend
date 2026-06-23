"use client"

/**
 * Status filter for the students list (task 2.7) — All / Active / Inactive / TC.
 * Controlled string select on the shared `Select` primitive; the parent owns the
 * value and the list folds it into the query params (`all` is sent as no
 * filter — see `useStudents`). TC is selectable so transfer-certificate students
 * can be reviewed; they're never special-cased out client-side.
 */

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import type { StudentStatusFilter } from "@/types/student"

const OPTIONS: { value: StudentStatusFilter; label: string }[] = [
  { value: "all", label: "All statuses" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
  { value: "tc", label: "TC (transferred)" },
]

export interface StudentStatusFilterProps {
  value: StudentStatusFilter
  onValueChange: (value: StudentStatusFilter) => void
  id?: string
}

export function StudentStatusFilter({
  value,
  onValueChange,
  id,
}: StudentStatusFilterProps) {
  return (
    <Select
      value={value}
      onValueChange={(next) => onValueChange((next as StudentStatusFilter) ?? "all")}
    >
      <SelectTrigger id={id} aria-label="Filter by status" className="w-full">
        <SelectValue>
          {(selected: StudentStatusFilter) =>
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
